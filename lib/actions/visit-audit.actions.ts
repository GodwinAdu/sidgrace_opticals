 "use server"

import { connectToDB } from "../mongoose";
import Attendance from "../models/attendance.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import {
    resolveAuthorLabel,
    type AuthorLabel,
} from "../clinical/attribution";

/**
 * Read-only server actions behind the attribution / audit UI.
 *
 * Two reads live here:
 *   - `getFieldVersions` â€” the prior-versions popover for a single tracked
 *     clinical field (R3.4). Auth-only: any clinician with access to the visit
 *     may inspect a field's version history inline; the gating that matters here
 *     is author injection, not a dedicated permission.
 *   - `getVisitAuditLog` â€” the restricted, per-visit audit trail (R4, R5). It is
 *     wrapped with `withAuth(..., "auditView")`, so the server enforces the
 *     audit-view permission regardless of UI state (R5.2) and FAILS CLOSED when
 *     the flag is absent/unconfigured (R5.4): `hasPermission` returns `false` for
 *     a missing flag, so `withAuth` throws FORBIDDEN before this handler runs.
 *     Admin bypasses automatically via `withAuth`.
 *
 * Both actions are read-only: they expose no edit/delete capability over
 * versions or audit entries (R4.3, R7.1). This file OWNS these reads and does not
 * touch the write paths (`clinical-section.actions.ts`, `nursing.actions.ts`) or
 * any model.
 */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ getFieldVersions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/**
 * Allow-list of tracked clinical fields â†’ their parallel `*Versions` array on
 * the `Attendance` document (mirrors the write-side allow-list in
 * `clinical-section.actions.ts`). A field not in this map is rejected so the
 * popover can only read known version arrays, never an arbitrary document path.
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

/** A field name accepted by {@link getFieldVersions}. */
export type TrackedClinicalField = keyof typeof TRACKED_FIELDS;

/**
 * Core implementation of {@link getFieldVersions}. Wrapped by `withAuth`
 * (auth-only) so an unauthenticated caller is rejected before this runs.
 *
 * Loads only the requested `${field}Versions` array and returns it serialized.
 * Each element carries its denormalised author snapshot (`authoredByName` /
 * `authoredByRole`) so the popover (Task 9) can render attribution read-only
 * without a join (R3.4). The raw snapshot fields are returned as-is; the UI is
 * responsible for formatting via the pure `attribution` helpers.
 *
 * @param user authenticated staff injected by `withAuth` (never client-supplied).
 * @param attendanceId id of the visit (`Attendance`).
 * @param field the tracked clinical field whose versions to read.
 */
async function _getFieldVersions(
    user: User,
    attendanceId: string,
    field: TrackedClinicalField,
) {
    try {
        if (!user) throw new Error("User not authenticated");

        const versionsField = TRACKED_FIELDS[field as TrackedClinicalField];
        if (!versionsField) throw new Error(`Field "${field}" is not a tracked clinical field`);

        await connectToDB();

        // Load only the needed version array; the visit document can be large.
        const visit = await Attendance.findById(attendanceId)
            .select(versionsField)
            .lean();
        if (!visit) throw new Error("Visit not found");

        const versions = (visit as Record<string, unknown>)[versionsField];
        return JSON.parse(JSON.stringify(Array.isArray(versions) ? versions : []));
    } catch (error) {
        console.error("Error loading field versions:", error);
        throw error;
    }
}

/**
 * Read the append-only version history of a single tracked clinical field for
 * the version-history popover (R3.4). Auth-only â€” available to any clinician with
 * access to the visit; author viewing is not gated by `auditView`.
 */
export const getFieldVersions = await withAuth(_getFieldVersions);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ getVisitAuditLog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Default audit-log page size; keeps the read responsive on large visits (R4.4). */
const DEFAULT_PAGE_SIZE = 50;
/** Upper bound so a client cannot request an unbounded page. */
const MAX_PAGE_SIZE = 200;

/** Pagination options for {@link getVisitAuditLog}. */
export interface VisitAuditLogOptions {
    /** 1-based page number; values below 1 are clamped to 1. */
    page?: number;
    /** Rows per page; clamped to [1, {@link MAX_PAGE_SIZE}]. */
    pageSize?: number;
}

/** A single read-only audit row surfaced to the audit log view (R4.2, R4.3). */
export interface VisitAuditRow {
    /** The `History` document id. */
    id: string;
    /** Resolved actor display name, or "author unknown" when unresolvable (R4.2). */
    actorName: string;
    /** Resolved actor role/title, omitted (empty) when unresolvable. */
    actorRole: string;
    /** The audit action type (e.g. "CLINICAL_SECTION_RECORDED"). */
    actionType: string;
    /** The clinical field affected, read from `details.field` when present. */
    field: string;
    /** Server timestamp of the write (ISO string, reverse-chronological). */
    timestamp: string | null;
    /** Optional human-readable summary message. */
    message: string;
}

/** The paginated, read-only result of {@link getVisitAuditLog}. */
export interface VisitAuditLogResult {
    rows: VisitAuditRow[];
    page: number;
    pageSize: number;
    total: number;
}

/** A populated `performedBy` actor as returned by Mongoose populate. */
interface PopulatedActor {
    fullName?: string | null;
    role?: string | null;
    specialization?: string | null;
}

/** Clamp a page number to a 1-based integer. */
function normalizePage(page: number | undefined): number {
    const n = Math.floor(Number(page));
    return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Clamp a page size into the sane [1, MAX] range, defaulting when absent. */
function normalizePageSize(pageSize: number | undefined): number {
    const n = Math.floor(Number(pageSize));
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
    return Math.min(n, MAX_PAGE_SIZE);
}

/**
 * Resolve a populated actor into a displayable {@link AuthorLabel}, degrading to
 * "author unknown" and omitting an unknown role (R4.2). Reuses the pure
 * `resolveAuthorLabel` by mapping the Staff fields onto the snapshot shape it
 * reads (prefer `specialization` over `role` for the title), so display is
 * consistent with the inline attribution and never surfaces a raw id or throws.
 */
function labelForActor(actor: PopulatedActor | null | undefined): AuthorLabel {
    const role = (actor?.specialization || actor?.role || "").toString();
    return resolveAuthorLabel({
        authoredByName: actor?.fullName ?? "",
        authoredByRole: role,
    });
}

/**
 * Core implementation of {@link getVisitAuditLog}. See the exported binding:
 * it is wrapped with `withAuth(..., "auditView")`, so the audit-view permission
 * is enforced server-side (R5.2) and the call FAILS CLOSED when the flag is
 * unconfigured/absent (R5.4) â€” there is deliberately no client-trust bypass.
 *
 * Queries `History` for the visit, newest first, and returns a paginated page of
 * read-only rows. The actor is resolved by populating the `Staff` ref, with an
 * "author unknown" fallback when it cannot be resolved. No edit/delete surface is
 * exposed (R4.3, R7.1).
 *
 * @param user authenticated, `auditView`-authorised user injected by `withAuth`.
 * @param attendanceId id of the visit (`Attendance`) whose trail to read.
 * @param options optional pagination.
 */
async function _getVisitAuditLog(
    user: User,
    attendanceId: string,
    options?: VisitAuditLogOptions,
): Promise<VisitAuditLogResult> {
    try {
        if (!user) throw new Error("User not authenticated");

        const page = normalizePage(options?.page);
        const pageSize = normalizePageSize(options?.pageSize);
        const skip = (page - 1) * pageSize;

        await connectToDB();

        const query = { entityType: "Attendance", entityId: attendanceId };

        const [docs, total] = await Promise.all([
            History.find(query)
                .populate("performedBy", "fullName role specialization")
                .sort({ timestamp: -1 }) // reverse-chronological (R4.1)
                .skip(skip)
                .limit(pageSize)
                .lean(),
            History.countDocuments(query),
        ]);

        const rows: VisitAuditRow[] = (docs as Record<string, unknown>[]).map((doc) => {
            const actor = doc.performedBy as PopulatedActor | null | undefined;
            const label = labelForActor(actor);
            const details = (doc.details ?? {}) as Record<string, unknown>;
            const timestamp = (doc.timestamp ?? doc.createdAt) as Date | string | null | undefined;

            return {
                id: String(doc._id ?? ""),
                actorName: label.name,
                actorRole: "role" in label && label.role ? label.role : "",
                actionType: typeof doc.actionType === "string" ? doc.actionType : "",
                field: typeof details.field === "string" ? details.field : "",
                timestamp: timestamp ? new Date(timestamp as string | Date).toISOString() : null,
                message: typeof doc.message === "string" ? doc.message : "",
            };
        });

        // Serialize to strip any residual Mongoose/BSON types before crossing the
        // server/client boundary; the result is purely read-only.
        return JSON.parse(JSON.stringify({ rows, page, pageSize, total }));
    } catch (error) {
        console.error("Error loading visit audit log:", error);
        throw error;
    }
}

/**
 * Read the per-visit clinical audit log, reverse-chronological and paginated,
 * for the restricted audit tab (R4, R5).
 *
 * GATING / FAIL-CLOSED: wrapped with `withAuth(_getVisitAuditLog, "auditView")`.
 * The permission is enforced on the server (R5.2); because `hasPermission`
 * treats a missing/unconfigured `auditView` flag as `false`, `withAuth` throws
 * FORBIDDEN before the handler executes â€” the audit log fails closed (R5.4).
 * Admin bypasses automatically. No client-supplied flag can relax this.
 */
export const getVisitAuditLog = await withAuth(_getVisitAuditLog, "auditView");

