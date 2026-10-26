import { describe, it, expect } from "vitest";
import {
    isValidDocumentType,
    normalizeDocumentType,
    documentTypeLabel,
    filterConsents,
    groupByType,
    countByType,
    DOCUMENT_TYPES,
    type DocumentLike,
} from "../lib/clinical/document";

const ALL_TYPES = DOCUMENT_TYPES.map((t) => t.value);

/** A test document carries a type plus an optional id so order can be asserted. */
type TestDoc = DocumentLike & { id?: number };

/** Build a minimal document-like record with a given type. */
const doc = (type: string, extra: { id?: number } = {}): TestDoc => ({ type, ...extra });

describe("isValidDocumentType", () => {
    it("accepts every declared type", () => {
        for (const t of ALL_TYPES) {
            expect(isValidDocumentType(t)).toBe(true);
        }
    });

    it("rejects unknown / empty values", () => {
        expect(isValidDocumentType("prescription")).toBe(false);
        expect(isValidDocumentType("")).toBe(false);
        expect(isValidDocumentType(null)).toBe(false);
        expect(isValidDocumentType(undefined)).toBe(false);
    });
});

describe("normalizeDocumentType", () => {
    it("passes a known type through unchanged", () => {
        expect(normalizeDocumentType("consent")).toBe("consent");
        expect(normalizeDocumentType("insurance")).toBe("insurance");
    });

    it("falls back to 'other' for anything unknown", () => {
        expect(normalizeDocumentType("mystery")).toBe("other");
        expect(normalizeDocumentType("")).toBe("other");
        expect(normalizeDocumentType(null)).toBe("other");
        expect(normalizeDocumentType(undefined)).toBe("other");
    });
});

describe("documentTypeLabel", () => {
    it("returns the configured label for a known type", () => {
        expect(documentTypeLabel("consent")).toBe("Signed Consent");
    });

    it("falls back to the raw value then to 'Other'", () => {
        expect(documentTypeLabel("mystery")).toBe("mystery");
        expect(documentTypeLabel("")).toBe("Other");
        expect(documentTypeLabel(null)).toBe("Other");
    });
});

describe("filterConsents", () => {
    it("keeps only consent documents and preserves order", () => {
        const docs = [doc("consent", { id: 1 }), doc("insurance"), doc("consent", { id: 2 }), doc("other")];
        const result = filterConsents(docs);
        expect(result).toHaveLength(2);
        expect(result.map((d) => d.id)).toEqual([1, 2]);
    });

    it("returns an empty array when there are no consents or input is not an array", () => {
        expect(filterConsents([doc("insurance"), doc("other")])).toEqual([]);
        expect(filterConsents([])).toEqual([]);
        // defensive: non-array input
        expect(filterConsents(undefined as unknown as DocumentLike[])).toEqual([]);
    });

    it("does not treat unknown types as consents", () => {
        expect(filterConsents([doc("consented"), doc("CONSENT")])).toEqual([]);
    });
});

describe("groupByType", () => {
    it("omits empty groups and orders groups by DOCUMENT_TYPES", () => {
        const docs = [doc("other"), doc("consent"), doc("consent"), doc("insurance")];
        const groups = groupByType(docs);
        expect(groups.map((g) => g.type)).toEqual(["consent", "insurance", "other"]);
        expect(groups.find((g) => g.type === "consent")?.documents).toHaveLength(2);
    });

    it("buckets unknown types under 'other'", () => {
        const groups = groupByType([doc("mystery"), doc("other")]);
        expect(groups).toHaveLength(1);
        expect(groups[0].type).toBe("other");
        expect(groups[0].documents).toHaveLength(2);
    });

    it("returns an empty array for no / invalid input", () => {
        expect(groupByType([])).toEqual([]);
        expect(groupByType(undefined as unknown as DocumentLike[])).toEqual([]);
    });

    it("every grouped document actually belongs to its group", () => {
        const docs = ALL_TYPES.map((t) => doc(t));
        const groups = groupByType(docs);
        for (const g of groups) {
            for (const d of g.documents) {
                expect(normalizeDocumentType(d.type)).toBe(g.type);
            }
        }
    });
});

describe("countByType", () => {
    it("counts each type and reports zero for absent types", () => {
        const counts = countByType([doc("consent"), doc("consent"), doc("insurance"), doc("mystery")]);
        expect(counts.consent).toBe(2);
        expect(counts.insurance).toBe(1);
        expect(counts.other).toBe(1); // unknown bucketed into other
        expect(counts["lab-report"]).toBe(0);
    });

    it("has a key for every declared type and the counts sum to the input length", () => {
        const docs = [doc("consent"), doc("other"), doc("insurance"), doc("mystery")];
        const counts = countByType(docs);
        for (const t of ALL_TYPES) {
            expect(counts).toHaveProperty(t);
        }
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        expect(total).toBe(docs.length);
    });

    it("is all zeros for empty / invalid input", () => {
        const counts = countByType(undefined as unknown as DocumentLike[]);
        expect(Object.values(counts).every((c) => c === 0)).toBe(true);
    });
});
