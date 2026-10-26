/**
 * Pure, dependency-free batch / lot engine for inventory products.
 *
 * These functions are extracted so they can be unit- and property-tested without
 * a database or any Next/Mongoose imports. The action modules call these helpers
 * so stock math stays identical between the app and the tests.
 *
 * Design: `.kiro/specs/product-accounting-and-batches/design.md` — "Batch engine".
 *
 * Rules enforced here:
 *  - product.quantity is the sum of batch quantities (R6.1).
 *  - FEFO depletion: earliest `expiryDate` first; no-expiry batches sort AFTER
 *    dated batches; expired batches are never consumed (R6.3, R8.4, R8.5).
 *  - All time-dependent logic takes an explicit `now: Date` — no `new Date()`
 *    inside these pure functions.
 *  - Inputs are never mutated; new arrays/objects are always returned.
 */

export interface Batch {
    batchNumber: string;
    /** ISO date string; `null` = no expiry (e.g. a legacy opening batch). */
    expiryDate: string | null;
    /** Non-negative on-hand quantity for this lot. */
    quantity: number;
    manufactureDate?: string | null;
    costPerUnit?: number | null;
    supplierId?: string | null;
    receivedAt?: string | null;
}

/** A single per-batch consumption row produced by {@link depleteFefo}. */
export interface ConsumedBatch {
    batchNumber: string;
    quantity: number;
    costPerUnit: number | null;
}

/**
 * Tagged error thrown by {@link depleteFefo} when the non-expired available
 * quantity is less than the requested amount. The `tag` lets callers detect it
 * without relying on the message string.
 */
export class InsufficientStockError extends Error {
    readonly tag = "InsufficientStockError" as const;
    readonly requested: number;
    readonly available: number;

    constructor(requested: number, available: number) {
        super(`Insufficient stock: requested ${requested}, available ${available}`);
        this.name = "InsufficientStockError";
        this.requested = requested;
        this.available = available;
        // Restore prototype chain for environments that transpile `extends Error`.
        Object.setPrototypeOf(this, InsufficientStockError.prototype);
    }
}

/** Type guard for {@link InsufficientStockError}. */
export function isInsufficientStockError(err: unknown): err is InsufficientStockError {
    return (
        err instanceof InsufficientStockError ||
        (typeof err === "object" &&
            err !== null &&
            (err as { tag?: unknown }).tag === "InsufficientStockError")
    );
}

/** Shallow copy of a batch so callers never see a mutated input object. */
function cloneBatch(b: Batch): Batch {
    return { ...b };
}

/** Parse an ISO date string to epoch ms; `null`/invalid → `null`. */
function toMs(date: string | null | undefined): number | null {
    if (date == null) return null;
    const ms = new Date(date).getTime();
    return Number.isNaN(ms) ? null : ms;
}

/** True when the batch has a dated expiry strictly in the past relative to `now`. */
function isExpired(b: Batch, now: Date): boolean {
    const expiry = toMs(b.expiryDate);
    if (expiry == null) return false; // no expiry can never be expired
    return expiry < now.getTime();
}

/**
 * R6.1: the product.quantity invariant — sum of all batch quantities.
 * Non-finite / missing quantities are treated as 0.
 */
export function sumBatchQuantity(batches: Batch[]): number {
    return (batches || []).reduce((sum, b) => {
        const q = Number(b?.quantity);
        return sum + (Number.isFinite(q) ? q : 0);
    }, 0);
}

/**
 * R7.1 / R7.2: coerce a legacy scalar quantity to a single opening batch with
 * no expiry. If `batches` already has entries, or `quantity <= 0`, the batches
 * are returned unchanged (cloned). Preserves the product total.
 */
export function coerceLegacyToOpeningBatch(quantity: number, batches: Batch[]): Batch[] {
    const existing = batches || [];
    const qty = Number(quantity) || 0;
    if (existing.length > 0 || qty <= 0) {
        return existing.map(cloneBatch);
    }
    return [
        {
            batchNumber: "OPENING",
            expiryDate: null,
            quantity: qty,
            manufactureDate: null,
            costPerUnit: null,
            supplierId: null,
            receivedAt: null,
        },
    ];
}

/**
 * FEFO comparator: earliest dated `expiryDate` first; batches with no expiry
 * sort AFTER all dated batches (so dated stock is used before open-ended stock).
 * Ties fall back to `batchNumber` for a stable, deterministic order.
 */
function fefoCompare(a: Batch, b: Batch): number {
    const ae = toMs(a.expiryDate);
    const be = toMs(b.expiryDate);
    if (ae == null && be == null) return (a.batchNumber || "").localeCompare(b.batchNumber || "");
    if (ae == null) return 1; // a has no expiry → after b
    if (be == null) return -1; // b has no expiry → after a
    if (ae !== be) return ae - be;
    return (a.batchNumber || "").localeCompare(b.batchNumber || "");
}

/**
 * R8.5: batches available for depletion — non-expired, positive quantity,
 * in FEFO order. Returns clones; input is not mutated.
 */
export function availableForFefo(batches: Batch[], now: Date): Batch[] {
    return (batches || [])
        .filter((b) => (Number(b?.quantity) || 0) > 0 && !isExpired(b, now))
        .map(cloneBatch)
        .sort(fefoCompare);
}

/**
 * R6.3 / R6.4 / R8.4: deplete `qty` units in FEFO order over NON-EXPIRED batches
 * only. Returns the updated batch list (same length/order as input, with reduced
 * quantities) plus a per-batch `consumed` breakdown (with `costPerUnit`) for COGS.
 *
 * Throws {@link InsufficientStockError} when the non-expired available quantity is
 * less than `qty`; in that case the caller's batches are left conceptually
 * unchanged (nothing is mutated and no partial result is returned).
 */
export function depleteFefo(
    batches: Batch[],
    qty: number,
    now: Date,
): { batches: Batch[]; consumed: ConsumedBatch[] } {
    const request = Number(qty) || 0;
    const source = batches || [];

    if (request <= 0) {
        return { batches: source.map(cloneBatch), consumed: [] };
    }

    const available = sumBatchQuantity(availableForFefo(source, now));
    if (available < request) {
        throw new InsufficientStockError(request, available);
    }

    // Build the FEFO consumption order over indices of non-expired, positive batches.
    const order = source
        .map((b, index) => ({ b, index }))
        .filter(({ b }) => (Number(b?.quantity) || 0) > 0 && !isExpired(b, now))
        .sort((x, y) => fefoCompare(x.b, y.b));

    const result = source.map(cloneBatch);
    const consumed: ConsumedBatch[] = [];
    let remaining = request;

    for (const { index } of order) {
        if (remaining <= 0) break;
        const batch = result[index];
        const take = Math.min(Number(batch.quantity) || 0, remaining);
        if (take <= 0) continue;
        batch.quantity = (Number(batch.quantity) || 0) - take;
        remaining -= take;
        consumed.push({
            batchNumber: batch.batchNumber,
            quantity: take,
            costPerUnit: batch.costPerUnit ?? null,
        });
    }

    return { batches: result, consumed };
}

/**
 * R6.3 restore: add `qty` units back (used when a dispensed quantity decreases).
 *
 * Prefers to top up a matching batch — by `hint.batchNumber` when supplied,
 * otherwise the most-recently-expiring dated batch, otherwise the first batch.
 * When there is nothing to top up (empty list), a new restore batch is created
 * using the optional `hint` for its lot metadata.
 */
export function restoreStock(batches: Batch[], qty: number, hint?: Partial<Batch>): Batch[] {
    const source = batches || [];
    const amount = Number(qty) || 0;
    const result = source.map(cloneBatch);

    if (amount <= 0) return result;

    // 1) Explicit hint by batch number.
    if (hint?.batchNumber) {
        const idx = result.findIndex((b) => b.batchNumber === hint.batchNumber);
        if (idx >= 0) {
            result[idx].quantity = (Number(result[idx].quantity) || 0) + amount;
            return result;
        }
    }

    // 2) Top up an existing batch (latest-expiring dated batch preferred).
    if (result.length > 0) {
        let targetIdx = 0;
        let bestExpiry = -Infinity;
        let foundDated = false;
        for (let i = 0; i < result.length; i++) {
            const e = toMs(result[i].expiryDate);
            if (e != null && e > bestExpiry) {
                bestExpiry = e;
                targetIdx = i;
                foundDated = true;
            }
        }
        if (!foundDated) targetIdx = 0;
        result[targetIdx].quantity = (Number(result[targetIdx].quantity) || 0) + amount;
        return result;
    }

    // 3) Nothing to top up — create a new restore batch from the hint.
    result.push({
        batchNumber: hint?.batchNumber ?? "RESTORED",
        expiryDate: hint?.expiryDate ?? null,
        quantity: amount,
        manufactureDate: hint?.manufactureDate ?? null,
        costPerUnit: hint?.costPerUnit ?? null,
        supplierId: hint?.supplierId ?? null,
        receivedAt: hint?.receivedAt ?? null,
    });
    return result;
}

/**
 * R8.1 / R8.2 / R8.3: classify batches relative to `now` and a near-expiry
 * `thresholdDays` window (default 90 days).
 *
 *  - `expired`:    `expiryDate` strictly in the past.
 *  - `nearExpiry`: NOT expired AND `expiryDate` within `thresholdDays` from now.
 *
 * A batch never appears in both sets. Batches with no expiry are in neither set.
 * Returns clones; input is not mutated.
 */
export function classifyExpiry(
    batches: Batch[],
    now: Date,
    thresholdDays = 90,
): { expired: Batch[]; nearExpiry: Batch[] } {
    const nowMs = now.getTime();
    const windowMs = (Number(thresholdDays) || 0) * 24 * 60 * 60 * 1000;
    const horizon = nowMs + windowMs;

    const expired: Batch[] = [];
    const nearExpiry: Batch[] = [];

    for (const b of batches || []) {
        const expiry = toMs(b.expiryDate);
        if (expiry == null) continue; // no expiry → neither bucket
        if (expiry < nowMs) {
            expired.push(cloneBatch(b));
        } else if (expiry <= horizon) {
            nearExpiry.push(cloneBatch(b));
        }
    }

    return { expired, nearExpiry };
}
