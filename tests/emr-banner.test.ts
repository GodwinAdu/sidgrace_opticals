import { describe, it, expect } from "vitest";
import {
    severityRank,
    sortAllergiesForBanner,
    buildAllergyBanner,
    type AllergyLike,
} from "../lib/clinical/emr";

describe("severityRank", () => {
    it("ranks severe < moderate < mild < unknown", () => {
        expect(severityRank("severe")).toBeLessThan(severityRank("moderate"));
        expect(severityRank("moderate")).toBeLessThan(severityRank("mild"));
        expect(severityRank("mild")).toBeLessThan(severityRank("unknown"));
    });

    it("treats missing/garbage severity as unknown", () => {
        expect(severityRank(undefined)).toBe(severityRank("unknown"));
        expect(severityRank("not-a-level")).toBe(severityRank("unknown"));
    });

    it("is case-insensitive", () => {
        expect(severityRank("SEVERE")).toBe(severityRank("severe"));
    });
});

describe("sortAllergiesForBanner", () => {
    it("orders by severity then alphabetically, dropping inactive", () => {
        const input: AllergyLike[] = [
            { substance: "Pollen", severity: "mild" },
            { substance: "Latex", severity: "severe", status: "inactive" },
            { substance: "Penicillin", severity: "severe" },
            { substance: "Aspirin", severity: "moderate" },
            { substance: "Amoxicillin", severity: "severe" },
        ];
        const out = sortAllergiesForBanner(input).map((a) => a.substance);
        expect(out).toEqual(["Amoxicillin", "Penicillin", "Aspirin", "Pollen"]);
    });

    it("does not mutate the input array", () => {
        const input: AllergyLike[] = [
            { substance: "B", severity: "mild" },
            { substance: "A", severity: "severe" },
        ];
        const copy = [...input];
        sortAllergiesForBanner(input);
        expect(input).toEqual(copy);
    });
});

describe("buildAllergyBanner", () => {
    it("merges structured + free-text, structured first, de-duped case-insensitively", () => {
        const structured: AllergyLike[] = [
            { substance: "Penicillin", severity: "severe" },
            { substance: "Dust", severity: "mild" },
        ];
        const freeText = ["penicillin", "Peanuts", ""];
        const r = buildAllergyBanner(structured, freeText);
        expect(r.labels).toEqual(["Penicillin (severe)", "Dust (mild)", "Peanuts"]);
        expect(r.count).toBe(3);
        expect(r.hasSevere).toBe(true);
    });

    it("omits severity label when unknown", () => {
        const r = buildAllergyBanner([{ substance: "Shellfish", severity: "unknown" }], []);
        expect(r.labels).toEqual(["Shellfish"]);
        expect(r.hasSevere).toBe(false);
    });

    it("returns empty summary when there is nothing", () => {
        const r = buildAllergyBanner([], []);
        expect(r.count).toBe(0);
        expect(r.labels).toEqual([]);
        expect(r.hasSevere).toBe(false);
    });

    it("handles only free-text (back-compat path)", () => {
        const r = buildAllergyBanner([], ["Pollen", "Pollen", "Latex"]);
        expect(r.labels).toEqual(["Pollen", "Latex"]);
        expect(r.hasSevere).toBe(false);
    });

    it("flags severe when any structured allergy is severe", () => {
        const r = buildAllergyBanner(
            [{ substance: "A", severity: "mild" }, { substance: "B", severity: "severe" }],
            [],
        );
        expect(r.hasSevere).toBe(true);
    });
});
