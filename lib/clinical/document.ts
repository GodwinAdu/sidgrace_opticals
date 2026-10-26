/**
 * Pure patient-document helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (document list / consent archive). A
 * patient document is a file (scanned record, signed consent, upload, …) stored
 * via the upload pipeline — the database keeps only the URL, a type, and an
 * optional note.
 *
 * The document TYPES are the single source of truth for what the UI offers and
 * what the write action accepts, so an unknown type can never be persisted.
 * `consent` is the type the consent archive view filters on.
 */

/* ──────────────────────────────── Types ─────────────────────────────────── */

/** The recognised patient-document categories. */
export type PatientDocumentType =
    | "consent"
    | "scanned-record"
    | "lab-report"
    | "insurance"
    | "identification"
    | "referral-letter"
    | "other";

export const DOCUMENT_TYPES: { value: PatientDocumentType; label: string }[] = [
    { value: "consent", label: "Signed Consent" },
    { value: "scanned-record", label: "Scanned Record" },
    { value: "lab-report", label: "Lab / Diagnostic Report" },
    { value: "insurance", label: "Insurance Document" },
    { value: "identification", label: "Identification" },
    { value: "referral-letter", label: "Referral Letter" },
    { value: "other", label: "Other" },
];

const DOCUMENT_TYPE_VALUES = new Set<string>(DOCUMENT_TYPES.map((t) => t.value));

/** True when `value` is one of the recognised document types. */
export function isValidDocumentType(value?: string | null): value is PatientDocumentType {
    return typeof value === "string" && DOCUMENT_TYPE_VALUES.has(value);
}

/** Normalise an incoming type, falling back to "other" for anything unknown. */
export function normalizeDocumentType(value?: string | null): PatientDocumentType {
    return isValidDocumentType(value) ? value : "other";
}

/** Human-readable label for a document type (falls back to the raw value). */
export function documentTypeLabel(value?: string | null): string {
    return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? (value || "Other");
}

/* ─────────────────────────── Filtering / grouping ───────────────────────── */

/** The minimal shape the pure helpers need from a stored document. */
export interface DocumentLike {
    type?: string | null;
}

/**
 * The consent archive: just the signed-consent documents, preserving the input
 * order (callers sort newest-first before passing them in).
 */
export function filterConsents<T extends DocumentLike>(docs: T[]): T[] {
    if (!Array.isArray(docs)) return [];
    return docs.filter((d) => d?.type === "consent");
}

/**
 * Group documents by their (normalised) type. Every group that has at least one
 * document is returned; empty groups are omitted. Group order follows
 * DOCUMENT_TYPES so the UI is stable.
 */
export function groupByType<T extends DocumentLike>(
    docs: T[],
): { type: PatientDocumentType; label: string; documents: T[] }[] {
    const safe = Array.isArray(docs) ? docs : [];
    return DOCUMENT_TYPES.map(({ value, label }) => ({
        type: value,
        label,
        documents: safe.filter((d) => normalizeDocumentType(d?.type) === value),
    })).filter((g) => g.documents.length > 0);
}

/** Count documents per type (includes types with a zero count). */
export function countByType<T extends DocumentLike>(docs: T[]): Record<PatientDocumentType, number> {
    const safe = Array.isArray(docs) ? docs : [];
    const counts = Object.fromEntries(
        DOCUMENT_TYPES.map((t) => [t.value, 0]),
    ) as Record<PatientDocumentType, number>;
    for (const d of safe) {
        counts[normalizeDocumentType(d?.type)] += 1;
    }
    return counts;
}
