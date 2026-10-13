/**
 * Pure equipment / biomedical-asset helpers.
 *
 * Kept free of DB / React so the asset status machine and the maintenance
 * due/overdue computation can be unit-tested in isolation and shared between
 * the server actions and the asset-register view.
 *
 * An `Asset` is a piece of equipment with a human-readable tag, a location
 * (ward / department) and an operational status:
 *
 *   active ──▶ maintenance ──▶ active        (serviced, back in use)
 *      │           └──────────▶ retired      (beyond repair)
 *      └──────────────────────▶ retired      (decommissioned, terminal)
 *
 * A `MaintenanceRecord` carries a schedule interval and the last-serviced date,
 * from which the next-due date and a due/overdue status are COMPUTED (never
 * stored as the source of truth) so the register always reflects "now".
 */

/* ────────────────────────────── Asset status ────────────────────────────── */

/** Operational status of an asset. */
export type AssetStatus = "active" | "maintenance" | "retired";

export const ASSET_STATUSES: { value: AssetStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "maintenance", label: "Under Maintenance" },
    { value: "retired", label: "Retired" },
];

/**
 * Allowed asset status transitions. An active asset may go into maintenance or
 * be retired; an asset under maintenance may return to active or be retired;
 * retired is terminal.
 */
const ASSET_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
    active: ["maintenance", "retired"],
    maintenance: ["active", "retired"],
    retired: [],
};

/** True when `from → to` is an allowed asset status transition. */
export function canTransitionAsset(from: AssetStatus, to: AssetStatus): boolean {
    if (from === to) return false;
    return (ASSET_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses an asset in `from` may legally move to (for building the UI). */
export function nextAssetStatuses(from: AssetStatus): AssetStatus[] {
    return [...(ASSET_TRANSITIONS[from] ?? [])];
}

/** True when the asset has reached a terminal state (no further moves). */
export function isTerminalAsset(status: AssetStatus): boolean {
    return (ASSET_TRANSITIONS[status] ?? []).length === 0;
}

/** True when `value` is a recognised asset status. */
export function isValidAssetStatus(value?: string | null): value is AssetStatus {
    return value === "active" || value === "maintenance" || value === "retired";
}

/* ───────────────────────── Maintenance scheduling ───────────────────────── */

/** Computed maintenance state relative to a reference "now". */
export type MaintenanceState = "ok" | "due" | "overdue" | "unscheduled";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalise any date-ish input to epoch ms, or null when invalid. */
function toTime(value?: Date | string | number | null): number | null {
    if (value === null || value === undefined) return null;
    const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
}

/** Normalise a schedule interval (in days) to a positive integer, or 0. */
function toIntervalDays(value?: unknown): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Compute the next-due date for a maintenance schedule.
 *
 * The next-due date is `lastServiced + intervalDays`. When the asset has never
 * been serviced, the schedule is anchored on `createdAt` (or, failing that, the
 * reference `now`) so a brand-new asset still gets a first-due date instead of
 * being treated as permanently due.
 *
 * Returns `null` when there is no positive interval (i.e. maintenance is not
 * scheduled for this asset).
 */
export function computeNextDue(
    intervalDays?: unknown,
    lastServiced?: Date | string | number | null,
    anchor?: Date | string | number | null,
): Date | null {
    const interval = toIntervalDays(intervalDays);
    if (interval <= 0) return null;
    const base = toTime(lastServiced) ?? toTime(anchor);
    if (base === null) return null;
    return new Date(base + interval * MS_PER_DAY);
}

/**
 * Whole days until the next maintenance is due, relative to `now`.
 *
 * Positive = that many days remain, 0 = due today, negative = that many days
 * overdue. Returns `null` when maintenance is not scheduled.
 */
export function daysUntilDue(
    intervalDays?: unknown,
    lastServiced?: Date | string | number | null,
    now: Date | string | number = new Date(),
    anchor?: Date | string | number | null,
): number | null {
    const nextDue = computeNextDue(intervalDays, lastServiced, anchor);
    const nowTime = toTime(now);
    if (nextDue === null || nowTime === null) return null;
    // Compare on whole-day boundaries so "due today" is 0, not a fractional day.
    const nextDay = Math.floor(nextDue.getTime() / MS_PER_DAY);
    const nowDay = Math.floor(nowTime / MS_PER_DAY);
    return nextDay - nowDay;
}

/**
 * Classify a maintenance schedule as ok / due / overdue / unscheduled relative
 * to `now`.
 *
 * - `unscheduled` — no positive interval (no maintenance planned).
 * - `overdue`     — the next-due date is strictly in the past.
 * - `due`         — the next-due date falls within `dueWindowDays` of now
 *                   (defaults to 7 days, i.e. "due soon").
 * - `ok`          — otherwise (comfortably in the future).
 */
export function maintenanceState(
    intervalDays?: unknown,
    lastServiced?: Date | string | number | null,
    now: Date | string | number = new Date(),
    dueWindowDays = 7,
    anchor?: Date | string | number | null,
): MaintenanceState {
    const days = daysUntilDue(intervalDays, lastServiced, now, anchor);
    if (days === null) return "unscheduled";
    if (days < 0) return "overdue";
    const window = Number.isFinite(Number(dueWindowDays)) && Number(dueWindowDays) >= 0
        ? Math.floor(Number(dueWindowDays))
        : 7;
    if (days <= window) return "due";
    return "ok";
}

/** True when maintenance is strictly overdue (next-due date in the past). */
export function isOverdue(
    intervalDays?: unknown,
    lastServiced?: Date | string | number | null,
    now: Date | string | number = new Date(),
    anchor?: Date | string | number | null,
): boolean {
    return maintenanceState(intervalDays, lastServiced, now, 0, anchor) === "overdue";
}

/** True when maintenance is due soon or already overdue (needs attention). */
export function isDueOrOverdue(
    intervalDays?: unknown,
    lastServiced?: Date | string | number | null,
    now: Date | string | number = new Date(),
    dueWindowDays = 7,
    anchor?: Date | string | number | null,
): boolean {
    const state = maintenanceState(intervalDays, lastServiced, now, dueWindowDays, anchor);
    return state === "due" || state === "overdue";
}
