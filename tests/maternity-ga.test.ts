import { describe, it, expect } from "vitest";
import {
    daysBetween,
    estimatedDueDate,
    gestationalAge,
    formatGestationalAge,
    TERM_DAYS,
} from "../lib/clinical/maternity";

const at = (iso: string) => new Date(iso);

describe("daysBetween", () => {
    it("counts whole days between two dates", () => {
        expect(daysBetween(at("2024-01-01T00:00:00Z"), at("2024-01-11T00:00:00Z"))).toBe(10);
    });

    it("is negative when the target precedes the start", () => {
        expect(daysBetween(at("2024-01-11T00:00:00Z"), at("2024-01-01T00:00:00Z"))).toBe(-10);
    });

    it("returns null for an unusable input", () => {
        expect(daysBetween(null, at("2024-01-01T00:00:00Z"))).toBeNull();
        expect(daysBetween("nope", at("2024-01-01T00:00:00Z"))).toBeNull();
    });
});

describe("estimatedDueDate (Naegele's rule)", () => {
    it("adds a full term (280 days) to the LMP", () => {
        const edd = estimatedDueDate(at("2024-01-01T00:00:00Z"));
        expect(edd).not.toBeNull();
        const diff = (edd!.getTime() - at("2024-01-01T00:00:00Z").getTime()) / (24 * 60 * 60 * 1000);
        expect(diff).toBe(TERM_DAYS);
    });

    it("returns null for an unusable LMP", () => {
        expect(estimatedDueDate(null)).toBeNull();
        expect(estimatedDueDate("not-a-date")).toBeNull();
    });
});

describe("gestationalAge", () => {
    it("expresses age as completed weeks + remaining days", () => {
        // 38 weeks + 2 days = 268 days after LMP
        const lmp = at("2024-01-01T00:00:00Z");
        const asOf = new Date(lmp.getTime() + (38 * 7 + 2) * 24 * 60 * 60 * 1000);
        expect(gestationalAge(lmp, asOf)).toEqual({ weeks: 38, days: 2, totalDays: 268 });
    });

    it("is 0w 0d on the LMP day itself", () => {
        const lmp = at("2024-02-10T00:00:00Z");
        expect(gestationalAge(lmp, lmp)).toEqual({ weeks: 0, days: 0, totalDays: 0 });
    });

    it("returns null when the LMP is in the future (negative age)", () => {
        const lmp = at("2024-02-10T00:00:00Z");
        const earlier = at("2024-02-01T00:00:00Z");
        expect(gestationalAge(lmp, earlier)).toBeNull();
    });

    it("returns null for an unusable LMP", () => {
        expect(gestationalAge(null)).toBeNull();
    });
});

describe("formatGestationalAge", () => {
    it("renders the W+D convention", () => {
        const lmp = at("2024-01-01T00:00:00Z");
        const asOf = new Date(lmp.getTime() + (12 * 7 + 5) * 24 * 60 * 60 * 1000);
        expect(formatGestationalAge(lmp, asOf)).toBe("12w 5d");
    });

    it("is null when the age is unknown", () => {
        expect(formatGestationalAge(null)).toBeNull();
    });
});
