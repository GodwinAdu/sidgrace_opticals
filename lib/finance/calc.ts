/**
 * Pure, dependency-free financial + scheduling calculations.
 *
 * These are extracted so they can be unit-tested without a database or any
 * Next/Mongoose imports. The action modules call these helpers so behavior
 * stays identical between the app and the tests.
 */

export interface LineItemInput {
    quantity?: number;
    unitPrice?: number;
}

export interface ComputedTotals<T extends LineItemInput> {
    withAmounts: (T & { amount: number })[];
    subtotal: number;
    total: number;
}

/** Invoice totals: amount per line, subtotal, and total after tax/discount. */
export function computeInvoiceTotals<T extends LineItemInput>(
    items: T[],
    tax = 0,
    discount = 0,
): ComputedTotals<T> {
    const withAmounts = (items || []).map((it) => ({
        ...it,
        amount: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    }));
    const subtotal = withAmounts.reduce((s, it) => s + it.amount, 0);
    const total = Math.max(0, subtotal + (Number(tax) || 0) - (Number(discount) || 0));
    return { withAmounts, subtotal, total };
}

export type InvoiceStatus = "unpaid" | "partial" | "paid";

/** Invoice status from how much has been paid against the total. */
export function invoiceStatusFrom(amountPaid: number, total: number): InvoiceStatus {
    const paid = Number(amountPaid) || 0;
    const balance = Math.max(0, (Number(total) || 0) - paid);
    if (paid <= 0) return "unpaid";
    if (balance <= 0) return "paid";
    return "partial";
}

/** Remaining balance on an invoice. */
export function invoiceBalance(total: number, amountPaid: number): number {
    return Math.max(0, (Number(total) || 0) - (Number(amountPaid) || 0));
}

/**
 * Whole-day bed accrual: each started day counts as one, minimum one while
 * admitted. `end` is "now" for an ongoing stay or the discharge time.
 */
export function computeBedDays(admittedAt: Date | string | number, end: Date | string | number): number {
    const start = new Date(admittedAt).getTime();
    const finish = new Date(end).getTime();
    const ms = finish - start;
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** A bed charge line amount = ward daily rate × bed-days (0 when no rate). */
export function bedChargeAmount(dailyRate: number, days: number): number {
    const rate = Number(dailyRate) || 0;
    const d = Number(days) || 0;
    if (rate <= 0 || d <= 0) return 0;
    return rate * d;
}

export interface SettleableInvoice {
    _id?: unknown;
    balance?: number;
}
export interface SettlementAllocation {
    invoiceId: unknown;
    applied: number;
}
export interface SettlementResult {
    allocations: SettlementAllocation[];
    appliedTotal: number;
    unallocated: number;
}

/**
 * Allocate a settlement amount across outstanding invoices oldest-first.
 * `invoices` MUST already be sorted oldest-first. Pays each down to zero until
 * the amount is exhausted; partial coverage is allowed.
 */
export function allocateSettlement(amount: number, invoices: SettleableInvoice[]): SettlementResult {
    let remaining = Number(amount) || 0;
    const allocations: SettlementAllocation[] = [];
    let appliedTotal = 0;

    for (const inv of invoices || []) {
        if (remaining <= 0) break;
        const balance = Number(inv.balance) || 0;
        if (balance <= 0) continue;
        const pay = Math.min(remaining, balance);
        allocations.push({ invoiceId: inv._id, applied: pay });
        remaining -= pay;
        appliedTotal += pay;
    }

    return { allocations, appliedTotal, unallocated: Math.max(0, remaining) };
}

/**
 * Insurer's claimable share of an invoice from the policy coverage percent,
 * rounded to 2 decimals. 0 when there is no coverage.
 */
export function claimCoverageAmount(invoiceTotal: number, coveragePercent: number): number {
    const total = Number(invoiceTotal) || 0;
    const pct = Number(coveragePercent) || 0;
    if (pct <= 0 || total <= 0) return 0;
    return Math.round(((total * pct) / 100) * 100) / 100;
}
