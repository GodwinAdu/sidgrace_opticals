/**
 * Pure procurement helpers.
 *
 * Kept free of DB / React so the status machines and the GRN reconciliation
 * math can be unit-tested in isolation and shared between the server actions
 * and the procurement view. The procurement flow is:
 *
 *   Requisition:  draft ──▶ submitted ──▶ approved ──┐
 *                    └───────────────────▶ rejected  │ (terminal)
 *                                                     ▼
 *   PurchaseOrder (only from an APPROVED requisition):
 *                 draft ──▶ ordered ──▶ received ──┐
 *                    └──────────────────▶ cancelled (terminal)
 *
 *   Grn: a goods-receipt note against a PO. Each received line is reconciled
 *   against the quantity ordered so over/under-receipts are visible, and the
 *   received quantity increments inventory stock (handled in the action).
 *
 * The transition tables are the single source of truth for what the UI offers
 * and what the write actions allow, so an invalid move can never be persisted.
 */

/* ─────────────────────────── Requisition status ─────────────────────────── */

/** Requisition workflow statuses. A requisition must be approved before a PO. */
export type RequisitionStatus = "draft" | "submitted" | "approved" | "rejected";

export const REQUISITION_STATUSES: { value: RequisitionStatus; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
];

/**
 * Allowed requisition transitions. A draft may be submitted (or cancelled back
 * is not allowed — draft is editable instead); a submitted requisition is the
 * approval gate (approve/reject); approved and rejected are terminal.
 */
const REQUISITION_TRANSITIONS: Record<RequisitionStatus, RequisitionStatus[]> = {
    draft: ["submitted"],
    submitted: ["approved", "rejected"],
    approved: [],
    rejected: [],
};

/** True when `from → to` is an allowed requisition status transition. */
export function canTransitionRequisition(from: RequisitionStatus, to: RequisitionStatus): boolean {
    if (from === to) return false;
    return (REQUISITION_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses a requisition in `from` may legally move to (for building UI). */
export function nextRequisitionStatuses(from: RequisitionStatus): RequisitionStatus[] {
    return [...(REQUISITION_TRANSITIONS[from] ?? [])];
}

/** True when the requisition has reached a terminal state (no further moves). */
export function isTerminalRequisition(status: RequisitionStatus): boolean {
    return (REQUISITION_TRANSITIONS[status] ?? []).length === 0;
}

/**
 * True only when a requisition is approved. This is the gate the PO-issue
 * action enforces: a purchase order can only be raised from an approved
 * requisition (Requirement 10, criterion 1).
 */
export function canIssuePurchaseOrder(status: RequisitionStatus): boolean {
    return status === "approved";
}

/* ───────────────────────── Purchase order status ────────────────────────── */

/** Purchase-order workflow statuses. */
export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export const PURCHASE_ORDER_STATUSES: { value: PurchaseOrderStatus; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "ordered", label: "Ordered" },
    { value: "received", label: "Received" },
    { value: "cancelled", label: "Cancelled" },
];

/**
 * Allowed PO transitions. A draft PO may be issued (ordered) or cancelled; an
 * ordered PO may be received (via a GRN) or cancelled; received and cancelled
 * are terminal.
 */
const PURCHASE_ORDER_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    draft: ["ordered", "cancelled"],
    ordered: ["received", "cancelled"],
    received: [],
    cancelled: [],
};

/** True when `from → to` is an allowed purchase-order status transition. */
export function canTransitionPurchaseOrder(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
    if (from === to) return false;
    return (PURCHASE_ORDER_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses a PO in `from` may legally move to (for building the UI). */
export function nextPurchaseOrderStatuses(from: PurchaseOrderStatus): PurchaseOrderStatus[] {
    return [...(PURCHASE_ORDER_TRANSITIONS[from] ?? [])];
}

/** True when the PO has reached a terminal state (no further moves). */
export function isTerminalPurchaseOrder(status: PurchaseOrderStatus): boolean {
    return (PURCHASE_ORDER_TRANSITIONS[status] ?? []).length === 0;
}

/**
 * True when a GRN may be received against a PO in this status. Only an ordered
 * PO can take delivery; a draft PO has not been issued and a received/cancelled
 * PO is closed.
 */
export function canReceiveGrn(status: PurchaseOrderStatus): boolean {
    return status === "ordered";
}

/* ──────────────────────────── GRN reconciliation ────────────────────────── */

/** A single ordered line on a purchase order. */
export interface OrderedLine {
    productId: string;
    quantity: number;
}

/** A single received line on a goods-receipt note. */
export interface ReceivedLine {
    productId: string;
    quantity: number;
}

/** Per-line reconciliation of received-vs-ordered quantities. */
export interface ReconciledLine {
    productId: string;
    ordered: number;
    received: number;
    /** received − ordered: negative = short-shipped, positive = over-received. */
    variance: number;
}

const toQty = (n: unknown): number => {
    const q = Number(n);
    return Number.isFinite(q) && q > 0 ? q : 0;
};

/**
 * Reconcile the quantities received on a GRN against the quantities ordered on
 * its PO. The result lists every ordered product plus any extra product that
 * only appears on the receipt, so over- and under-receipts are both visible.
 *
 * `variance = received − ordered`: 0 is an exact match, negative is a
 * short-shipment, positive is an over-receipt.
 */
export function reconcileGrn(ordered: OrderedLine[], received: ReceivedLine[]): ReconciledLine[] {
    const orderedMap = new Map<string, number>();
    for (const line of ordered ?? []) {
        if (!line?.productId) continue;
        orderedMap.set(line.productId, (orderedMap.get(line.productId) ?? 0) + toQty(line.quantity));
    }

    const receivedMap = new Map<string, number>();
    for (const line of received ?? []) {
        if (!line?.productId) continue;
        receivedMap.set(line.productId, (receivedMap.get(line.productId) ?? 0) + toQty(line.quantity));
    }

    // Union of product ids, preserving ordered-first ordering then any extras.
    const ids: string[] = [];
    for (const id of orderedMap.keys()) ids.push(id);
    for (const id of receivedMap.keys()) if (!orderedMap.has(id)) ids.push(id);

    return ids.map((productId) => {
        const o = orderedMap.get(productId) ?? 0;
        const r = receivedMap.get(productId) ?? 0;
        return { productId, ordered: o, received: r, variance: r - o };
    });
}

/** True when every ordered line was received in exactly the ordered quantity. */
export function isFullyReceived(ordered: OrderedLine[], received: ReceivedLine[]): boolean {
    const lines = reconcileGrn(ordered, received);
    if (lines.length === 0) return false;
    return lines.every((l) => l.variance === 0);
}

/** Sum of all positive received quantities on a GRN (the stock increment). */
export function totalReceivedQuantity(received: ReceivedLine[]): number {
    return (received ?? []).reduce((sum, l) => sum + toQty(l?.quantity), 0);
}
