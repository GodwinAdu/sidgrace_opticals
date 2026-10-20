import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

/**
 * Server-level integration tests for the Layer B financial statements,
 * exercising the REAL report actions against an in-memory MongoDB.
 *
 * Auth strategy (test-only, no production change): we mock `lib/helpers/auth`
 * so `withAuth(handler, permission?)` injects a controllable session user and
 * enforces the permission against a controllable role using the REAL
 * `hasPermission` predicate (same pattern as clinical-attribution.int.test.ts).
 * Everything else — the journal-entry post path, the posted-line → account
 * join in reports.actions.ts, and the pure statements math — runs for real
 * against the in-memory DB.
 *
 * What is asserted:
 *  - Statements derived from POSTED journal entries balance: trial balance
 *    totalDebit === totalCredit, and balance sheet assets === liabilities +
 *    equity (R4.1, R4.3, R4.6).
 *  - Switching basis (accrual vs cash) changes the result set: an accrual-only
 *    entry is invisible to cash-basis reporting, so the two bases produce
 *    different totals (R4.5).
 */

// Controllable identity + role for the mocked auth layer.
const testCtx: { user: Record<string, unknown> | null; role: Record<string, unknown> | null } = {
    user: null,
    role: null,
};

vi.mock("../../lib/helpers/auth", async () => {
    const { AuthError } = await import("../../lib/helpers/authz");
    return {
        AuthError,
        // Re-implement withAuth faithfully: reject when no user, enforce the
        // permission against the current test role via the real predicate, then
        // call the handler with the injected user.
        withAuth: <T, A extends unknown[]>(
            handler: (user: unknown, ...args: A) => Promise<T>,
            permission?: unknown,
        ) => {
            return async (...args: A): Promise<T> => {
                if (!testCtx.user) throw new AuthError("UNAUTHENTICATED", "Authentication required");
                if (permission) {
                    const { hasPermission } = await import("../../lib/helpers/authz");
                    if (!hasPermission(testCtx.role as never, permission as never)) {
                        throw new AuthError("FORBIDDEN", "You do not have permission to perform this action");
                    }
                }
                return handler(testCtx.user, ...args);
            };
        },
    };
});

// `next/cache` revalidatePath is a no-op outside a request context.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Import AFTER the mock + after setup.ts has set MONGODB_URL.
const { createDraft, post } = await import("../../lib/actions/accounting/journal-entry.actions");
const { trialBalance, balanceSheet } = await import("../../lib/actions/accounting/reports.actions");
const ChartAccountModule = await import("../../lib/models/accounting/chart-account.models");
const ChartAccount = ChartAccountModule.default;

const STAFF = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "Fin Manager",
    role: "accountant",
};

/** A role that satisfies both accountingManagement (reads) and accountingPost. */
const FULL_ACCT_ROLE = {
    name: "accountant",
    accountingManagement: true,
    accountingPost: true,
};

interface SeededAccounts {
    cash: string;
    ar: string;
    revenue: string;
    rent: string;
}

/** Seed a minimal chart of accounts and return the ids the tests post against. */
async function seedChart(): Promise<SeededAccounts> {
    const [cash, ar, revenue, rent] = await ChartAccount.create([
        { code: "1000", name: "Cash", type: "asset", subtype: "current-asset", isCashAccount: true },
        { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "current-asset" },
        { code: "4000", name: "Service Revenue", type: "revenue", subtype: "operating-revenue" },
        { code: "6000", name: "Rent Expense", type: "expense", subtype: "operating-expense" },
    ]);
    return {
        cash: String(cash._id),
        ar: String(ar._id),
        revenue: String(revenue._id),
        rent: String(rent._id),
    };
}

/** Create a draft entry and immediately post it; returns the posted entry. */
async function postEntry(values: Parameters<typeof createDraft>[0]) {
    const draft = await createDraft(values);
    return post(draft._id);
}

beforeEach(() => {
    testCtx.user = STAFF;
    testCtx.role = { ...FULL_ACCT_ROLE };
});

describe("statements derived from posted journal entries (integration)", () => {
    it("trial balance balances: totalDebit === totalCredit from posted entries", async () => {
        const acc = await seedChart();

        // Two balanced accrual postings.
        // 1) Cash sale: Dr Cash 500 / Cr Revenue 500
        await postEntry({
            memo: "Cash sale",
            basis: "accrual",
            lines: [
                { accountId: acc.cash, debit: 500 },
                { accountId: acc.revenue, credit: 500 },
            ],
        });
        // 2) Pay rent: Dr Rent Expense 200 / Cr Cash 200
        await postEntry({
            memo: "Rent",
            basis: "accrual",
            lines: [
                { accountId: acc.rent, debit: 200 },
                { accountId: acc.cash, credit: 200 },
            ],
        });

        const tb = await trialBalance();
        expect(tb.totalDebit).toBe(tb.totalCredit);
        expect(tb.balanced).toBe(true);
        // Sanity: real numbers, not an empty/short-circuited result.
        expect(tb.totalDebit).toBeGreaterThan(0);
        expect(tb.accounts.length).toBeGreaterThanOrEqual(3);
    });

    it("balance sheet satisfies Assets = Liabilities + Equity (net income folded in)", async () => {
        const acc = await seedChart();

        // Accrual revenue booked to A/R: Dr A/R 1000 / Cr Revenue 1000.
        await postEntry({
            memo: "Invoice",
            basis: "accrual",
            lines: [
                { accountId: acc.ar, debit: 1000 },
                { accountId: acc.revenue, credit: 1000 },
            ],
        });
        // Expense paid in cash: Dr Rent 300 / Cr Cash 300 (cash goes negative,
        // but the equation still holds via retained earnings).
        await postEntry({
            memo: "Rent",
            basis: "accrual",
            lines: [
                { accountId: acc.rent, debit: 300 },
                { accountId: acc.cash, credit: 300 },
            ],
        });

        const bs = await balanceSheet();
        expect(bs.assets).toBe(Math.round((bs.liabilities + bs.equity + Number.EPSILON) * 100) / 100);
        expect(bs.balanced).toBe(true);
        // Net income (1000 revenue - 300 expense) flowed into equity.
        expect(bs.retainedEarnings).toBe(700);
    });
});

describe("basis switch changes the result set (integration)", () => {
    it("an accrual-only entry is invisible to cash-basis reporting", async () => {
        const acc = await seedChart();

        // Cash-basis entry: actual cash moved. Dr Cash 400 / Cr Revenue 400.
        await postEntry({
            memo: "Cash collected",
            basis: "cash",
            lines: [
                { accountId: acc.cash, debit: 400 },
                { accountId: acc.revenue, credit: 400 },
            ],
        });
        // Accrual-only entry: revenue earned, not yet collected.
        // Dr A/R 900 / Cr Revenue 900. This has NO cash leg and is tagged
        // accrual, so cash-basis reporting must not see it.
        await postEntry({
            memo: "Earned, uncollected",
            basis: "accrual",
            lines: [
                { accountId: acc.ar, debit: 900 },
                { accountId: acc.revenue, credit: 900 },
            ],
        });

        const accrualTb = await trialBalance(undefined, "accrual");
        const cashTb = await trialBalance(undefined, "cash");

        // Accrual sees BOTH entries (cash 400 + A/R 900 = 1300 debit side).
        expect(accrualTb.totalDebit).toBe(1300);
        // Cash sees ONLY the cash entry (400).
        expect(cashTb.totalDebit).toBe(400);
        // The two bases produce genuinely different result sets.
        expect(accrualTb.totalDebit).not.toBe(cashTb.totalDebit);
        expect(accrualTb.accounts.length).toBeGreaterThan(cashTb.accounts.length);

        // Both bases remain internally balanced.
        expect(accrualTb.balanced).toBe(true);
        expect(cashTb.balanced).toBe(true);
    });

    it("balance sheet totals differ by basis while each stays balanced", async () => {
        const acc = await seedChart();

        await postEntry({
            memo: "Cash collected",
            basis: "cash",
            lines: [
                { accountId: acc.cash, debit: 250 },
                { accountId: acc.revenue, credit: 250 },
            ],
        });
        await postEntry({
            memo: "Earned, uncollected",
            basis: "accrual",
            lines: [
                { accountId: acc.ar, debit: 750 },
                { accountId: acc.revenue, credit: 750 },
            ],
        });

        const accrualBs = await balanceSheet(undefined, "accrual");
        const cashBs = await balanceSheet(undefined, "cash");

        // Accrual assets = Cash 250 + A/R 750 = 1000; cash assets = Cash 250.
        expect(accrualBs.assets).toBe(1000);
        expect(cashBs.assets).toBe(250);
        expect(accrualBs.assets).not.toBe(cashBs.assets);

        // Each basis independently satisfies the accounting equation.
        expect(accrualBs.balanced).toBe(true);
        expect(cashBs.balanced).toBe(true);
    });
});
