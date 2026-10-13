import { describe, it, expect } from "vitest";
import {
    resolveVisibleTabs,
    firstVisibleTab,
    rollUpBilling,
    nextMode,
    canEdit,
    resolveSaveStatus,
    resolveCompleteStatus,
    type VisitStatus,
    type EncounterTab,
    type CanFn,
    type GateContext,
    type RoleFlag,
} from "../lib/clinical/encounter";

/**
 * Test registry mirroring the legacy ConsultingPage.tsx tab set, gates, and
 * ordering. The order below is the authoritative precedence used by
 * `firstVisibleTab`, matching the monolith's explicit precedence chain:
 *   attClinical → attLabScan → attEyeTest → attNursing → attTreatment →
 *   attPrescribe → attBilling → (fallback) history.
 *
 * Gate rules (reproduced exactly from the monolith):
 *   History/Exam/Diagnosis/Dr/Nurse/Vitals/Surgical/Dental(chart,notes,perio) → attClinical
 *   Lab Report/Scan/Imaging                                                    → attLabScan
 *   Eye Test                                                                   → attEyeTest
 *   Nursing/MAR/Intake-Output                                                  → attNursing
 *   ICU Chart                             → hasAdmission && (attNursing || icuManagement)
 *   Treatment Plan/Dental Plan/Lab Case                                        → attTreatment
 *   Prescribe                                                                  → attPrescribe
 *   Billing                                                                    → attBilling
 */
const clinical = (f: RoleFlag) => (can: CanFn) => can(f);

const TEST_TABS: EncounterTab[] = [
    // attClinical – clinical group (history leads the whole precedence)
    { id: "history", label: "History", shortLabel: "Hist", group: "clinical", gate: clinical("attClinical") },
    { id: "physic-exam", label: "Physical Exam", shortLabel: "Exam", group: "clinical", gate: clinical("attClinical") },
    { id: "diagnosis", label: "Diagnosis", shortLabel: "Diag", group: "clinical", gate: clinical("attClinical") },
    { id: "dr-notes", label: "Dr's Notes", shortLabel: "Dr", group: "clinical", gate: clinical("attClinical") },
    { id: "nurse-notes", label: "Nurse's Notes", shortLabel: "Nurse", group: "clinical", gate: clinical("attClinical") },
    { id: "vitals", label: "Vitals", shortLabel: "Vitals", group: "clinical", gate: clinical("attClinical") },
    { id: "surgical-notes", label: "Surgical Notes", shortLabel: "Surgery", group: "clinical", gate: clinical("attClinical") },
    { id: "dental-chart", label: "Dental Chart", shortLabel: "Chart", group: "specialty", gate: clinical("attClinical") },
    { id: "clinical-notes", label: "Dental Notes", shortLabel: "SOAP", group: "specialty", gate: clinical("attClinical") },
    { id: "perio", label: "Perio", shortLabel: "Perio", group: "specialty", gate: clinical("attClinical") },
    // attLabScan – diagnostics group (lab-report leads this flag)
    { id: "lab-report", label: "Lab Report", shortLabel: "Lab", group: "diagnostics", gate: clinical("attLabScan") },
    { id: "scan", label: "Scan/Image", shortLabel: "Scan", group: "diagnostics", gate: clinical("attLabScan") },
    { id: "imaging", label: "Imaging", shortLabel: "Imaging", group: "diagnostics", gate: clinical("attLabScan") },
    // attEyeTest
    { id: "eye-test", label: "Eye Test", shortLabel: "Eye", group: "clinical", gate: clinical("attEyeTest") },
    // attNursing – nursing group
    { id: "nursing-notes", label: "Nursing Notes", shortLabel: "Nursing", group: "nursing", gate: clinical("attNursing") },
    { id: "mar", label: "Med Admin", shortLabel: "MAR", group: "nursing", gate: clinical("attNursing") },
    { id: "intake-output", label: "Intake/Output", shortLabel: "I/O", group: "nursing", gate: clinical("attNursing") },
    // ICU – admission AND (attNursing OR icuManagement)
    {
        id: "icu-chart",
        label: "ICU Chart",
        shortLabel: "ICU",
        group: "nursing",
        gate: (can, ctx) => ctx.hasAdmission && (can("attNursing") || can("icuManagement")),
    },
    // attTreatment – orders group (treatment-plan leads this flag)
    { id: "treatment-plan", label: "Plan & Follow-up", shortLabel: "Follow-up", group: "orders", gate: clinical("attTreatment") },
    { id: "dental-plan", label: "Treatment Plan", shortLabel: "Tx Plan", group: "orders", gate: clinical("attTreatment") },
    { id: "lab-case", label: "Lab Case", shortLabel: "Lab", group: "orders", gate: clinical("attTreatment") },
    // attPrescribe
    { id: "prescribe", label: "Prescribe", shortLabel: "Rx", group: "orders", gate: clinical("attPrescribe") },
    // attBilling
    { id: "billing", label: "Billing", shortLabel: "Bill", group: "billing", gate: clinical("attBilling") },
];

/** Fail-open `can`, matching the monolith: no role → everything visible. */
function makeCan(role: Partial<IRole> | null): CanFn {
    return (flag: RoleFlag) => (role ? !!role[flag] : true);
}

const ctxNoAdmission: GateContext = { hasAdmission: false, hasPatient: true };
const ctxAdmission: GateContext = { hasAdmission: true, hasPatient: true };

/**
 * Reference re-implementation of the monolith's visibility + firstVisibleTab,
 * used as an independent oracle for parity tests. This mirrors the original
 * JSX gates and the explicit `firstVisibleTab` chain directly.
 */
function oracleVisibleIds(role: Partial<IRole> | null, ctx: GateContext): string[] {
    const can = makeCan(role);
    const ids: string[] = [];
    const clinicalIds = ["history", "physic-exam", "diagnosis", "dr-notes", "nurse-notes", "vitals", "surgical-notes", "dental-chart", "clinical-notes", "perio"];
    const labIds = ["lab-report", "scan", "imaging"];
    const nursingIds = ["nursing-notes", "mar", "intake-output"];
    const treatmentIds = ["treatment-plan", "dental-plan", "lab-case"];
    if (can("attClinical")) ids.push(...clinicalIds);
    if (can("attLabScan")) ids.push(...labIds);
    if (can("attEyeTest")) ids.push("eye-test");
    if (can("attNursing")) ids.push(...nursingIds);
    if (ctx.hasAdmission && (can("attNursing") || can("icuManagement"))) ids.push("icu-chart");
    if (can("attTreatment")) ids.push(...treatmentIds);
    if (can("attPrescribe")) ids.push("prescribe");
    if (can("attBilling")) ids.push("billing");
    return ids;
}

function oracleFirstTab(role: Partial<IRole> | null): string {
    const can = makeCan(role);
    return can("attClinical") ? "history"
        : can("attLabScan") ? "lab-report"
        : can("attEyeTest") ? "eye-test"
        : can("attNursing") ? "nursing-notes"
        : can("attTreatment") ? "treatment-plan"
        : can("attPrescribe") ? "prescribe"
        : can("attBilling") ? "billing"
        : "history";
}

const GATED_FLAGS: RoleFlag[] = [
    "attClinical",
    "attLabScan",
    "attEyeTest",
    "attNursing",
    "attTreatment",
    "attPrescribe",
    "attBilling",
];

/** Enumerate every subset (power set) of the gated flags. */
function allRoleCombos(): Partial<IRole>[] {
    const combos: Partial<IRole>[] = [];
    const total = 1 << GATED_FLAGS.length;
    for (let mask = 0; mask < total; mask++) {
        const role: Partial<IRole> = { name: "r", displayName: "R" };
        GATED_FLAGS.forEach((flag, i) => {
            if (mask & (1 << i)) (role as Record<string, boolean>)[flag] = true;
        });
        combos.push(role);
    }
    return combos;
}

// ---------------------------------------------------------------------------
// Property 1: Gating parity (Requirements 2.1, 2.2, 2.5, 8.3)
// ---------------------------------------------------------------------------
describe("resolveVisibleTabs — Property 1: gating parity", () => {
    it("matches the monolith's visible set for every role combination (no admission)", () => {
        for (const role of allRoleCombos()) {
            const got = resolveVisibleTabs(TEST_TABS, makeCan(role), ctxNoAdmission).map((t) => t.id);
            expect(got).toEqual(oracleVisibleIds(role, ctxNoAdmission));
        }
    });

    it("matches the monolith's visible set for every role combination (with admission)", () => {
        for (const role of allRoleCombos()) {
            const got = resolveVisibleTabs(TEST_TABS, makeCan(role), ctxAdmission).map((t) => t.id);
            expect(got).toEqual(oracleVisibleIds(role, ctxAdmission));
        }
    });

    it("fails open: no role shows every tab", () => {
        const got = resolveVisibleTabs(TEST_TABS, makeCan(null), ctxAdmission).map((t) => t.id);
        expect(got).toEqual(TEST_TABS.map((t) => t.id));
    });

    it("ICU appears only with admission AND (attNursing or icuManagement)", () => {
        const icuVisible = (role: Partial<IRole>, ctx: GateContext) =>
            resolveVisibleTabs(TEST_TABS, makeCan(role), ctx).some((t) => t.id === "icu-chart");

        // No admission → never visible, even with the flags.
        expect(icuVisible({ name: "r", displayName: "R", attNursing: true }, ctxNoAdmission)).toBe(false);
        expect(icuVisible({ name: "r", displayName: "R", icuManagement: true }, ctxNoAdmission)).toBe(false);
        // Admission + either flag → visible.
        expect(icuVisible({ name: "r", displayName: "R", attNursing: true }, ctxAdmission)).toBe(true);
        expect(icuVisible({ name: "r", displayName: "R", icuManagement: true }, ctxAdmission)).toBe(true);
        // Admission but neither flag → hidden.
        expect(icuVisible({ name: "r", displayName: "R", attClinical: true }, ctxAdmission)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Property 2: Default-tab determinism (Requirement 2.3)
// ---------------------------------------------------------------------------
describe("firstVisibleTab — Property 2: default-tab determinism", () => {
    it("equals the monolith's firstVisibleTab precedence for every role combination", () => {
        for (const role of allRoleCombos()) {
            const visible = resolveVisibleTabs(TEST_TABS, makeCan(role), ctxNoAdmission);
            expect(firstVisibleTab(visible)).toBe(oracleFirstTab(role));
        }
    });

    it("is deterministic across repeated calls", () => {
        const role: Partial<IRole> = { name: "r", displayName: "R", attLabScan: true, attBilling: true };
        const visible = resolveVisibleTabs(TEST_TABS, makeCan(role), ctxNoAdmission);
        expect(firstVisibleTab(visible)).toBe(firstVisibleTab(visible));
        expect(firstVisibleTab(visible)).toBe("lab-report");
    });

    it("never returns a tab the user cannot see", () => {
        for (const role of allRoleCombos()) {
            const visible = resolveVisibleTabs(TEST_TABS, makeCan(role), ctxNoAdmission);
            const first = firstVisibleTab(visible);
            if (visible.length > 0) {
                expect(visible.map((t) => t.id)).toContain(first);
            } else {
                // Empty role set falls back to "history" (monolith default).
                expect(first).toBe("history");
            }
        }
    });

    it("falls back to history when nothing is visible", () => {
        const emptyRole: Partial<IRole> = { name: "r", displayName: "R" };
        const visible = resolveVisibleTabs(TEST_TABS, makeCan(emptyRole), ctxNoAdmission);
        expect(visible).toHaveLength(0);
        expect(firstVisibleTab(visible)).toBe("history");
    });
});

// ---------------------------------------------------------------------------
// Property 8: No new privileges (Requirements 2.1, 8.3)
// ---------------------------------------------------------------------------
describe("resolveVisibleTabs — Property 8: subset of privileges", () => {
    it("visible set is always a subset of what the role's gates permit", () => {
        for (const role of allRoleCombos()) {
            const can = makeCan(role);
            const visible = resolveVisibleTabs(TEST_TABS, can, ctxAdmission);
            for (const tab of visible) {
                // Every visible tab must independently pass its own gate.
                expect(tab.gate(can, ctxAdmission)).toBe(true);
            }
        }
    });

    it("never grants a tab whose gate is false", () => {
        const role: Partial<IRole> = { name: "r", displayName: "R", attClinical: true };
        const can = makeCan(role);
        const visible = resolveVisibleTabs(TEST_TABS, can, ctxAdmission).map((t) => t.id);
        // attLabScan / attPrescribe / attBilling tabs must be absent.
        expect(visible).not.toContain("lab-report");
        expect(visible).not.toContain("prescribe");
        expect(visible).not.toContain("billing");
        expect(visible).not.toContain("eye-test");
    });
});

// ---------------------------------------------------------------------------
// Property 7: Billing roll-up consistency (Requirements 3.4, 4.5)
// ---------------------------------------------------------------------------
describe("rollUpBilling — Property 7: billing roll-up consistency", () => {
    it("total charged = consultation + procedures + products + other charges", () => {
        const r = rollUpBilling({
            consultationFee: 100,
            proceduresTotal: 50,
            productsTotal: 25,
            otherCharges: [{ label: "a", amount: 10 }, { label: "b", amount: 5 }],
            amountPaid: 0,
        });
        expect(r.otherChargesTotal).toBe(15);
        expect(r.totalCharged).toBe(190);
    });

    it("balance = total charged − amount paid", () => {
        const r = rollUpBilling({
            consultationFee: 200,
            proceduresTotal: 0,
            productsTotal: 0,
            otherCharges: [],
            amountPaid: 120,
        });
        expect(r.totalCharged).toBe(200);
        expect(r.balance).toBe(80);
    });

    it("treats missing / null / non-numeric fields as zero", () => {
        const r = rollUpBilling({
            consultationFee: undefined,
            proceduresTotal: null,
            otherCharges: [{ amount: undefined }, { amount: null }, {}],
        });
        expect(r.totalCharged).toBe(0);
        expect(r.balance).toBe(0);
    });

    it("handles an empty / null slice", () => {
        expect(rollUpBilling(null).totalCharged).toBe(0);
        expect(rollUpBilling(undefined).balance).toBe(0);
        expect(rollUpBilling({}).totalCharged).toBe(0);
    });

    it("server-returned totalCharged / balance override the computed values (reconciliation)", () => {
        const r = rollUpBilling({
            consultationFee: 100,
            proceduresTotal: 50,
            productsTotal: 0,
            otherCharges: [],
            amountPaid: 30,
            // Server reconciled figures differ from the naive computation.
            totalCharged: 175,
            balance: 145,
        });
        expect(r.totalCharged).toBe(175);
        expect(r.balance).toBe(145);
    });

    it("is pure: repeated calls on the same slice yield equal results", () => {
        const slice = {
            consultationFee: 10,
            proceduresTotal: 20,
            productsTotal: 30,
            otherCharges: [{ amount: 5 }],
            amountPaid: 15,
        };
        expect(rollUpBilling(slice)).toEqual(rollUpBilling(slice));
    });
});

// ---------------------------------------------------------------------------
// Properties 5 & 6 (pure level): mode transitions + canEdit
// (Requirements 5.2, 5.3, 5.4)
// ---------------------------------------------------------------------------
describe("nextMode / canEdit — Properties 5 & 6: mode transitions", () => {
    it("loading a historical visit enters read-only historical mode", () => {
        expect(nextMode("edit", "load-historical")).toBe("historical");
        expect(nextMode("historical", "load-historical")).toBe("historical");
    });

    it("returning to current restores edit mode", () => {
        expect(nextMode("historical", "return-to-current")).toBe("edit");
        expect(nextMode("edit", "return-to-current")).toBe("edit");
    });

    it("canEdit is true only in edit mode", () => {
        expect(canEdit("edit")).toBe(true);
        expect(canEdit("historical")).toBe(false);
    });

    it("historical mode is read-only (canEdit false after load-historical)", () => {
        expect(canEdit(nextMode("edit", "load-historical"))).toBe(false);
    });

    it("edit is restored and editable after return-to-current (round trip)", () => {
        const afterLoad = nextMode("edit", "load-historical");
        const afterReturn = nextMode(afterLoad, "return-to-current");
        expect(afterReturn).toBe("edit");
        expect(canEdit(afterReturn)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Property 3: Save preserves status  (Requirements 4.2, 4.3, 8.1, 9.1)
// A plain record Save never changes status to "completed"; saved status equals
// the prior status unless an explicit Complete Visit action is taken.
// ---------------------------------------------------------------------------
const ALL_STATUSES: VisitStatus[] = ["waiting", "ongoing", "completed", "cancelled"];

describe("resolveSaveStatus — Property 3: save preserves status", () => {
    it("preserves the current status when no status is requested (undefined)", () => {
        for (const current of ALL_STATUSES) {
            expect(resolveSaveStatus(current, undefined)).toBe(current);
        }
    });

    it("preserves the current status when the requested status is null", () => {
        for (const current of ALL_STATUSES) {
            expect(resolveSaveStatus(current, null)).toBe(current);
        }
    });

    it("a plain Save of an in-progress visit never silently completes it", () => {
        // The core regression this fix addresses: waiting/ongoing stay as-is.
        expect(resolveSaveStatus("waiting")).toBe("waiting");
        expect(resolveSaveStatus("ongoing")).toBe("ongoing");
        // And specifically must NOT become "completed".
        expect(resolveSaveStatus("waiting")).not.toBe("completed");
        expect(resolveSaveStatus("ongoing")).not.toBe("completed");
    });

    it("defaults to 'waiting' (schema default) when current status is absent", () => {
        expect(resolveSaveStatus(undefined)).toBe("waiting");
        expect(resolveSaveStatus(null)).toBe("waiting");
    });

    it("an explicitly requested status wins over the current one (intentional transition)", () => {
        expect(resolveSaveStatus("waiting", "ongoing")).toBe("ongoing");
        expect(resolveSaveStatus("ongoing", "cancelled")).toBe("cancelled");
        expect(resolveSaveStatus("waiting", "completed")).toBe("completed");
    });

    it("is pure: repeated calls with the same inputs yield equal results", () => {
        expect(resolveSaveStatus("ongoing", undefined)).toBe(resolveSaveStatus("ongoing", undefined));
        expect(resolveSaveStatus("waiting", "completed")).toBe(resolveSaveStatus("waiting", "completed"));
    });
});

// ---------------------------------------------------------------------------
// Property 4: Complete is explicit and idempotent  (Requirements 4.3, 9.1)
// Complete Visit sets status="completed"; completing an already-completed
// visit is a no-op on status.
// ---------------------------------------------------------------------------
describe("resolveCompleteStatus / resolveSaveStatus — Property 4: complete is explicit and idempotent", () => {
    it("Complete Visit always resolves to 'completed'", () => {
        expect(resolveCompleteStatus()).toBe("completed");
    });

    it("completing from any starting status yields 'completed'", () => {
        for (const current of ALL_STATUSES) {
            // The footer passes status: "completed" through the save path.
            expect(resolveSaveStatus(current, resolveCompleteStatus())).toBe("completed");
        }
    });

    it("completing an already-completed visit is a no-op on status (idempotent)", () => {
        const once = resolveSaveStatus("completed", resolveCompleteStatus());
        const twice = resolveSaveStatus(once, resolveCompleteStatus());
        expect(once).toBe("completed");
        expect(twice).toBe("completed");
        expect(twice).toBe(once);
    });

    it("Complete is distinct from Save: only Complete reaches 'completed' from a plain save", () => {
        // Plain save preserves (does not complete)...
        expect(resolveSaveStatus("ongoing")).toBe("ongoing");
        // ...while the explicit complete path does.
        expect(resolveSaveStatus("ongoing", resolveCompleteStatus())).toBe("completed");
    });
});
