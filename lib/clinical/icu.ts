/**
 * Pure ICU-charting helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (ICU timeline view). The ICU chart is an
 * append-only series of time-stamped observations against an admission; the
 * only non-trivial pure logic is ordering those entries into a timeline and
 * summarising the latest values, both pure date/array arithmetic.
 */

/** The kinds of observation an ICU chart entry can carry. */
export type IcuEntryType = "vitals" | "ventilator" | "gcs" | "fluids" | "note";

export const ICU_ENTRY_TYPES: { value: IcuEntryType; label: string }[] = [
    { value: "vitals", label: "Vitals" },
    { value: "ventilator", label: "Ventilator settings" },
    { value: "gcs", label: "Glasgow Coma Scale" },
    { value: "fluids", label: "Fluids (in/out)" },
    { value: "note", label: "Note" },
];

/** A minimal shape of an ICU chart entry for ordering/summary (DB-agnostic). */
export interface IcuTimelineEntry {
    _id?: string;
    recordedAt?: string | Date | null;
    type?: IcuEntryType | string;
    [key: string]: unknown;
}

function toTime(value?: string | Date | null): number {
    if (!value) return Number.NaN;
    const d = new Date(value);
    const t = d.getTime();
    return Number.isNaN(t) ? Number.NaN : t;
}

/**
 * Glasgow Coma Scale total from its three components. Each is clamped to its
 * valid range (eye 1–4, verbal 1–5, motor 1–6) so an out-of-range input never
 * yields an impossible total; the standard total runs 3–15. Returns null when
 * no component is supplied.
 */
export function gcsTotal(parts: {
    eye?: number | null;
    verbal?: number | null;
    motor?: number | null;
}): number | null {
    const { eye, verbal, motor } = parts || {};
    if (eye == null && verbal == null && motor == null) return null;
    const clamp = (v: number | null | undefined, lo: number, hi: number) =>
        Math.min(hi, Math.max(lo, Number(v) || lo));
    return clamp(eye, 1, 4) + clamp(verbal, 1, 5) + clamp(motor, 1, 6);
}

/**
 * Order ICU chart entries into a timeline. Default is chronological (oldest
 * first) which is the natural reading order for a flow-sheet; pass
 * `descending` for newest-first (e.g. a feed). The sort is stable and does not
 * mutate the input array. Entries with an unusable `recordedAt` sort to the end
 * so a bad timestamp never hides valid observations.
 */
export function orderTimeline<T extends IcuTimelineEntry>(
    entries: readonly T[] | null | undefined,
    direction: "asc" | "desc" = "asc",
): T[] {
    const list = Array.isArray(entries) ? [...entries] : [];
    const sign = direction === "desc" ? -1 : 1;
    return list.sort((a, b) => {
        const ta = toTime(a?.recordedAt);
        const tb = toTime(b?.recordedAt);
        const aBad = Number.isNaN(ta);
        const bBad = Number.isNaN(tb);
        if (aBad && bBad) return 0;
        if (aBad) return 1; // bad timestamps always last
        if (bBad) return -1;
        return (ta - tb) * sign;
    });
}

/**
 * The most recent entry of each type (by `recordedAt`). Useful for a "latest
 * values" header above the full timeline. Entries with an unusable timestamp
 * are ignored for recency but still considered if nothing else exists.
 */
export function latestByType<T extends IcuTimelineEntry>(
    entries: readonly T[] | null | undefined,
): Record<string, T> {
    const out: Record<string, T> = {};
    for (const e of Array.isArray(entries) ? entries : []) {
        const key = String(e?.type || "note");
        const prev = out[key];
        if (!prev) {
            out[key] = e;
            continue;
        }
        const te = toTime(e?.recordedAt);
        const tp = toTime(prev?.recordedAt);
        // Prefer the later usable timestamp; a usable one beats an unusable one.
        if (Number.isNaN(tp) && !Number.isNaN(te)) out[key] = e;
        else if (!Number.isNaN(te) && !Number.isNaN(tp) && te >= tp) out[key] = e;
    }
    return out;
}
