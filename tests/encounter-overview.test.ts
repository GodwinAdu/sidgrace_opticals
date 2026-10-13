import { describe, it, expect } from "vitest";
import {
    sectionDoneState,
    overviewModel,
    criticalAllergiesFromBanner,
    buildChecklist,
    signReadiness,
    type OverviewAttendance,
    type ChecklistItem,
} from "../lib/clinical/encounter-overview";

/**
 * Pure-level coverage for the encounter redesign derivations:
 *   Property 2 — section done-state is derived & faithful (version/content presence),
 *   Property 3 — overview never fabricates data (absent → empty),
 *   Property 4 — critical allergies come from the shared banner source,
 *   Property 5 — sign readiness true only when all REQUIRED items are done,
 *   plus checklist done/attention mapping.
 */

const EMPTY: OverviewAttendance = {};

// ---------------------------------------------------------------------------
// Property 2: sectionDoneState derived & faithful
// ---------------------------------------------------------------------------
describe("sectionDoneState — Property 2: derived & faithful", () => {
    it("is 'empty' for a null/empty attendance or unknown section", () => {
        expect(sectionDoneState(null, "vitals")).toBe("empty");
        expect(sectionDoneState(EMPTY, "vitals")).toBe("empty");
        expect(sectionDoneState(EMPTY, "no-such-section")).toBe("empty");
    });

    it("is 'done' when a tracked field has at least one attributed version", () => {
        const att: OverviewAttendance = { doctorNoteVersions: [{ content: "x" }] } as never;
        expect(sectionDoneState(att, "dr-notes")).toBe("done");
    });

    it("is 'done' for legacy scalar content even without versions (back-compat)", () => {
        expect(sectionDoneState({ doctorNote: "note" }, "dr-notes")).toBe("done");
        expect(sectionDoneState({ vitals: { pulse: 72 } }, "vitals")).toBe("done");
        expect(sectionDoneState({ diagnosis: { primary: "Myopia" } }, "diagnosis")).toBe("done");
    });

    it("is 'empty' when the backing field is blank/absent", () => {
        expect(sectionDoneState({ doctorNote: "   " }, "dr-notes")).toBe("empty");
        expect(sectionDoneState({ vitals: {} }, "vitals")).toBe("empty");
        expect(sectionDoneState({ diagnosis: { primary: "" } }, "diagnosis")).toBe("empty");
    });

    it("empty versions array is not 'done' unless scalar content exists", () => {
        expect(sectionDoneState({ doctorNoteVersions: [] } as never, "dr-notes")).toBe("empty");
        const withScalar: OverviewAttendance = { doctorNoteVersions: [], doctorNote: "n" } as never;
        expect(sectionDoneState(withScalar, "dr-notes")).toBe("done");
    });
});

// ---------------------------------------------------------------------------
// Property 4: allergies from the shared banner source
// ---------------------------------------------------------------------------
describe("criticalAllergiesFromBanner — Property 4: shared source", () => {
    it("shapes banner labels and flags severe by the (severe) suffix", () => {
        const out = criticalAllergiesFromBanner({
            labels: ["Penicillin (severe)", "Dust"],
            hasSevere: true,
        });
        expect(out).toEqual([
            { label: "Penicillin (severe)", severe: true },
            { label: "Dust", severe: false },
        ]);
    });

    it("returns [] for null/empty banner (never fabricates)", () => {
        expect(criticalAllergiesFromBanner(null)).toEqual([]);
        expect(criticalAllergiesFromBanner({ labels: [], hasSevere: false })).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Property 3: overviewModel never fabricates data
// ---------------------------------------------------------------------------
describe("overviewModel — Property 3: never fabricates", () => {
    it("absent attendance → all-empty model", () => {
        const m = overviewModel(null);
        expect(m.reasonForVisit).toBeNull();
        expect(m.criticalAllergies).toEqual([]);
        expect(m.chronicConditions).toEqual([]);
        expect(m.latestVitals).toBeNull();
        expect(m.diagnosisSummary).toBeNull();
        expect(m.hasPlan).toBe(false);
    });

    it("absent fields render as empty, present fields pass through", () => {
        const att: OverviewAttendance = {
            visitReason: "Headache",
            vitals: { pulse: 80 },
            diagnosis: { primary: "Migraine" },
            plan: { treatment: "Rest", followUp: "" },
            patientId: { chronicConditions: ["Hypertension", ""] },
        };
        const m = overviewModel(att, { labels: ["Dust"], hasSevere: false });
        expect(m.reasonForVisit).toBe("Headache");
        expect(m.latestVitals).toEqual({ pulse: 80 });
        expect(m.diagnosisSummary).toBe("Migraine");
        expect(m.hasPlan).toBe(true);
        expect(m.chronicConditions).toEqual(["Hypertension"]); // blank filtered
        expect(m.criticalAllergies).toEqual([{ label: "Dust", severe: false }]);
    });

    it("blank reason / empty diagnosis primary stay null", () => {
        const m = overviewModel({ visitReason: "  ", diagnosis: { primary: "" } });
        expect(m.reasonForVisit).toBeNull();
        expect(m.diagnosisSummary).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Checklist + Property 5: sign readiness
// ---------------------------------------------------------------------------
describe("buildChecklist / signReadiness — Property 5", () => {
    it("marks items done/attention from presence", () => {
        const att: OverviewAttendance = {
            visitReason: "Headache",
            vitals: { pulse: 80 },
            diagnosis: { primary: "Migraine" },
        };
        const list = buildChecklist(att, { hasPatient: true });
        const byId = Object.fromEntries(list.map((i) => [i.id, i.state]));
        expect(byId.patient).toBe("done");
        expect(byId.reason).toBe("done");
        expect(byId.vitals).toBe("done");
        expect(byId.diagnosis).toBe("done");
        expect(byId.plan).toBe("attention"); // no plan
    });

    it("not ready while a required item (vitals/diagnosis/patient) is outstanding", () => {
        const list = buildChecklist(EMPTY, { hasPatient: true });
        const r = signReadiness(list);
        expect(r.ready).toBe(false);
        const ids = r.outstanding.map((o) => o.id).sort();
        expect(ids).toEqual(["diagnosis", "vitals"]); // patient done via hasPatient
    });

    it("ready only when ALL required items are done", () => {
        const att: OverviewAttendance = {
            vitals: { pulse: 80 },
            diagnosis: { primary: "Migraine" },
        };
        const list = buildChecklist(att, { hasPatient: true });
        const r = signReadiness(list);
        expect(r.ready).toBe(true);
        expect(r.outstanding).toEqual([]);
    });

    it("missing patient makes the required patient item outstanding", () => {
        const att: OverviewAttendance = { vitals: { pulse: 80 }, diagnosis: { primary: "x" } };
        const list = buildChecklist(att, { hasPatient: false });
        const r = signReadiness(list);
        expect(r.ready).toBe(false);
        expect(r.outstanding.map((o) => o.id)).toContain("patient");
    });

    it("optional items never block readiness", () => {
        const att: OverviewAttendance = { vitals: { pulse: 80 }, diagnosis: { primary: "x" } };
        const list = buildChecklist(att, { hasPatient: true });
        // reason & plan are attention (optional) but readiness is still true.
        const optionalAttention = list.filter((i: ChecklistItem) => !i.required && i.state === "attention");
        expect(optionalAttention.length).toBeGreaterThan(0);
        expect(signReadiness(list).ready).toBe(true);
    });
});