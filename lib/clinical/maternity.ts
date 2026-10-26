/**
 * Pure Maternity / obstetrics helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (ANC / delivery views). The only
 * non-trivial pure logic is gestational-age computation from the last menstrual
 * period (LMP) and the estimated due date (EDD) derived from it via Naegele's
 * rule. Both are standard obstetric calculations and purely date arithmetic.
 */

/** Delivery modes. */
export type DeliveryMode =
    | "vaginal"
    | "assisted-vaginal"
    | "caesarean"
    | "vbac"
    | "other";

export const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
    { value: "vaginal", label: "Vaginal" },
    { value: "assisted-vaginal", label: "Assisted vaginal" },
    { value: "caesarean", label: "Caesarean section" },
    { value: "vbac", label: "VBAC" },
    { value: "other", label: "Other" },
];

/** Delivery outcomes for the mother/episode. */
export type DeliveryOutcome =
    | "live-birth"
    | "stillbirth"
    | "miscarriage"
    | "neonatal-death"
    | "other";

export const DELIVERY_OUTCOMES: { value: DeliveryOutcome; label: string }[] = [
    { value: "live-birth", label: "Live birth" },
    { value: "stillbirth", label: "Stillbirth" },
    { value: "miscarriage", label: "Miscarriage" },
    { value: "neonatal-death", label: "Neonatal death" },
    { value: "other", label: "Other" },
];

/** ANC episode statuses, in lifecycle order. */
export type AncStatus = "active" | "delivered" | "closed";

export const ANC_STATUSES: { value: AncStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "delivered", label: "Delivered" },
    { value: "closed", label: "Closed" },
];

/** A full term is 40 weeks (280 days) from the LMP. */
export const TERM_DAYS = 280;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days between two dates (`to - from`); negative when `to` precedes `from`. */
export function daysBetween(from?: string | Date | null, to?: string | Date | null): number | null {
    const a = toDate(from);
    const b = toDate(to ?? new Date());
    if (!a || !b) return null;
    return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/**
 * Estimated due date (EDD) from the last menstrual period via Naegele's rule:
 * LMP + 280 days (a full 40-week term). Returns null for an unusable LMP.
 */
export function estimatedDueDate(lmp?: string | Date | null): Date | null {
    const d = toDate(lmp);
    if (!d) return null;
    return new Date(d.getTime() + TERM_DAYS * MS_PER_DAY);
}

/**
 * Gestational age at `asOf` (default: now) given the LMP, expressed as whole
 * completed weeks + the remaining days (0–6), plus the total day count. This is
 * the obstetric convention "W+D" (e.g. 38 weeks + 2 days). Returns null when
 * the LMP is unusable or lies in the future relative to `asOf`.
 */
export function gestationalAge(
    lmp?: string | Date | null,
    asOf?: string | Date | null,
): { weeks: number; days: number; totalDays: number } | null {
    const totalDays = daysBetween(lmp, asOf ?? new Date());
    if (totalDays === null || totalDays < 0) return null;
    return {
        weeks: Math.floor(totalDays / 7),
        days: totalDays % 7,
        totalDays,
    };
}

/** Human-readable gestational age, e.g. "38w 2d". Null when unknown. */
export function formatGestationalAge(
    lmp?: string | Date | null,
    asOf?: string | Date | null,
): string | null {
    const ga = gestationalAge(lmp, asOf);
    if (!ga) return null;
    return `${ga.weeks}w ${ga.days}d`;
}
