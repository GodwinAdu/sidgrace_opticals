import { connectToDB } from "../mongoose";
import History from "../models/history.models";

/**
 * Parameters for {@link writeVisitAuditEntry}.
 *
 * `actionType` defaults to `"CLINICAL_SECTION_RECORDED"`. `attendanceId` is the
 * id of the visit (`Attendance`) the audit entry is attributed to.
 */
export interface WriteVisitAuditEntryParams {
    /** Audit action type; defaults to `"CLINICAL_SECTION_RECORDED"`. */
    actionType?: string;
    /** Id of the `Attendance` (visit) the write belongs to. */
    attendanceId: string;
    /** Id of the staff member who performed the write (from the authed user). */
    performedBy: string;
    /** Structured, free-form detail payload. Defaults to `{}`. */
    details?: Record<string, unknown>;
    /** Optional human-readable message. */
    message?: string;
}

/**
 * Write a single visit audit entry into the `History` collection.
 *
 * BEST-EFFORT by design (R7.3): the clinical write is the source of truth, so an
 * audit-write failure must never roll it back. Any error is logged via the shared
 * `logError` helper (dynamically imported, mirroring `auth.ts`) and swallowed — this
 * function never throws.
 *
 * Author (`performedBy`) and `timestamp` are supplied/stamped server-side; callers
 * must pass the id of the authenticated user, never a client-supplied author.
 */
export async function writeVisitAuditEntry(
    params: WriteVisitAuditEntryParams,
): Promise<void> {
    const {
        actionType = "CLINICAL_SECTION_RECORDED",
        attendanceId,
        performedBy,
        details = {},
        message,
    } = params;

    try {
        await connectToDB();
        await History.create({
            actionType,
            entityType: "Attendance",
            entityId: attendanceId,
            performedBy,
            timestamp: new Date(), // server time; never client-supplied
            details,
            message,
        });
    } catch (error) {
        // Audit write is non-critical: record best-effort, then swallow so the
        // caller's clinical write is never rolled back.
        try {
            const { logError } = await import("./error-log");
            await logError(error, "clinical-audit");
        } catch {
            console.error("Visit audit write error:", error);
        }
    }
}
