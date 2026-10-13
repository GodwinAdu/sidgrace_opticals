/**
 * Pure Operating-theatre / surgery helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (OR schedule view). The only non-trivial
 * pure logic is the slot-conflict check that prevents double-booking a theatre:
 * two cases in the same theatre whose time windows overlap collide.
 */

/** Surgery case statuses, in lifecycle order. */
export type SurgeryStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export const SURGERY_STATUSES: { value: SurgeryStatus; label: string }[] = [
    { value: "scheduled", label: "Scheduled" },
    { value: "in-progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

/** Default booking length (minutes) when a procedure gives no duration. */
export const DEFAULT_SURGERY_DURATION_MIN = 60;

/** Minimal shape the slot-conflict checker cares about. */
export interface SurgeryBookingLike {
    _id?: string;
    theatreId?: string | null;
    scheduledAt?: string | Date | null;
    durationMinutes?: number | null;
    status?: string;
}

function toMs(value?: string | Date | null): number {
    if (!value) return NaN;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? NaN : t;
}

function sameTheatre(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return String(a) === String(b);
}

/**
 * The half-open window [start, end) for a booking, in epoch ms. A zero/invalid
 * duration falls back to the default so a booking always occupies some time.
 * Returns null when the start time is unusable.
 */
export function bookingWindow(
    booking: SurgeryBookingLike,
): { start: number; end: number } | null {
    const start = toMs(booking.scheduledAt);
    if (Number.isNaN(start)) return null;
    const mins = Number(booking.durationMinutes);
    const duration = Number.isFinite(mins) && mins > 0 ? mins : DEFAULT_SURGERY_DURATION_MIN;
    return { start, end: start + duration * 60_000 };
}

/**
 * Do two bookings overlap in time? Uses half-open intervals so a case ending at
 * exactly 10:00 does NOT clash with one starting at 10:00 (back-to-back is fine).
 * Time-only — does not consider the theatre; callers pair it with `sameTheatre`.
 */
export function windowsOverlap(a: SurgeryBookingLike, b: SurgeryBookingLike): boolean {
    const wa = bookingWindow(a);
    const wb = bookingWindow(b);
    if (!wa || !wb) return false;
    return wa.start < wb.end && wb.start < wa.end;
}

/**
 * Does a proposed booking collide with any existing one? A collision requires
 * the SAME theatre, overlapping time windows, and an active (not cancelled)
 * existing case. Cancelled cases free their slot. A booking never conflicts
 * with itself (matched by `_id`), so editing an existing case is safe.
 *
 * Returns the first conflicting booking, or null when the slot is free.
 */
export function findSlotConflict<T extends SurgeryBookingLike>(
    proposed: SurgeryBookingLike,
    existing: T[],
): T | null {
    const proposedWindow = bookingWindow(proposed);
    if (!proposedWindow) return null; // nothing to place → nothing to clash with
    for (const other of existing || []) {
        if (!other) continue;
        if (proposed._id && other._id && String(proposed._id) === String(other._id)) continue;
        if (String(other.status) === "cancelled") continue;
        if (!sameTheatre(proposed.theatreId, other.theatreId)) continue;
        if (windowsOverlap(proposed, other)) return other;
    }
    return null;
}

/** Convenience boolean wrapper around `findSlotConflict`. */
export function hasSlotConflict(
    proposed: SurgeryBookingLike,
    existing: SurgeryBookingLike[],
): boolean {
    return findSlotConflict(proposed, existing) !== null;
}
