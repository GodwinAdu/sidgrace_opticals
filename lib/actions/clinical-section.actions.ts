"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Attendance from "../models/attendance.models";
import { User, withAuth } from "../helpers/auth";
import {
    isMeaningfulChange,
    makeVersion,
    latestVersionContent,
} from "../clinical/attribution";
import { writeVisitAuditEntry } from "../helpers/clinical-audit";
import { AuthError, hasPermission, currentRoleCached, type Permission } from "../helpers/authz";

/**
 * Attributed, append-only save for a single tracked clinical field on a visit.
 *
 * This is the write path behind the versioned clinical sections (free-text notes
 * and structured sections). Every save:
 *   - takes the author ONLY from the `withAuth`-injected `user` (never from the
 *     client-supplied `content`) and stamps the server clock (R1.1, R1.2, R1.4),
 *   - appends an immutable `AttributedVersion`; prior versions are never
 *     overwritten or removed (R2.1, R2.2, R7.1),
 *   - skips redundant saves whose content equals the latest version (R2.4),
 *   - keeps the existing scalar field as the materialised "latest" value so
 *     legacy reads keep working (R2.3, back-compat),
 *   - writes a best-effort `History` audit entry after the clinical write
 *     succeeds (R7.3).
 */

/**
 * Allow-list of tracked clinical fields â†’ the parallel `*Versions` array on the
 * `Attendance` document. Any field not present here is rejected: `content`
 * cannot be routed to an arbitrary document path, and only clinical sections are
 * versioned/attributed. Keys are the materialised scalar field names (R2.3); the
 * values are the append-only version arrays (R2.1).
 */
const TRACKED_FIELDS = {
    doctorNote: "doctorNoteVersions",
    nurseNote: "nurseNoteVersions",
    surgicalNote: "surgicalNoteVersions",
    history: "historyVersions",
    physicExam: "physicExamVersions",
    diagnosis: "diagnosisVersions",
    plan: "planVersions",
    eyeTest: "eyeTestVersions",
    vitals: "vitalsVersions",
    labReport: "labReportVersions",
    scan: "scanVersions",
} as const;

/**
 * Per-field permission map. Each tracked clinical field requires the SAME role
 * flag the UI/registry gates its tab with, so the server enforces the exact same
 * rule the tab visibility implies (defense-in-depth: a server action is a public
 * endpoint, so UI gating alone is not a control). Admin bypasses via
 * `hasPermission`. Mirrors `registry.ts`:
 *   attClinical → history/physicExam/diagnosis/doctorNote/nurseNote/vitals/surgicalNote
 *   attEyeTest  → eyeTest
 *   attLabScan  → labReport/scan
 *   attTreatment→ plan
 */
const FIELD_PERMISSION: Record<keyof typeof TRACKED_FIELDS, Permission> = {
    doctorNote: "attClinical",
    nurseNote: "attClinical",
    surgicalNote: "attClinical",
    history: "attClinical",
    physicExam: "attClinical",
    diagnosis: "attClinical",
    vitals: "attClinical",
    eyeTest: "attEyeTest",
    labReport: "attLabScan",
    scan: "attLabScan",
    plan: "attTreatment",
};

/** A field name accepted by {@link saveClinicalSection}. */
export type TrackedClinicalField = keyof typeof TRACKED_FIELDS;

/**
 * Core implementation. Wrapped by `withAuth` (see the exported binding below),
 * which injects the authenticated `user` and rejects unauthenticated callers
 * before this runs â€” so no partial clinical content is ever persisted (R1.3).
 *
 * @param user authenticated staff injected by `withAuth` (never client-supplied).
 * @param attendanceId id of the visit (`Attendance`) being documented.
 * @param field the tracked clinical field to save; must be in the allow-list.
 * @param content the new field value (string or structured object).
 * @param path optional route to revalidate after the write.
 */
async function _saveClinicalSection(
    user: User,
    attendanceId: string,
    field: TrackedClinicalField,
    content: unknown,
    path?: string,
) {
    try {
        // Defensive auth guard, consistent with the file's siblings. `withAuth`
        // already enforces this, but we keep the explicit check (R1.3).
        if (!user) throw new Error("User not authenticated");

        // Only allow-listed clinical fields may be written through this path.
        const versionsField = TRACKED_FIELDS[field as TrackedClinicalField];
        if (!versionsField) throw new Error(`Field "${field}" is not a tracked clinical field`);

        // Per-field authorization (defense-in-depth). The UI/registry already
        // hides tabs a role may not use, but this action is a public endpoint —
        // so we enforce the SAME flag the tab is gated with here. Admin bypasses.
        const required = FIELD_PERMISSION[field as TrackedClinicalField];
        const role = await currentRoleCached();
        if (!hasPermission(role, required)) {
            throw new AuthError(
                "FORBIDDEN",
                `You do not have permission to record the "${field}" section.`,
            );
        }

        await connectToDB();

        const visit = await Attendance.findById(attendanceId);
        if (!visit) throw new Error("Visit not found");

        // Ensure the append-only array exists (additive for legacy visits).
        if (!Array.isArray(visit[versionsField])) {
            visit[versionsField] = [] as never;
        }

        // No-op guard: a save identical to the current latest version must not
        // create a redundant version (R2.4). Return the current state unchanged.
        const latest = latestVersionContent(visit[versionsField]);
        if (!isMeaningfulChange(latest, content)) {
            return JSON.parse(
                JSON.stringify({
                    field,
                    value: visit[field],
                    versions: visit[versionsField],
                }),
            );
        }

        // Append-only: push a fresh attributed version; never replace the array
        // (R2.1, R2.2). Author/time come from the injected user + server clock
        // via makeVersion â€” content is never trusted for the author (R1.2, R1.4).
        visit[versionsField].push(makeVersion(content, user, new Date()) as never);
        visit.markModified(versionsField);

        // Materialise the scalar as the latest value for back-compatible reads
        // (R2.3).
        visit[field] = content as never;

        await visit.save();

        // Best-effort audit entry; never rolls back the clinical write (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user?._id ?? user?.id ?? ""),
            details: { field, versionIndex: visit[versionsField].length - 1 },
            message: `Clinical section "${field}" recorded`,
        });

        if (path) revalidatePath(path);

        return JSON.parse(
            JSON.stringify({
                field,
                value: content,
                versions: visit[versionsField],
            }),
        );
    } catch (error) {
        console.error("Error saving clinical section:", error);
        throw error;
    }
}

/**
 * Attributed, append-only save for a tracked clinical field. `withAuth` injects
 * the authenticated author and rejects unauthenticated callers; the body then
 * enforces the per-field role permission (see `FIELD_PERMISSION`) so the server
 * applies the same gate the tab UI implies — UI gating alone is not a control.
 */
export const saveClinicalSection = await withAuth(_saveClinicalSection);

