/**
 * Pure queue / bed-transfer-approval helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (queue display view). Two small state
 * machines live here:
 *
 *  1. QueueTicket — a token issued at a service point (OPD / pharmacy / lab).
 *     A ticket moves through:
 *
 *        waiting ──▶ called ──▶ serving ──▶ done
 *           └────────────────────────────▶ skipped (terminal)
 *
 *     `done` and `skipped` are terminal; `called` and `serving` are the active
 *     states a display screen highlights. Ordering on the display is by status
 *     bucket (serving/called first) then by token number ascending.
 *
 *  2. BedTransfer — a requested ward/bed move that must be approved before the
 *     physical bed swap happens:
 *
 *        pending-approval ──▶ approved (the move then completes)
 *               └───────────▶ rejected (terminal)
 *
 * The transition tables are the single source of truth for what the UI offers
 * and what the write actions allow, so an invalid move can never be persisted.
 */

/* ════════════════════════════════ QUEUE ═════════════════════════════════ */

/** The service points that issue queue tokens. */
export type QueueService = "opd" | "pharmacy" | "lab";

export const QUEUE_SERVICES: { value: QueueService; label: string }[] = [
    { value: "opd", label: "OPD / Consultation" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "lab", label: "Laboratory" },
];

/** True when `value` is one of the recognised queue services. */
export function isValidQueueService(value?: string | null): value is QueueService {
    return value === "opd" || value === "pharmacy" || value === "lab";
}

/** The queue-ticket lifecycle statuses. */
export type QueueStatus = "waiting" | "called" | "serving" | "done" | "skipped";

export const QUEUE_STATUSES: { value: QueueStatus; label: string }[] = [
    { value: "waiting", label: "Waiting" },
    { value: "called", label: "Called" },
    { value: "serving", label: "Serving" },
    { value: "done", label: "Done" },
    { value: "skipped", label: "Skipped" },
];

/**
 * Allowed ticket status transitions. A waiting ticket can be called or skipped;
 * a called ticket can start serving, be skipped, or recalled (stay called); a
 * serving ticket can finish (done) or be skipped. `done` and `skipped` are
 * terminal. A called ticket may also drop back to waiting (requeue).
 */
const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
    waiting: ["called", "skipped"],
    called: ["serving", "waiting", "skipped"],
    serving: ["done", "skipped"],
    done: [],
    skipped: [],
};

/** True when `from → to` is an allowed ticket status transition. */
export function canTransitionTicket(from: QueueStatus, to: QueueStatus): boolean {
    if (from === to) return false;
    return (QUEUE_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses a ticket in `from` may legally move to (for building the UI). */
export function nextTicketStatuses(from: QueueStatus): QueueStatus[] {
    return [...(QUEUE_TRANSITIONS[from] ?? [])];
}

/** True when the ticket has reached a terminal state (no further moves). */
export function isTerminalTicket(status: QueueStatus): boolean {
    return (QUEUE_TRANSITIONS[status] ?? []).length === 0;
}

/** True when the ticket is still live (not done / skipped) — shown on the board. */
export function isActiveTicket(status: QueueStatus): boolean {
    return status === "waiting" || status === "called" || status === "serving";
}

/**
 * The next token number for a service's day given the numbers already issued.
 * Numbers restart at 1 each day per service, so the caller passes the set of
 * numbers issued for that service today. The next number is one past the
 * current max (never reusing a gap), with 1 for an empty day.
 */
export function nextTicketNumber(issuedToday: number[]): number {
    let max = 0;
    for (const n of issuedToday) {
        if (Number.isFinite(n) && n > max) max = n;
    }
    return max + 1;
}

/** Display priority: serving first, then called, then waiting, then the rest. */
const QUEUE_SORT_RANK: Record<QueueStatus, number> = {
    serving: 0,
    called: 1,
    waiting: 2,
    done: 3,
    skipped: 4,
};

interface QueueOrderable {
    status: QueueStatus;
    number: number;
}

/**
 * Order tickets for the display screen: by status bucket (serving → called →
 * waiting → done → skipped) then by token number ascending within a bucket.
 * Returns a new array; the input is not mutated.
 */
export function orderQueueForDisplay<T extends QueueOrderable>(tickets: T[]): T[] {
    return [...tickets].sort((a, b) => {
        const ra = QUEUE_SORT_RANK[a.status] ?? 99;
        const rb = QUEUE_SORT_RANK[b.status] ?? 99;
        if (ra !== rb) return ra - rb;
        return a.number - b.number;
    });
}

/* ═══════════════════════════ BED TRANSFER APPROVAL ══════════════════════════ */

/**
 * A requested bed transfer moves through a tiny approval workflow before the
 * physical bed swap on the admission is performed.
 */
export type BedTransferStatus = "pending-approval" | "approved" | "rejected";

export const BED_TRANSFER_STATUSES: { value: BedTransferStatus; label: string }[] = [
    { value: "pending-approval", label: "Pending approval" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
];

/**
 * Allowed bed-transfer transitions. A pending request can be approved or
 * rejected; approved and rejected are terminal.
 */
const BED_TRANSFER_TRANSITIONS: Record<BedTransferStatus, BedTransferStatus[]> = {
    "pending-approval": ["approved", "rejected"],
    approved: [],
    rejected: [],
};

/** True when `from → to` is an allowed bed-transfer status transition. */
export function canTransitionBedTransfer(from: BedTransferStatus, to: BedTransferStatus): boolean {
    if (from === to) return false;
    return (BED_TRANSFER_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses a transfer in `from` may legally move to (for building the UI). */
export function nextBedTransferStatuses(from: BedTransferStatus): BedTransferStatus[] {
    return [...(BED_TRANSFER_TRANSITIONS[from] ?? [])];
}

/** True when the transfer request has reached a terminal state. */
export function isTerminalBedTransfer(status: BedTransferStatus): boolean {
    return (BED_TRANSFER_TRANSITIONS[status] ?? []).length === 0;
}
