/**
 * Pure, dependency-free journal-entry line builders for inventory postings.
 *
 * These helpers compute the balanced debit/credit line pairs for the two
 * inventory accounting flows — a PURCHASE (debit Inventory asset, credit
 * Accounts Payable / Cash) and a COGS relief at dispense (debit COGS, credit
 * Inventory asset) — plus the computed monetary total/amount.
 *
 * They are extracted (no DB / Mongoose / Next imports) so Properties 9–10 can be
 * property-tested without a database. The action/bridge layers resolve the real
 * `ChartAccount` ids and hand them to these builders, then post the returned
 * lines through `postLedgerEntryLines`, so the balancing math stays identical
 * between the app and the tests.
 *
 * Design: `.kiro/specs/product-accounting-and-batches/design.md` — "Posting Flows".
 *
 * Invariant: every non-null result's `lines` satisfy `isBalanced` from
 * `lib/accounting/ledger.ts` (two one-sided lines, equal positive debit/credit
 * totals). Builders return `null` when the computed total/amount is not strictly
 * positive — the caller then skips the posting (R3.6 / R10.3 best-effort).
 */

/**
 * A single journal line for the bridge. Exactly one of `debit`/`credit` is
 * positive on each line produced here. Mirrors the design's `LedgerLineInput`.
 */
export interface LedgerLineInput {
    /** Resolved `ChartAccount` _id. */
    accountId: string;
    debit?: number;
    credit?: number;
    memo?: string;
}

/** A single purchase line item used to compute the inventory-debit total. */
export interface PurchaseLineItem {
    quantity: number;
    purchasePrice: number;
    /** Per-unit discount; subtracted from `purchasePrice` before multiplying. */
    discount?: number | null;
}

/** A consumed-batch row (shape of {@link import("./batches").ConsumedBatch}). */
export interface ConsumedBatchCost {
    quantity: number;
    /** Per-unit cost; `null`/absent falls back to the product `purchasePrice`. */
    costPerUnit?: number | null;
}

/** Coerce to a finite number, or 0 for junk (NaN / Infinity / non-numeric). */
function finite(value: number | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/** Coerce to a finite, non-negative number (0 for junk/negatives). */
function nonNegative(value: number | null | undefined): number {
    const n = finite(value);
    return n > 0 ? n : 0;
}

/**
 * R3.1 / R3.7: PURCHASE total = `Σ max(0, qty × (purchasePrice − discount))` per
 * line. Negative per-line amounts are floored at zero so a discount larger than
 * the price never contributes a negative (or reversed) amount to the total.
 */
export function computePurchaseTotal(items: PurchaseLineItem[]): number {
    return (items || []).reduce((sum, item) => {
        const qty = nonNegative(item?.quantity);
        const unitNet = finite(item?.purchasePrice) - finite(item?.discount);
        return sum + Math.max(0, qty * unitNet);
    }, 0);
}

/**
 * R4.2 / R4.3 / R4.5: COGS amount = `Σ quantity × costPerUnit`, falling back to
 * `fallbackPrice` (the product `purchasePrice`) for any batch whose per-unit cost
 * is absent (`null`/`undefined`). Non-positive quantities contribute nothing.
 */
export function computeCogsAmount(
    consumed: ConsumedBatchCost[],
    fallbackPrice: number,
): number {
    const fallback = nonNegative(fallbackPrice);
    return (consumed || []).reduce((sum, row) => {
        const qty = nonNegative(row?.quantity);
        const unitCost =
            row?.costPerUnit == null ? fallback : nonNegative(row.costPerUnit);
        return sum + qty * unitCost;
    }, 0);
}

/**
 * R3.1 / R3.2 / R3.7: build the PURCHASE JE lines — debit the resolved Inventory
 * asset account, credit the resolved payable/cash account — for the computed
 * purchase total.
 *
 * Returns `{ lines, total }` with balanced one-sided lines, or `null` when the
 * computed total is not strictly positive (nothing to post).
 */
export function buildPurchaseJournalLines(args: {
    items: PurchaseLineItem[];
    inventoryAccountId: string;
    creditAccountId: string;
    memo?: string;
}): { lines: LedgerLineInput[]; total: number } | null {
    const total = computePurchaseTotal(args.items);
    if (!(total > 0)) return null;

    const lines: LedgerLineInput[] = [
        { accountId: args.inventoryAccountId, debit: total, memo: args.memo },
        { accountId: args.creditAccountId, credit: total, memo: args.memo },
    ];
    return { lines, total };
}

/**
 * R4.2 / R4.3 / R4.5: build the COGS-relief JE lines — debit the resolved COGS
 * expense account, credit the resolved Inventory asset account — for the
 * depleted-batch cost.
 *
 * Returns `{ lines, amount }` with balanced one-sided lines, or `null` when the
 * computed amount is not strictly positive (nothing to post).
 */
export function buildCogsReliefJournalLines(args: {
    consumed: ConsumedBatchCost[];
    fallbackPrice: number;
    cogsAccountId: string;
    inventoryAccountId: string;
    memo?: string;
}): { lines: LedgerLineInput[]; amount: number } | null {
    const amount = computeCogsAmount(args.consumed, args.fallbackPrice);
    if (!(amount > 0)) return null;

    const lines: LedgerLineInput[] = [
        { accountId: args.cogsAccountId, debit: amount, memo: args.memo },
        { accountId: args.inventoryAccountId, credit: amount, memo: args.memo },
    ];
    return { lines, amount };
}
