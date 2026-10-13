import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

/**
 * Server-level integration tests for the clinical attribution & audit trail,
 * exercising the REAL server actions against an in-memory MongoDB.
 *
 * Auth strategy (test-only, no production change): we mock `lib/helpers/auth`
 * so `withAuth(handler, permission?)` injects a controllable session user and
 * enforces the permission against a controllable role using the REAL
 * `hasPermission` predicate. Everything else — the action bodies, the Mongoose
 * writes, the append-only versioning, the History audit writes, the status
 * logic — runs for real against the in-memory DB. This is what lets us assert
 * Properties 1, 3, 4 (author-from-session, append-only, no-op), 7, 8 (audit
 * gating + per-write audit entry), and 9 (status-on-save preserved).
 */

// Controllable identity + role for the mocked auth layer.
const testCtx: { user: Record<string, unknown> | null; role: Record<string, unknown> | null } = {
    user: null,
    role: null,
};

vi.mock("../../lib/helpers/auth", async () => {
    const { AuthError } = await import("../../lib/helpers/authz");
    return {
        AuthError,
        // Re-implement withAuth faithfully: reject when no user, enforce the
        // permission against the current test role via the real predicate, then
        // call the handler with the injected user.
        withAuth: <T, A extends unknown[]>(
            handler: (user: unknown, ...args: A) => Promise<T>,
            permission?: unknown,
        ) => {
            return async (...args: A): Promise<T> => {
                if (!testCtx.user) throw new AuthError("UNAUTHENTICATED", "Authentication required");
                if (permission) {
                    const { hasPermission } = await import("../../lib/helpers/authz");
                    if (!hasPermission(testCtx.role as never, permission as never)) {
                        throw new AuthError("FORBIDDEN", "You do not have permission to perform this action");
                    }
                }
                return handler(testCtx.user, ...args);
            };
        },
    };
});

// Import AFTER the mock + after setup.ts has set MONGODB_URL.
const { saveClinicalSection } = await import("../../lib/actions/clinical-section.actions");
const { updateAttendance } = await import("../../lib/actions/attendance.actions");
const { getVisitAuditLog } = await import("../../lib/actions/visit-audit.actions");
const AttendanceModule = await import("../../lib/models/attendance.models");
const HistoryModule = await import("../../lib/models/history.models");
const Attendance = AttendanceModule.default;
const History = HistoryModule.default;

const DOCTOR = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "Jane Doe",
    role: "doctor",
    specialization: "Ophthalmologist",
};
const NURSE = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "John Smith",
    role: "nurse",
};

/** Create a minimal valid visit and return its id. */
async function makeVisit(status = "ongoing"): Promise<string> {
    const visit = await Attendance.create({
        patientId: new mongoose.Types.ObjectId(),
        date: new Date(),
        status,
        visitType: "outpatient",
    });
    return String(visit._id);
}

beforeEach(() => {
    testCtx.user = DOCTOR;
    testCtx.role = { name: "doctor", attClinical: true, auditView: false };
});

describe("saveClinicalSection (integration)", () => {
    it("Property 1: first save stamps authoredBy = session user + server time", async () => {
        const id = await makeVisit();
        await saveClinicalSection(id, "doctorNote", "initial note");

        const visit = await Attendance.findById(id).lean();
        const versions = (visit as Record<string, unknown>).doctorNoteVersions as Record<string, unknown>[];
        expect(versions).toHaveLength(1);
        expect(String(versions[0].authoredBy)).toBe(DOCTOR._id);
        expect(versions[0].authoredByName).toBe("Jane Doe");
        expect(versions[0].authoredByRole).toBe("Ophthalmologist");
        expect(versions[0].createdAt).toBeTruthy();
        // Materialised scalar equals the latest version content.
        expect((visit as Record<string, unknown>).doctorNote).toBe("initial note");
    });

    it("Property 1: author comes from the session, never the client payload", async () => {
        const id = await makeVisit();
        // Even if the content is an object carrying a forged author, the stored
        // authoredBy must be the session user.
        await saveClinicalSection(id, "diagnosis", { primary: "Myopia", authoredBy: "attacker" });
        const visit = await Attendance.findById(id).lean();
        const versions = (visit as Record<string, unknown>).diagnosisVersions as Record<string, unknown>[];
        expect(String(versions[0].authoredBy)).toBe(DOCTOR._id);
        expect(String(versions[0].authoredBy)).not.toBe("attacker");
    });

    it("Property 3: a changed save appends a version and leaves the prior one byte-identical", async () => {
        const id = await makeVisit();
        await saveClinicalSection(id, "doctorNote", "v1");
        const after1 = await Attendance.findById(id).lean();
        const v1 = JSON.parse(JSON.stringify(((after1 as Record<string, unknown>).doctorNoteVersions as unknown[])[0]));

        // A different author makes the second (changed) save.
        testCtx.user = NURSE;
        testCtx.role = { name: "nurse", attClinical: true };
        await saveClinicalSection(id, "doctorNote", "v2");

        const after2 = await Attendance.findById(id).lean();
        const versions = (after2 as Record<string, unknown>).doctorNoteVersions as unknown[];
        expect(versions).toHaveLength(2);
        // Prior version unchanged (append-only; R2.2 / R7.1).
        expect(JSON.parse(JSON.stringify(versions[0]))).toEqual(v1);
        // Each author kept their own version.
        expect(String((versions[1] as Record<string, unknown>).authoredBy)).toBe(NURSE._id);
    });

    it("Property 4: a no-op save (identical content) does not grow the versions array", async () => {
        const id = await makeVisit();
        await saveClinicalSection(id, "doctorNote", "same");
        await saveClinicalSection(id, "doctorNote", "  same  "); // trimmed-equal → no-op
        const visit = await Attendance.findById(id).lean();
        expect((visit as Record<string, unknown>).doctorNoteVersions as unknown[]).toHaveLength(1);
    });
});

describe("record Save routing via updateAttendance (integration)", () => {
    it("Property 9: a plain Save (no status) never completes a visit", async () => {
        const id = await makeVisit("ongoing");
        await updateAttendance(id, { doctorNote: "routed note" });
        const visit = await Attendance.findById(id).lean();
        expect((visit as Record<string, unknown>).status).toBe("ongoing");
        expect((visit as Record<string, unknown>).status).not.toBe("completed");
    });

    it("Property 3: routing a tracked field appends a version without overwriting prior ones", async () => {
        const id = await makeVisit();
        await saveClinicalSection(id, "doctorNote", "first");
        await updateAttendance(id, { doctorNote: "second via record save" });
        const visit = await Attendance.findById(id).lean();
        const versions = (visit as Record<string, unknown>).doctorNoteVersions as unknown[];
        expect(versions.length).toBe(2);
        expect((visit as Record<string, unknown>).doctorNote).toBe("second via record save");
    });
});

describe("getVisitAuditLog (integration)", () => {
    it("Property 8: each attributed write produces one Attendance-scoped History entry, newest first", async () => {
        const id = await makeVisit();
        await saveClinicalSection(id, "doctorNote", "a");
        await saveClinicalSection(id, "diagnosis", { primary: "b" });

        // Raw History check (R7.3 / Property 8).
        const entries = await History.find({ entityType: "Attendance", entityId: id }).lean();
        expect(entries.length).toBe(2);

        // Audit log read requires auditView.
        testCtx.role = { name: "auditor", auditView: true };
        const log = await getVisitAuditLog(id);
        expect(log.total).toBe(2);
        expect(log.rows).toHaveLength(2);
        // Reverse-chronological: newest first.
        const t0 = new Date(log.rows[0].timestamp as string).getTime();
        const t1 = new Date(log.rows[1].timestamp as string).getTime();
        expect(t0).toBeGreaterThanOrEqual(t1);
    });

    it("Property 7: getVisitAuditLog denies without auditView and succeeds with it (and for admin)", async () => {
        const id = await makeVisit();
        await saveClinicalSection(id, "doctorNote", "x");

        // Without the flag → FORBIDDEN (fail-closed, R5.2 / R5.4).
        testCtx.role = { name: "nurse", auditView: false };
        await expect(getVisitAuditLog(id)).rejects.toThrow();

        // With the flag → allowed.
        testCtx.role = { name: "auditor", auditView: true };
        await expect(getVisitAuditLog(id)).resolves.toBeTruthy();

        // Admin bypass → allowed even without the explicit flag.
        testCtx.role = { name: "admin" };
        await expect(getVisitAuditLog(id)).resolves.toBeTruthy();
    });
});
