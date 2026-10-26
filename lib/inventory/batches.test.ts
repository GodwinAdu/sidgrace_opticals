import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    sumBatchQuantity,
    coerceLegacyToOpeningBatch,
    availableForFefo,
    depleteFefo,
    restoreStock,
    classifyExpiry,
    isInsufficientStockError,
    type Batch,
} from "./batches";

const RUNS = 200; // >= 100 iterations per the design's property-test minimum.

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2024-06-15T00:00:00.000Z");

/** Days offset from NOW → ISO date string (positive = future, negative = past). */
function isoFromNow(offsetDays: number): string {
    return new Date(NOW.getTime() + offsetDays * DAY_MS).toISOString();
}

/**
 * Arbitrary batch. `expiryOffsetDays` ranges across both past (expired) and
 * future, with a chance of `null` (no expiry).
 */
const batchArb = (opts?: { minQty?: number }): fc.Arbitrary<Batch> =>
    fc.record({
        batchNumber: fc.string({ minLength: 1, maxLength: 6 }),
        expiryDate: fc.option(
            fc.integer({ min: -400, max: 400 }).map((d) => isoFromNow(d)),
            { nil: null },
        ),
        quantity: fc.integer({ min: opts?.minQty ?? 0, max: 500 }),
        costPerUnit: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: null }),
    });

/** Make batch numbers unique so FEFO ties are deterministic across the list. */
function withUniqueBatchNumbers(batches: Batch[]): Batch[] {
    return batches.map((b, i) => ({ ...b, batchNumber: `${b.batchNumber}#${i}` }));
}

const batchListArb = fc
    .array(batchArb(), { maxLength: 12 })
    .map(withUniqueBatchNumbers);

// Feature: product-accounting-and-batches, Property 1: quantity equals sum of batches after any create/update/deplete/restore.
describe("Property 1: quantity equals sum of batches", () => {
    it("sum invariant holds after deplete and restore operations", () => {
        fc.assert(
            fc.property(batchListArb, fc.integer({ min: 0, max: 600 }), (batches, qty) => {
                const available = sumBatchQuantity(availableForFefo(batches, NOW));
                if (qty > available) return; // over-request handled by Property 3

                const depleted = depleteFefo(batches, qty, NOW).batches;
                // The sum of the depleted list equals its own batches' sum (invariant).
                expect(sumBatchQuantity(depleted)).toBe(
                    depleted.reduce((s, b) => s + b.quantity, 0),
                );
                // Depletion removed exactly `qty` from the total.
                expect(sumBatchQuantity(depleted)).toBe(sumBatchQuantity(batches) - qty);

                // Restore puts the same qty back into the total.
                const restored = restoreStock(depleted, qty);
                expect(sumBatchQuantity(restored)).toBe(sumBatchQuantity(batches));
            }),
            { numRuns: RUNS },
        );
    });
});

// Feature: product-accounting-and-batches, Property 2: FEFO depletion is quantity-conserving and ordered.
describe("Property 2: FEFO depletion is quantity-conserving and ordered", () => {
    it("reduces non-expired available by exactly qty and respects FEFO order", () => {
        fc.assert(
            fc.property(batchListArb, fc.integer({ min: 0, max: 600 }), (batches, rawQty) => {
                const availBefore = availableForFefo(batches, NOW);
                const availTotal = sumBatchQuantity(availBefore);
                const qty = availTotal === 0 ? 0 : rawQty % (availTotal + 1); // keep qty <= available

                const { batches: after, consumed } = depleteFefo(batches, qty, NOW);

                // Quantity-conserving: non-expired available drops by exactly qty.
                const availAfter = sumBatchQuantity(availableForFefo(after, NOW));
                expect(availAfter).toBe(availTotal - qty);

                // Consumed total equals qty.
                const consumedTotal = consumed.reduce((s, c) => s + c.quantity, 0);
                expect(consumedTotal).toBe(qty);

                // Ordered: a later-expiring batch is only touched once all earlier
                // ones are exhausted. Verify by replaying FEFO order: each consumed
                // batch (except possibly the last) must be fully drained.
                const orderIndex = new Map(
                    availBefore.map((b, i) => [b.batchNumber, i] as const),
                );
                for (let i = 0; i < consumed.length - 1; i++) {
                    const bn = consumed[i].batchNumber;
                    const origQty = availBefore.find((b) => b.batchNumber === bn)!.quantity;
                    // A non-last consumed batch must be fully consumed.
                    expect(consumed[i].quantity).toBe(origQty);
                    // And it must precede the next consumed batch in FEFO order.
                    expect(orderIndex.get(bn)!).toBeLessThan(
                        orderIndex.get(consumed[i + 1].batchNumber)!,
                    );
                }
            }),
            { numRuns: RUNS },
        );
    });
});

// Feature: product-accounting-and-batches, Property 3: over-request throws insufficient-stock and leaves batches unchanged.
describe("Property 3: over-request is rejected and leaves batches unchanged", () => {
    it("throws InsufficientStockError without mutating the input when qty > available", () => {
        fc.assert(
            fc.property(batchListArb, fc.integer({ min: 1, max: 50 }), (batches, over) => {
                const available = sumBatchQuantity(availableForFefo(batches, NOW));
                const qty = available + over; // strictly greater than available

                const snapshot = JSON.stringify(batches);
                expect(() => depleteFefo(batches, qty, NOW)).toThrow();
                try {
                    depleteFefo(batches, qty, NOW);
                } catch (err) {
                    expect(isInsufficientStockError(err)).toBe(true);
                }
                // Input list is not mutated.
                expect(JSON.stringify(batches)).toBe(snapshot);
            }),
            { numRuns: RUNS },
        );
    });
});

// Feature: product-accounting-and-batches, Property 4: expired batches are never depleted.
describe("Property 4: expired batches are never depleted", () => {
    it("never consumes units from a batch whose expiryDate is in the past", () => {
        // Guarantee at least one expired batch is present.
        const listWithExpired = fc
            .tuple(
                fc.record({
                    batchNumber: fc.constant("EXP"),
                    expiryDate: fc.integer({ min: -400, max: -1 }).map((d) => isoFromNow(d)),
                    quantity: fc.integer({ min: 1, max: 500 }),
                    costPerUnit: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: null }),
                }),
                fc.array(batchArb({ minQty: 1 }), { maxLength: 10 }),
            )
            .map(([expired, rest]) => withUniqueBatchNumbers([expired, ...rest]));

        fc.assert(
            fc.property(listWithExpired, fc.integer({ min: 0, max: 600 }), (batches, qty) => {
                const available = sumBatchQuantity(availableForFefo(batches, NOW));
                if (qty > available) return;

                const { consumed } = depleteFefo(batches, qty, NOW);
                const expiredNumbers = new Set(
                    batches
                        .filter((b) => b.expiryDate != null && new Date(b.expiryDate).getTime() < NOW.getTime())
                        .map((b) => b.batchNumber),
                );
                for (const c of consumed) {
                    expect(expiredNumbers.has(c.batchNumber)).toBe(false);
                }
            }),
            { numRuns: RUNS },
        );
    });
});

// Feature: product-accounting-and-batches, Property 5: deplete-then-restore round-trips total quantity.
describe("Property 5: deplete-then-restore round-trips total quantity", () => {
    it("restoring the depleted qty returns the total to its original value", () => {
        fc.assert(
            fc.property(batchListArb, fc.integer({ min: 0, max: 600 }), (batches, rawQty) => {
                const available = sumBatchQuantity(availableForFefo(batches, NOW));
                const qty = available === 0 ? 0 : rawQty % (available + 1);
                const original = sumBatchQuantity(batches);

                const depleted = depleteFefo(batches, qty, NOW).batches;
                const restored = restoreStock(depleted, qty);

                expect(sumBatchQuantity(restored)).toBe(original);
            }),
            { numRuns: RUNS },
        );
    });
});

// Feature: product-accounting-and-batches, Property 6: legacy coercion preserves total quantity.
describe("Property 6: legacy coercion preserves total quantity", () => {
    it("yields a single no-expiry batch equal to a positive legacy scalar", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 100000 }), (quantity) => {
                const result = coerceLegacyToOpeningBatch(quantity, []);
                expect(result).toHaveLength(1);
                expect(result[0].expiryDate).toBeNull();
                expect(result[0].quantity).toBe(quantity);
                expect(sumBatchQuantity(result)).toBe(quantity);
            }),
            { numRuns: RUNS },
        );
    });

    it("leaves non-empty batch lists unchanged (total preserved)", () => {
        fc.assert(
            fc.property(
                fc.array(batchArb(), { minLength: 1, maxLength: 8 }).map(withUniqueBatchNumbers),
                fc.integer({ min: 0, max: 1000 }),
                (batches, quantity) => {
                    const result = coerceLegacyToOpeningBatch(quantity, batches);
                    expect(sumBatchQuantity(result)).toBe(sumBatchQuantity(batches));
                },
            ),
            { numRuns: RUNS },
        );
    });
});

// Feature: product-accounting-and-batches, Property 7: expiry classification partitions by threshold.
describe("Property 7: expiry classification partitions by threshold", () => {
    it("past -> expired; within threshold & not past -> nearExpiry; none in both", () => {
        fc.assert(
            fc.property(
                batchListArb,
                fc.integer({ min: 1, max: 365 }),
                (batches, thresholdDays) => {
                    const { expired, nearExpiry } = classifyExpiry(batches, NOW, thresholdDays);

                    const expiredSet = new Set(expired.map((b) => b.batchNumber));
                    const nearSet = new Set(nearExpiry.map((b) => b.batchNumber));

                    // Disjoint sets.
                    for (const bn of expiredSet) {
                        expect(nearSet.has(bn)).toBe(false);
                    }

                    const horizon = NOW.getTime() + thresholdDays * DAY_MS;
                    for (const b of batches) {
                        if (b.expiryDate == null) {
                            // No expiry → in neither bucket.
                            expect(expiredSet.has(b.batchNumber)).toBe(false);
                            expect(nearSet.has(b.batchNumber)).toBe(false);
                            continue;
                        }
                        const e = new Date(b.expiryDate).getTime();
                        if (e < NOW.getTime()) {
                            expect(expiredSet.has(b.batchNumber)).toBe(true);
                        } else if (e <= horizon) {
                            expect(nearSet.has(b.batchNumber)).toBe(true);
                        } else {
                            expect(expiredSet.has(b.batchNumber)).toBe(false);
                            expect(nearSet.has(b.batchNumber)).toBe(false);
                        }
                    }
                },
            ),
            { numRuns: RUNS },
        );
    });
});
