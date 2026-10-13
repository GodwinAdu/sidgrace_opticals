import { describe, it, expect } from "vitest";
import {
    gcsTotal,
    orderTimeline,
    latestByType,
    type IcuTimelineEntry,
} from "../lib/clinical/icu";

const at = (iso: string) => iso;

describe("gcsTotal", () => {
    it("sums the three components for a normal score", () => {
        expect(gcsTotal({ eye: 4, verbal: 5, motor: 6 })).toBe(15);
    });

    it("clamps components into their valid ranges", () => {
        // eye max 4, verbal max 5, motor max 6 → 15 even when over-stated
        expect(gcsTotal({ eye: 9, verbal: 9, motor: 9 })).toBe(15);
        // and never below the per-component minimum of 1 → total 3
        expect(gcsTotal({ eye: 0, verbal: -2, motor: 0 })).toBe(3);
    });

    it("returns null when no component is supplied", () => {
        expect(gcsTotal({})).toBeNull();
        expect(gcsTotal({ eye: null, verbal: null, motor: null })).toBeNull();
    });

    it("treats a single supplied component as present (missing ones floor to 1)", () => {
        // only motor given → eye/verbal floor to 1 each
        expect(gcsTotal({ motor: 6 })).toBe(1 + 1 + 6);
    });
});

describe("orderTimeline", () => {
    const entries: IcuTimelineEntry[] = [
        { _id: "b", recordedAt: at("2024-01-02T10:00:00Z") },
        { _id: "a", recordedAt: at("2024-01-01T09:00:00Z") },
        { _id: "c", recordedAt: at("2024-01-03T08:00:00Z") },
    ];

    it("orders chronologically (oldest first) by default", () => {
        expect(orderTimeline(entries).map((e) => e._id)).toEqual(["a", "b", "c"]);
    });

    it("orders newest first when descending", () => {
        expect(orderTimeline(entries, "desc").map((e) => e._id)).toEqual(["c", "b", "a"]);
    });

    it("does not mutate the input array", () => {
        const copy = [...entries];
        orderTimeline(entries, "desc");
        expect(entries).toEqual(copy);
    });

    it("sorts entries with an unusable timestamp to the end (both directions)", () => {
        const withBad: IcuTimelineEntry[] = [
            { _id: "bad", recordedAt: "not-a-date" },
            { _id: "good", recordedAt: at("2024-01-01T00:00:00Z") },
        ];
        expect(orderTimeline(withBad, "asc").map((e) => e._id)).toEqual(["good", "bad"]);
        expect(orderTimeline(withBad, "desc").map((e) => e._id)).toEqual(["good", "bad"]);
    });

    it("handles null / empty input", () => {
        expect(orderTimeline(null)).toEqual([]);
        expect(orderTimeline(undefined)).toEqual([]);
        expect(orderTimeline([])).toEqual([]);
    });
});

describe("latestByType", () => {
    it("keeps the most recent entry per type", () => {
        const entries: IcuTimelineEntry[] = [
            { _id: "v1", type: "vitals", recordedAt: at("2024-01-01T00:00:00Z") },
            { _id: "v2", type: "vitals", recordedAt: at("2024-01-02T00:00:00Z") },
            { _id: "g1", type: "gcs", recordedAt: at("2024-01-01T06:00:00Z") },
        ];
        const latest = latestByType(entries);
        expect(latest.vitals._id).toBe("v2");
        expect(latest.gcs._id).toBe("g1");
    });

    it("prefers a usable timestamp over an unusable one", () => {
        const entries: IcuTimelineEntry[] = [
            { _id: "bad", type: "fluids", recordedAt: "nope" },
            { _id: "ok", type: "fluids", recordedAt: at("2024-01-01T00:00:00Z") },
        ];
        expect(latestByType(entries).fluids._id).toBe("ok");
    });

    it("defaults a missing type to 'note'", () => {
        const entries: IcuTimelineEntry[] = [{ _id: "n", recordedAt: at("2024-01-01T00:00:00Z") }];
        expect(latestByType(entries).note._id).toBe("n");
    });

    it("returns an empty map for empty input", () => {
        expect(latestByType([])).toEqual({});
        expect(latestByType(null)).toEqual({});
    });
});
