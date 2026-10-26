import { describe, it, expect } from "vitest";
import {
    computeInvoiceTotals,
    invoiceStatusFrom,
    invoiceBalance,
    computeBedDays,
    bedChargeAmount,
    allocateSettlement,
    claimCoverageAmount,
} from "../lib/finance/calc";

describe("computeInvoiceTotals", () => {
    it("computes line amounts, subtotal and total", () => {
        const r = computeInvoiceTotals(
            [
                { quantity: 2, unitPrice: 50 },
                { quantity: 1, unitPrice: 100 },
            ],
            0,
            0,
        );
        expect(r.withAmounts[0].amount).toBe(100);
        expect(r.withAmounts[1].amount).toBe(100);
        expect(r.subtotal).toBe(200);
        expect(r.total).toBe(200);
    });

    it("applies tax and discount", () => {
        const r = computeInvoiceTotals([{ quantity: 1, unitPrice: 100 }], 15, 25);
        expect(r.subtotal).toBe(100);
        expect(r.total).toBe(90); // 100 + 15 - 25
    });

    it("never goes below zero", () => {
        const r = computeInvoiceTotals([{ quantity: 1, unitPrice: 50 }], 0, 500);
        expect(r.total).toBe(0);
    });

    it("handles empty/missing fields", () => {
        const r = computeInvoiceTotals([{}, { quantity: 3 }], 0, 0);
        expect(r.subtotal).toBe(0);
        expect(r.total).toBe(0);
    });
});

describe("invoiceStatusFrom / invoiceBalance", () => {
    it("unpaid when nothing paid", () => {
        expect(invoiceStatusFrom(0, 100)).toBe("unpaid");
    });
    it("partial when some paid", () => {
        expect(invoiceStatusFrom(40, 100)).toBe("partial");
    });
    it("paid when fully covered", () => {
        expect(invoiceStatusFrom(100, 100)).toBe("paid");
        expect(invoiceStatusFrom(120, 100)).toBe("paid");
    });
    it("balance never negative", () => {
        expect(invoiceBalance(100, 120)).toBe(0);
        expect(invoiceBalance(100, 30)).toBe(70);
    });
});

describe("computeBedDays / bedChargeAmount", () => {
    it("counts each started day as one, min 1", () => {
        const admit = new Date("2026-01-01T08:00:00Z");
        expect(computeBedDays(admit, new Date("2026-01-01T09:00:00Z"))).toBe(1); // same day
        expect(computeBedDays(admit, new Date("2026-01-02T07:00:00Z"))).toBe(1); // <24h
        expect(computeBedDays(admit, new Date("2026-01-02T09:00:00Z"))).toBe(2); // >24h
        expect(computeBedDays(admit, new Date("2026-01-04T08:00:00Z"))).toBe(3);
    });
    it("bed charge = rate × days, 0 when no rate", () => {
        expect(bedChargeAmount(5000, 3)).toBe(15000);
        expect(bedChargeAmount(0, 3)).toBe(0);
        expect(bedChargeAmount(5000, 0)).toBe(0);
    });
});

describe("allocateSettlement (oldest-first)", () => {
    it("fully settles when amount covers all", () => {
        const r = allocateSettlement(300, [
            { _id: "a", balance: 100 },
            { _id: "b", balance: 150 },
        ]);
        expect(r.appliedTotal).toBe(250);
        expect(r.unallocated).toBe(50);
        expect(r.allocations).toHaveLength(2);
    });

    it("partially covers oldest first and stops", () => {
        const r = allocateSettlement(120, [
            { _id: "a", balance: 100 },
            { _id: "b", balance: 150 },
        ]);
        expect(r.allocations[0]).toEqual({ invoiceId: "a", applied: 100 });
        expect(r.allocations[1]).toEqual({ invoiceId: "b", applied: 20 });
        expect(r.appliedTotal).toBe(120);
        expect(r.unallocated).toBe(0);
    });

    it("skips zero-balance invoices", () => {
        const r = allocateSettlement(50, [
            { _id: "a", balance: 0 },
            { _id: "b", balance: 80 },
        ]);
        expect(r.allocations).toEqual([{ invoiceId: "b", applied: 50 }]);
    });
});

describe("claimCoverageAmount", () => {
    it("computes coverage share rounded to 2dp", () => {
        expect(claimCoverageAmount(10000, 80)).toBe(8000);
        expect(claimCoverageAmount(333.33, 50)).toBe(166.67);
    });
    it("zero when no coverage or no total", () => {
        expect(claimCoverageAmount(10000, 0)).toBe(0);
        expect(claimCoverageAmount(0, 80)).toBe(0);
    });
});
