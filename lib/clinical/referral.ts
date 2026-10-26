/**
 * Pure referral helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (referrals view). A referral captures a
 * direction (a patient referred IN to this facility, or OUT to another) and
 * moves through a small workflow:
 *
 *   pending ──▶ accepted ──▶ completed
 *      └──────▶ declined (terminal)
 *      └──────▶ cancelled (terminal)
 *
 * `accepted` and `completed` are the happy path; `declined` and `cancelled` are
 * terminal early exits. The transition table is the single source of truth for
 * what the UI offers and what the write action allows, so an invalid move can
 * never be persisted.
 */

/* ──────────────────────────────── Direction ─────────────────────────────── */

/** Whether the patient is being referred in to, or out of, this facility. */
export type ReferralDirection = "in" | "out";

export const REFERRAL_DIRECTIONS: { value: ReferralDirection; label: string }[] = [
    { value: "in", label: "Inbound (referred to us)" },
    { value: "out", label: "Outbound (referred elsewhere)" },
];

/** True when `value` is one of the two recognised referral directions. */
export function isValidDirection(value?: string | null): value is ReferralDirection {
    return value === "in" || value === "out";
}

/* ──────────────────────────────── Status ────────────────────────────────── */

/** The referral workflow statuses. */
export type ReferralStatus =
    | "pending"
    | "accepted"
    | "declined"
    | "completed"
    | "cancelled";

export const REFERRAL_STATUSES: { value: ReferralStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "declined", label: "Declined" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

/**
 * Allowed status transitions. A pending referral may be accepted, declined or
 * cancelled; an accepted referral may be completed or cancelled; declined,
 * completed and cancelled are terminal.
 */
const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
    pending: ["accepted", "declined", "cancelled"],
    accepted: ["completed", "cancelled"],
    declined: [],
    completed: [],
    cancelled: [],
};

/** True when `from → to` is an allowed referral status transition. */
export function canTransitionReferral(from: ReferralStatus, to: ReferralStatus): boolean {
    if (from === to) return false;
    return (REFERRAL_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses a referral in `from` may legally move to (for building the UI). */
export function nextReferralStatuses(from: ReferralStatus): ReferralStatus[] {
    return [...(REFERRAL_TRANSITIONS[from] ?? [])];
}

/** True when the referral has reached a terminal state (no further moves). */
export function isTerminalReferral(status: ReferralStatus): boolean {
    return (REFERRAL_TRANSITIONS[status] ?? []).length === 0;
}
