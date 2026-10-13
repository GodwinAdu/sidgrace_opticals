import { describe, it, expect } from "vitest";
import {
    searchIcd10,
    drugMatchesAllergy,
    checkDrugAllergies,
    getOrderSet,
    ORDER_SETS,
    type AllergyWarning,
} from "../lib/clinical/cpoe";
import type { Icd10Code } from "../lib/clinical/icd10";
import type { AllergyLike } from "../lib/clinical/emr";

const CODES: Icd10Code[] = [
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    { code: "J45.909", description: "Unspecified asthma, uncomplicated" },
    { code: "B50.9", description: "Plasmodium falciparum malaria, unspecified" },
    { code: "R50.9", description: "Fever, unspecified" },
];

describe("searchIcd10", () => {
    it("returns the first `limit` codes for an empty query", () => {
        expect(searchIcd10("", CODES, 2)).toEqual([CODES[0], CODES[1]]);
    });

    it("matches on description (case-insensitive, substring)", () => {
        const out = searchIcd10("diabetes", CODES);
        expect(out).toHaveLength(1);
        expect(out[0].code).toBe("E11.9");
    });

    it("matches on code", () => {
        const out = searchIcd10("i10", CODES);
        expect(out.map((c) => c.code)).toEqual(["I10"]);
    });

    it("trims whitespace and is case-insensitive", () => {
        expect(searchIcd10("  MALARIA ", CODES).map((c) => c.code)).toEqual(["B50.9"]);
    });

    it("caps results at the limit", () => {
        const out = searchIcd10("unspecified", CODES, 2);
        expect(out.length).toBeLessThanOrEqual(2);
    });

    it("returns empty when nothing matches", () => {
        expect(searchIcd10("zzzznotacode", CODES)).toEqual([]);
    });

    it("works against the bundled default list", () => {
        expect(searchIcd10("hypertension").some((c) => c.code === "I10")).toBe(true);
    });
});

describe("drugMatchesAllergy", () => {
    it("matches identical names case-insensitively", () => {
        expect(drugMatchesAllergy("Penicillin", "penicillin")).toBe(true);
    });

    it("matches when drug contains allergy substance as a whole word", () => {
        expect(drugMatchesAllergy("Penicillin V", "penicillin")).toBe(true);
        expect(drugMatchesAllergy("Amoxicillin/Clavulanate", "amoxicillin")).toBe(true);
    });

    it("matches when allergy substance contains the drug name", () => {
        expect(drugMatchesAllergy("aspirin", "Aspirin (acetylsalicylic acid)")).toBe(true);
    });

    it("does not match unrelated drugs", () => {
        expect(drugMatchesAllergy("Paracetamol", "penicillin")).toBe(false);
    });

    it("does not substring-match a short substance into an unrelated word", () => {
        // "ace" (3 chars) must not match "Paracetamol".
        expect(drugMatchesAllergy("Paracetamol", "ace")).toBe(false);
    });

    it("returns false for empty inputs", () => {
        expect(drugMatchesAllergy("", "penicillin")).toBe(false);
        expect(drugMatchesAllergy("penicillin", "")).toBe(false);
        expect(drugMatchesAllergy(undefined, undefined)).toBe(false);
    });
});

describe("checkDrugAllergies", () => {
    const allergies: AllergyLike[] = [
        { substance: "Penicillin", severity: "severe", reaction: "anaphylaxis", status: "active" },
        { substance: "Sulfa", severity: "moderate", status: "active" },
        { substance: "Aspirin", severity: "mild", status: "inactive" },
    ];

    it("warns on a matching active allergy", () => {
        const out = checkDrugAllergies(["Amoxicillin", "Penicillin V"], allergies);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject<Partial<AllergyWarning>>({
            drugName: "Penicillin V",
            substance: "Penicillin",
            severity: "severe",
            reaction: "anaphylaxis",
        });
    });

    it("ignores inactive allergies", () => {
        expect(checkDrugAllergies(["Aspirin"], allergies)).toEqual([]);
    });

    it("returns no warnings when nothing matches", () => {
        expect(checkDrugAllergies(["Paracetamol", "Metformin"], allergies)).toEqual([]);
    });

    it("skips blank drug names and handles empty inputs", () => {
        expect(checkDrugAllergies(["", "  "], allergies)).toEqual([]);
        expect(checkDrugAllergies([], allergies)).toEqual([]);
        expect(checkDrugAllergies(["Penicillin"], [])).toEqual([]);
    });

    it("can produce multiple warnings across drugs", () => {
        const out = checkDrugAllergies(["Penicillin", "Co-trimoxazole (Sulfa)"], allergies);
        expect(out.map((w) => w.substance).sort()).toEqual(["Penicillin", "Sulfa"]);
    });

    it("does not match within a longer single word (whole-word only)", () => {
        // "Sulfamethoxazole" is one word, so an allergy to "Sulfa" does not fire.
        expect(checkDrugAllergies(["Sulfamethoxazole"], allergies)).toEqual([]);
    });
});

describe("order sets", () => {
    it("looks up a known order set by id", () => {
        const set = getOrderSet("malaria-workup");
        expect(set).toBeTruthy();
        expect(set?.items.length).toBeGreaterThan(0);
    });

    it("returns undefined for an unknown id", () => {
        expect(getOrderSet("does-not-exist")).toBeUndefined();
    });

    it("every bundled set has a unique id and typed items", () => {
        const ids = ORDER_SETS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const s of ORDER_SETS) {
            for (const item of s.items) {
                expect(["lab", "radiology", "drug"]).toContain(item.type);
                expect(item.name.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
