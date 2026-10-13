import { describe, it, expect } from "vitest";
import {
    encounterReducer,
    type EncounterState,
    type EncounterAction,
} from "../app/(dashboard)/(routes)/dashboard/attendance/_components/encounter/EncounterProvider";
import type { AttendanceData } from "../app/(dashboard)/(routes)/dashboard/attendance/_components/encounter/types";
import { canEdit, nextMode } from "../lib/clinical/encounter";

/**
 * Reducer-level tests for the historical-mode end-to-end behavior (Task 10).
 *
 * These exercise the EXPORTED `encounterReducer` directly (no React), covering:
 *   - Property 5 — Historical mode is read-only: once `LOAD_HISTORICAL` sets
 *     `mode === "historical"`, `canEdit` is false and no dispatch
 *     (PATCH_SECTION / PATCH_BILLING) can mutate the visit; the originally
 *     loaded current visit is never mutated by loading a prior one.
 *   - Property 6 — Return restores exactly: `RETURN_TO_CURRENT` restores the
 *     exact original current-visit snapshot and returns `mode` to "edit".
 *
 * The provider holds the original snapshot in a ref and dispatches it as the
 * `RETURN_TO_CURRENT` payload; these tests model that by passing the captured
 * current attendance as the action payload, matching the provider's wiring.
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal-but-realistic current visit document. */
function makeCurrentAttendance(): AttendanceData {
    return {
        _id: "current-visit-1",
        patientId: { _id: "patient-1", fullName: "Ada Lovelace", patientId: "P-001" },
        eyeTest: { visualAcuity: "6/6", colorVision: "normal", intraocularPressure: "15", remarks: "" },
        vitals: {
            temperature: 36.8,
            pulse: 72,
            bloodPressure: "120/80",
            respiratoryRate: 16,
            weight: 60,
            height: 165,
            bmi: 22,
        },
        history: {
            presentingComplaints: "Blurred vision",
            pastMedicalHistory: "",
            familyHistory: "",
            drugHistory: "",
        },
        physicExam: { general: "", cardiovascular: "", respiratory: "", gastrointestinal: "", nervousSystem: "" },
        diagnosis: { primary: "Myopia", secondary: [] },
        scan: null,
        doctorNote: "Current visit note",
        nurseNote: null,
        drugs: [],
        labReport: null,
        plan: { treatment: "Prescribe lenses", followUp: "2 weeks" },
        surgicalNote: "",
        procedures: [],
        billing: {
            consultationFee: 100,
            proceduresTotal: 0,
            productsTotal: 0,
            otherCharges: [],
            amountPaid: 0,
            totalCharged: 100,
            balance: 100,
        },
        status: "ongoing",
        visitType: "outpatient",
    };
}

/** A distinct prior visit, as returned by `getAttendanceById`. */
function makePreviousAttendance(): AttendanceData {
    return {
        _id: "previous-visit-9",
        patientId: { _id: "patient-1", fullName: "Ada Lovelace", patientId: "P-001" },
        eyeTest: { visualAcuity: "6/9", colorVision: "normal", intraocularPressure: "17", remarks: "old" },
        vitals: {
            temperature: 37.0,
            pulse: 80,
            bloodPressure: "118/76",
            respiratoryRate: 18,
            weight: 59,
            height: 165,
            bmi: 21.7,
        },
        history: {
            presentingComplaints: "Headache",
            pastMedicalHistory: "",
            familyHistory: "",
            drugHistory: "",
        },
        physicExam: { general: "", cardiovascular: "", respiratory: "", gastrointestinal: "", nervousSystem: "" },
        diagnosis: { primary: "Tension headache", secondary: [] },
        scan: null,
        doctorNote: "Older visit note",
        nurseNote: null,
        drugs: [],
        labReport: null,
        plan: { treatment: "Rest", followUp: "" },
        surgicalNote: "",
        procedures: [],
        billing: {
            consultationFee: 80,
            proceduresTotal: 0,
            productsTotal: 0,
            otherCharges: [],
            amountPaid: 80,
            totalCharged: 80,
            balance: 0,
        },
        status: "completed",
        visitType: "outpatient",
    };
}

/** An initial `edit`-mode state wrapping the current visit. */
function makeEditState(attendance: AttendanceData): EncounterState {
    return { attendance, mode: "edit", dirty: false, saving: false };
}

/** Deep-ish snapshot for structural-equality assertions. */
function snapshot<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// Property 5: Historical mode is read-only
// Validates: Requirements 5.2, 5.3
// ---------------------------------------------------------------------------
describe("encounterReducer — Property 5: historical mode is read-only", () => {
    it("LOAD_HISTORICAL enters historical mode (canEdit false)", () => {
        const start = makeEditState(makeCurrentAttendance());
        const loaded = encounterReducer(start, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });

        expect(loaded.mode).toBe("historical");
        expect(canEdit(loaded.mode)).toBe(false);
        // The loaded prior visit is what the workspace now shows.
        expect(loaded.attendance._id).toBe("previous-visit-9");
        // Entering historical never leaves stale dirty edits around.
        expect(loaded.dirty).toBe(false);
    });

    it("PATCH_SECTION is a no-op in historical mode (returns the same state)", () => {
        const historical: EncounterState = {
            attendance: makePreviousAttendance(),
            mode: "historical",
            dirty: false,
            saving: false,
        };
        const before = snapshot(historical);

        const after = encounterReducer(historical, {
            type: "PATCH_SECTION",
            section: "doctorNote",
            data: "edited while historical — must be ignored",
        });

        // Identical reference (reducer short-circuits) and value.
        expect(after).toBe(historical);
        expect(after.attendance).toEqual(before.attendance);
        expect(after.dirty).toBe(false);
    });

    it("PATCH_BILLING is a no-op in historical mode (returns the same state)", () => {
        const historical: EncounterState = {
            attendance: makePreviousAttendance(),
            mode: "historical",
            dirty: false,
            saving: false,
        };
        const before = snapshot(historical);

        const after = encounterReducer(historical, {
            type: "PATCH_BILLING",
            data: { proceduresTotal: 9999, totalCharged: 9999, balance: 9999 },
        });

        expect(after).toBe(historical);
        expect(after.attendance.billing).toEqual(before.attendance.billing);
    });

    it("no dispatch in historical mode mutates the persisted current visit", () => {
        // Capture the original current visit the provider would hold in its ref.
        const original = makeCurrentAttendance();
        const originalSnapshot = snapshot(original);

        // Load a prior visit, then attempt edits while historical.
        let state = makeEditState(original);
        state = encounterReducer(state, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });
        state = encounterReducer(state, {
            type: "PATCH_SECTION",
            section: "doctorNote",
            data: "should not stick",
        });
        state = encounterReducer(state, {
            type: "PATCH_BILLING",
            data: { balance: -1 },
        });

        // The original current-visit object was never touched by any of this.
        expect(original).toEqual(originalSnapshot);
        // And the working state is still the (unedited) prior visit.
        expect(state.mode).toBe("historical");
        expect(state.attendance.doctorNote).toBe("Older visit note");
        expect(state.attendance.billing?.balance).toBe(0);
    });

    it("mode transition agrees with the pure nextMode helper", () => {
        const start = makeEditState(makeCurrentAttendance());
        const loaded = encounterReducer(start, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });
        expect(loaded.mode).toBe(nextMode("edit", "load-historical"));
    });
});

// ---------------------------------------------------------------------------
// Property 6: Return restores exactly
// Validates: Requirements 5.4
// ---------------------------------------------------------------------------
describe("encounterReducer — Property 6: RETURN_TO_CURRENT restores exactly", () => {
    it("restores the exact original current-visit snapshot and returns to edit mode", () => {
        const original = makeCurrentAttendance();
        const originalSnapshot = snapshot(original);

        // edit → load historical → return to current (payload = original ref).
        let state = makeEditState(original);
        state = encounterReducer(state, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });
        state = encounterReducer(state, {
            type: "RETURN_TO_CURRENT",
            attendance: original,
        });

        expect(state.mode).toBe("edit");
        expect(canEdit(state.mode)).toBe(true);
        // Exact restore: same reference the provider held, structurally equal to
        // the pristine snapshot (no fields lost or mutated along the way).
        expect(state.attendance).toBe(original);
        expect(state.attendance).toEqual(originalSnapshot);
        // Returning clears any dirty flag — the current visit is pristine again.
        expect(state.dirty).toBe(false);
    });

    it("after returning, the workspace is editable again (PATCH_SECTION applies)", () => {
        const original = makeCurrentAttendance();

        let state = makeEditState(original);
        state = encounterReducer(state, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });
        state = encounterReducer(state, {
            type: "RETURN_TO_CURRENT",
            attendance: original,
        });
        // Now editing works again (the no-op guard only applies in historical).
        const edited = encounterReducer(state, {
            type: "PATCH_SECTION",
            section: "doctorNote",
            data: "a fresh edit on the current visit",
        });

        expect(edited.mode).toBe("edit");
        expect(edited.attendance.doctorNote).toBe("a fresh edit on the current visit");
        expect(edited.dirty).toBe(true);
    });

    it("round-trip (load → return) agrees with the pure nextMode helper", () => {
        const afterLoad = nextMode("edit", "load-historical");
        const afterReturn = nextMode(afterLoad, "return-to-current");

        const original = makeCurrentAttendance();
        let state = makeEditState(original);
        state = encounterReducer(state, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });
        state = encounterReducer(state, { type: "RETURN_TO_CURRENT", attendance: original });

        expect(state.mode).toBe(afterReturn);
        expect(afterReturn).toBe("edit");
    });

    it("return restores exactly even after historical edits were attempted", () => {
        const original = makeCurrentAttendance();
        const originalSnapshot = snapshot(original);

        let state = makeEditState(original);
        state = encounterReducer(state, {
            type: "LOAD_HISTORICAL",
            attendance: makePreviousAttendance(),
        });
        // These are ignored (read-only), but we still expect a clean restore.
        state = encounterReducer(state, { type: "PATCH_SECTION", section: "plan", data: { treatment: "x", followUp: "y" } });
        state = encounterReducer(state, { type: "PATCH_BILLING", data: { balance: 123 } });
        state = encounterReducer(state, { type: "RETURN_TO_CURRENT", attendance: original });

        expect(state.attendance).toEqual(originalSnapshot);
    });
});
