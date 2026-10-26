import { describe, it, expect } from "vitest";
import {
    triageSeverityRank,
    sortEmergencyBoard,
    type EmergencyCaseLike,
} from "../lib/clinical/emergency";

describe("triageSeverityRank", () => {
    it("maps ESI numbers 1-5 to their own rank (1 most urgent)", () => {
        expect(triageSeverityRank("1")).toBe(1);
        expect(triageSeverityRank("3")).toBe(3);
        expect(triageSeverityRank("5")).toBe(5);
    });

    it("maps words to the matching urgency", () => {
        expect(triageSeverityRank("immediate")).toBe(1);
        expect(triageSeverityRank("emergent")).toBe(2);
        expect(triageSeverityRank("urgent")).toBe(3);
        expect(triageSeverityRank("standard")).toBe(4);
        expect(triageSeverityRank("non-urgent")).toBe(5);
    });

    it("is case-insensitive and trims", () => {
        expect(triageSeverityRank(" IMMEDIATE ")).toBe(1);
        expect(triageSeverityRank("Urgent")).toBe(3);
    });

    it("sorts unknown / empty / out-of-range values last", () => {
        expect(triageSeverityRank(undefined)).toBe(6);
        expect(triageSeverityRank("")).toBe(6);
        expect(triageSeverityRank("0")).toBe(6);
        expect(triageSeverityRank("6")).toBe(6);
        expect(triageSeverityRank("garbage")).toBe(6);
    });
});

describe("sortEmergencyBoard", () => {
    it("orders by triage severity (most urgent first), then by arrival time", () => {
        const t = (iso: string) => new Date(iso);
        const input: (EmergencyCaseLike & { id: string })[] = [
            { id: "standard-early", triageLevel: "4", arrivedAt: t("2024-01-01T08:00:00Z") },
            { id: "urgent-late", triageLevel: "3", arrivedAt: t("2024-01-01T10:00:00Z") },
            { id: "immediate", triageLevel: "1", arrivedAt: t("2024-01-01T09:30:00Z") },
            { id: "urgent-early", triageLevel: "3", arrivedAt: t("2024-01-01T09:00:00Z") },
        ];
        const out = sortEmergencyBoard(input).map((c) => c.id);
        expect(out).toEqual(["immediate", "urgent-early", "urgent-late", "standard-early"]);
    });

    it("breaks severity ties by earliest arrival", () => {
        const input: (EmergencyCaseLike & { id: string })[] = [
            { id: "later", triageLevel: "2", arrivedAt: new Date("2024-01-01T12:00:00Z") },
            { id: "earlier", triageLevel: "2", arrivedAt: new Date("2024-01-01T11:00:00Z") },
        ];
        expect(sortEmergencyBoard(input).map((c) => c.id)).toEqual(["earlier", "later"]);
    });

    it("mixes numeric and word levels consistently", () => {
        const input: (EmergencyCaseLike & { id: string })[] = [
            { id: "word-urgent", triageLevel: "urgent", arrivedAt: new Date("2024-01-01T09:00:00Z") },
            { id: "esi-1", triageLevel: "1", arrivedAt: new Date("2024-01-01T10:00:00Z") },
            { id: "word-standard", triageLevel: "standard", arrivedAt: new Date("2024-01-01T08:00:00Z") },
        ];
        expect(sortEmergencyBoard(input).map((c) => c.id)).toEqual(["esi-1", "word-urgent", "word-standard"]);
    });

    it("places cases with missing arrival after those with a known arrival at the same severity", () => {
        const input: (EmergencyCaseLike & { id: string })[] = [
            { id: "no-arrival", triageLevel: "3" },
            { id: "has-arrival", triageLevel: "3", arrivedAt: new Date("2024-01-01T09:00:00Z") },
        ];
        expect(sortEmergencyBoard(input).map((c) => c.id)).toEqual(["has-arrival", "no-arrival"]);
    });

    it("does not mutate the input array", () => {
        const input: EmergencyCaseLike[] = [
            { triageLevel: "4", arrivedAt: new Date("2024-01-01T08:00:00Z") },
            { triageLevel: "1", arrivedAt: new Date("2024-01-01T09:00:00Z") },
        ];
        const copy = [...input];
        sortEmergencyBoard(input);
        expect(input).toEqual(copy);
    });

    it("handles empty / nullish input", () => {
        expect(sortEmergencyBoard([])).toEqual([]);
        expect(sortEmergencyBoard(undefined as unknown as EmergencyCaseLike[])).toEqual([]);
    });
});
