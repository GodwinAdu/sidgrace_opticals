/**
 * Pure Emergency / A&E helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused
 * on both the server (actions) and client (board view). The ER board ordering
 * is the only non-trivial pure logic: active cases are sorted by triage
 * severity (most urgent first), then by arrival time (earliest first).
 */

/**
 * Triage levels. We support both an ESI-style numeric scale (1 = most urgent,
 * 5 = least) and plain words. All are normalised to a single severity rank so
 * mixed inputs still order correctly.
 */
export type TriageLevel =
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "immediate"
    | "emergent"
    | "urgent"
    | "standard"
    | "non-urgent";

export const TRIAGE_LEVELS: { value: TriageLevel; label: string }[] = [
    { value: "1", label: "ESI 1 — Resuscitation (immediate)" },
    { value: "2", label: "ESI 2 — Emergent" },
    { value: "3", label: "ESI 3 — Urgent" },
    { value: "4", label: "ESI 4 — Less urgent" },
    { value: "5", label: "ESI 5 — Non-urgent" },
];

/** Minimal shape the board sorter cares about. */
export interface EmergencyCaseLike {
    triageLevel?: string;
    arrivedAt?: string | Date | null;
    status?: string;
}

/**
 * Rank for sorting: most urgent first (lower number = higher priority).
 * ESI 1 and "immediate" map to 1; "standard"/"non-urgent" map to 5. Anything
 * unrecognised sorts last (6) so a bad value never jumps the queue.
 */
const WORD_TO_RANK: Record<string, number> = {
    immediate: 1,
    emergent: 2,
    urgent: 3,
    standard: 4,
    "non-urgent": 5,
};

export function triageSeverityRank(level?: string): number {
    const key = String(level ?? "").trim().toLowerCase();
    if (!key) return 6;
    // Numeric ESI 1-5.
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && n <= 5) return n;
    return WORD_TO_RANK[key] ?? 6;
}

function arrivalMs(value?: string | Date | null): number {
    if (!value) return Number.POSITIVE_INFINITY;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Order ER cases for the board: by triage severity (most urgent first), then by
 * arrival time (earliest first) so same-severity patients are seen in the order
 * they arrived. Does not mutate the input array; result is deterministic.
 */
export function sortEmergencyBoard<T extends EmergencyCaseLike>(cases: T[]): T[] {
    return (cases || [])
        .slice()
        .sort((a, b) => {
            const r = triageSeverityRank(a.triageLevel) - triageSeverityRank(b.triageLevel);
            if (r !== 0) return r;
            return arrivalMs(a.arrivedAt) - arrivalMs(b.arrivedAt);
        });
}
