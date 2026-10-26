import { describe, it, expect } from "vitest";
import {
    shouldPersist,
    aggregateState,
    makeAutosaveReducer,
    type SaveState,
} from "../lib/clinical/autosave";

/**
 * Pure coverage for the auto-save logic:
 *   Property 2 — no-op changes do not persist,
 *   Property 4 — optimistic rollback restores the exact last-confirmed value,
 *   Property 8 — aggregate state is worst-of,
 *   plus the reducer record/confirm/fail transitions.
 */

describe("shouldPersist — Property 2: no-op guard", () => {
    it("is false when content equals the confirmed value (string, trimmed)", () => {
        expect(shouldPersist("hello", "hello")).toBe(false);
        expect(shouldPersist("hello", "  hello  ")).toBe(false);
    });
    it("is false for deep-equal structured content", () => {
        expect(shouldPersist({ bp: "120/80" }, { bp: "120/80" })).toBe(false);
    });
    it("is true when content differs", () => {
        expect(shouldPersist("hello", "world")).toBe(true);
        expect(shouldPersist({ bp: "120/80" }, { bp: "130/90" })).toBe(true);
        expect(shouldPersist(undefined, "new")).toBe(true);
    });
});

describe("aggregateState — Property 8: worst-of", () => {
    it("error beats everything", () => {
        expect(aggregateState(["saved", "saving", "error", "idle"])).toBe("error");
    });
    it("saving beats saved/idle", () => {
        expect(aggregateState(["saved", "saving", "idle"])).toBe("saving");
    });
    it("saved beats idle", () => {
        expect(aggregateState(["idle", "saved", "idle"])).toBe("saved");
    });
    it("empty / all idle → idle", () => {
        expect(aggregateState([])).toBe("idle");
        expect(aggregateState(["idle", "idle"])).toBe("idle");
    });
});

describe("makeAutosaveReducer — transitions & Property 4 rollback", () => {
    const r = makeAutosaveReducer();

    it("record marks pending + saving without touching confirmed", () => {
        let store = r.seed({}, "doctorNote", "v0");
        store = r.record(store, "doctorNote", "v1-typing");
        expect(r.fieldState(store, "doctorNote")).toBe("saving");
        // Confirmed (rollback target) is still the seeded baseline until confirm.
        expect(r.rollbackValue(store, "doctorNote")).toBe("v0");
    });

    it("confirm sets the new rollback target and 'saved', clears pending", () => {
        let store = r.record({}, "doctorNote", "v1");
        store = r.confirm(store, "doctorNote", "v1");
        expect(r.fieldState(store, "doctorNote")).toBe("saved");
        expect(r.rollbackValue(store, "doctorNote")).toBe("v1");
    });

    it("Property 4: after a failed save, rollbackValue is the LAST CONFIRMED value, state 'error'", () => {
        let store = r.seed({}, "doctorNote", "confirmed-text");
        // optimistic edit → saving
        store = r.record(store, "doctorNote", "half-typed edit");
        // server rejects it
        store = r.fail(store, "doctorNote");
        expect(r.fieldState(store, "doctorNote")).toBe("error");
        // Rollback restores the confirmed value, not the half-typed optimistic one.
        expect(r.rollbackValue(store, "doctorNote")).toBe("confirmed-text");
    });

    it("aggregate reflects the worst field state", () => {
        let store = r.confirm(r.record({}, "a", "x"), "a", "x"); // saved
        store = r.record(store, "b", "y"); // saving
        store = r.fail(store, "b"); // error
        expect(r.aggregate(store)).toBe("error");
    });

    it("reducer never mutates the input store (returns new objects)", () => {
        const store0: Record<string, never> = {};
        const store1 = r.record(store0, "a", "x");
        expect(store0).toEqual({});
        expect(store1).not.toBe(store0);
    });
});