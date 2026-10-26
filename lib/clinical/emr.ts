/**
 * Pure EMR helpers for the structured problem / allergy / immunization lists.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused
 * on both the server (actions) and client (banner / panels).
 */

export type AllergySeverity = "mild" | "moderate" | "severe" | "unknown";

/** Minimal shape the banner/sorter cares about. */
export interface AllergyLike {
    substance?: string;
    severity?: AllergySeverity | string;
    status?: string;
    reaction?: string;
}

/** Rank for sorting: most dangerous first. Unknown sits below the named tiers. */
const SEVERITY_RANK: Record<string, number> = {
    severe: 0,
    moderate: 1,
    mild: 2,
    unknown: 3,
};

export function severityRank(severity?: string): number {
    const key = String(severity || "unknown").toLowerCase();
    return SEVERITY_RANK[key] ?? SEVERITY_RANK.unknown;
}

/**
 * Active allergies sorted severe → mild, then alphabetically by substance so
 * the banner surfaces the riskiest items first and is deterministic.
 */
export function sortAllergiesForBanner<T extends AllergyLike>(allergies: T[]): T[] {
    return (allergies || [])
        .filter((a) => a && (a.status ?? "active") !== "inactive")
        .slice()
        .sort((a, b) => {
            const r = severityRank(a.severity) - severityRank(b.severity);
            if (r !== 0) return r;
            return String(a.substance || "").localeCompare(String(b.substance || ""));
        });
}

/**
 * Build the safety-banner summary from BOTH the legacy free-text allergy
 * strings and the new structured allergy records, de-duplicated by substance
 * (case-insensitive). Structured records win so their severity is shown.
 *
 * Returns the ordered label list plus a flag for whether any severe allergy is
 * present (lets the UI escalate styling).
 */
export function buildAllergyBanner(
    structured: AllergyLike[] = [],
    freeText: string[] = []
): { labels: string[]; hasSevere: boolean; count: number } {
    const seen = new Set<string>();
    const labels: string[] = [];
    let hasSevere = false;

    for (const a of sortAllergiesForBanner(structured)) {
        const name = String(a.substance || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const sev = String(a.severity || "unknown").toLowerCase();
        if (sev === "severe") hasSevere = true;
        labels.push(sev && sev !== "unknown" ? `${name} (${sev})` : name);
    }

    for (const raw of freeText || []) {
        const name = String(raw || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        labels.push(name);
    }

    return { labels, hasSevere, count: labels.length };
}
