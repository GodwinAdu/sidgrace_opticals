import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

/**
 * Server-level integration tests for the Layer A accounting foundation —
 * double-entry journal entries, the general ledger, fiscal-period locks, and
 * the legacy→double-entry compatibility bridge — exercising the REAL server
 * actions against an in-memory MongoDB.
 *
 * Auth strategy (test-only, no production change): we mock `lib/helpers/auth`
 * exactly like `clinical-attribution.int.test.ts` so `withAuth(handler,
 * permission?)` injects a controllable session user and enforces the permission
 * against a controllable role using the REAL `hasPermission` predicate.
 * Everything else — the action bodies, the balancing invariant, the Mongoose
 * writes, the period validation, the History audit writes, the bridge's
 * best-effort double-entry post — runs for real against the in-memory DB.
 *
 * Covered:
 *  - post a balanced JournalEntry → the ledger (getLedger) and period behaviour
 *    reflect it (R2.1, R2.5, R3.1);
 *  - posting into a CLOSED period is blocked (R7.2);
 *  - a posted entry cannot be edited (updateDraft rejects) but CAN be reversed —
 *    reverse creates a mirrored balanced entry and marks the original reversed
 *    (R2.3, R2.6);
 *  - the compatibility bridge: `postLedgerEntry` builds a balanced JournalEntry
 *    and `reverseLedgerEntry` posts a reversing entry (R8.1, R8.2).
 */

// The accounting actions call `revalidatePath` to refresh their dashboard
// routes. Outside a Next request/render context that throws ("static generation
// store missing"), so we no-op it here — a test-only concern that does not touch
// production behaviour (the real cache revalidation is irrelevant to the DB
// writes we assert on).
vi.mock("next/cache", () => ({
    revalidatePath: () => {},
    revalidateTag: () => {},
}));

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

// Import AFTER the mock + after setup.ts has set MONGODB_URL.
const { seedDefaultChart, listChartAccounts } = await import(
    "../../lib/actions/accounting/chart-account.actions"
);
const { createDraft, updateDraft, post, reverse, get } = await import(
    "../../lib/actions/accounting/journal-entry.actions"
);
const { getLedger } = await import("../../lib/actions/accounting/ledger.actions");
const { configure, close: closePeriod } = await import(
    "../../lib/actions/accounting/accounting-period.actions"
);
const { postLedgerEntry, reverseLedgerEntry } = await import(
    "../../lib/actions/accounting/bridge.actions"
);
const JournalEntryModule = await import("../../lib/models/accounting/journal-entry.models");
const JournalEntry = JournalEntryModule.default;

// The legacy Transaction / Account models have been retired (legacy-ledger-
// retirement task 6). To keep the P2 "no legacy writes" assertions without
// re-introducing the deleted models, we read the raw collections directly via
// the active mongoose connection — exactly how scripts/legacy-transaction-
// diagnostic.mjs reads the "transactions" collection. These handles create no
// model and never write.
const legacyTransactions = () => mongoose.connection.collection("transactions");
const legacyAccounts = () => mongoose.connection.collection("accounts");

const ACCOUNTANT = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "Ada Ledger",
    role: "accountant",
};

/** A role with every Layer A accounting flag the actions gate on. */
const FULL_ACCT_ROLE = {
    name: "accountant",
    accountingManagement: true,
    accountingPost: true,
    accountingSettings: true,
};

/** Find a seeded account's ObjectId by its chart code (e.g. "1000"). */
async function accountIdByCode(code: string): Promise<string> {
    const accounts = (await listChartAccounts()) as Array<{ _id: string; code: string }>;
    const match = accounts.find((a) => a.code === code);
    if (!match) throw new Error(`Seed missing account ${code}`);
    return match._id;
}

beforeEach(async () => {
    testCtx.user = ACCOUNTANT;
    testCtx.role = { ...FULL_ACCT_ROLE };
    // Seed the default clinic chart so system codes (cash/revenue/expense) exist
    // for both the manual-entry tests and the bridge's default mappings.
    await seedDefaultChart();
});

describe("post a balanced journal entry → ledger + period behaviour", () => {
    it("posts a balanced entry and the ledger reflects it on both accounts", async () => {
        const cashId = await accountIdByCode("1000"); // debit-normal asset
        const revenueId = await accountIdByCode("4000"); // credit-normal revenue

        const draft = await createDraft({
            memo: "Cash consultation",
            lines: [
                { accountId: cashId, debit: 500 },
                { accountId: revenueId, credit: 500 },
            ],
        });
        expect(draft.status).toBe("draft");

        const posted = await post(draft._id);
        expect(posted.status).toBe("posted");
        expect(posted.postedAt).toBeTruthy();

        // Cash (debit-normal) rises by the debit; closing balance = +500.
        const cashLedger = await getLedger(cashId);
        expect(cashLedger).not.toBeNull();
        expect(cashLedger!.lines).toHaveLength(1);
        expect(cashLedger!.closingBalance).toBe(500);

        // Revenue (credit-normal) rises by the credit; closing balance = +500.
        const revLedger = await getLedger(revenueId);
        expect(revLedger!.lines).toHaveLength(1);
        expect(revLedger!.closingBalance).toBe(500);
    });

    it("a draft (unposted) entry never affects the ledger", async () => {
        const cashId = await accountIdByCode("1000");
        const revenueId = await accountIdByCode("4000");

        await createDraft({
            memo: "Unposted draft",
            lines: [
                { accountId: cashId, debit: 250 },
                { accountId: revenueId, credit: 250 },
            ],
        });

        const cashLedger = await getLedger(cashId);
        expect(cashLedger!.lines).toHaveLength(0);
        expect(cashLedger!.closingBalance).toBe(0);
    });

    it("rejects posting an unbalanced entry", async () => {
        const cashId = await accountIdByCode("1000");
        const revenueId = await accountIdByCode("4000");

        const draft = await createDraft({
            memo: "Unbalanced",
            lines: [
                { accountId: cashId, debit: 500 },
                { accountId: revenueId, credit: 400 },
            ],
        });
        await expect(post(draft._id)).rejects.toThrow(/balanced/i);
    });
});

describe("closed-period block (R7.2)", () => {
    it("blocks posting an entry dated inside a closed period, and allows it once reopened via an open period", async () => {
        const cashId = await accountIdByCode("1000");
        const revenueId = await accountIdByCode("4000");

        // Configure a period covering Jan 2023 and immediately close it.
        const period = await configure({
            fiscalYear: 2023,
            periodNo: 1,
            start: "2023-01-01",
            end: "2023-01-31",
        });
        await closePeriod(period._id);

        const draft = await createDraft({
            date: "2023-01-15",
            memo: "Inside closed period",
            lines: [
                { accountId: cashId, debit: 100 },
                { accountId: revenueId, credit: 100 },
            ],
        });

        await expect(post(draft._id)).rejects.toThrow(/closed accounting period/i);

        // A date OUTSIDE any configured period posts fine (unconfigured = lenient).
        const openDraft = await createDraft({
            date: "2024-06-15",
            memo: "Outside any period",
            lines: [
                { accountId: cashId, debit: 100 },
                { accountId: revenueId, credit: 100 },
            ],
        });
        const openPosted = await post(openDraft._id);
        expect(openPosted.status).toBe("posted");
    });
});

describe("posted immutability + reverse (R2.3, R2.6)", () => {
    it("rejects editing a posted entry but reverses it with a mirrored balanced entry", async () => {
        const cashId = await accountIdByCode("1000");
        const revenueId = await accountIdByCode("4000");

        const draft = await createDraft({
            memo: "To be reversed",
            lines: [
                { accountId: cashId, debit: 300 },
                { accountId: revenueId, credit: 300 },
            ],
        });
        const posted = await post(draft._id);

        // Editing a posted entry is rejected (immutable).
        await expect(
            updateDraft(posted._id, { memo: "tampered" }),
        ).rejects.toThrow(/immutable|posted/i);

        // Reversing creates a NEW posted entry with debit/credit swapped.
        const reversing = await reverse(posted._id);
        expect(reversing.status).toBe("posted");
        expect(String(reversing.reversalOf)).toBe(String(posted._id));
        // Mirror: the original debited cash → reversal credits cash.
        const cashLine = reversing.lines.find(
            (l: Record<string, unknown>) => String(l.accountId) === String(cashId),
        );
        expect(cashLine.credit).toBe(300);
        expect(cashLine.debit).toBe(0);

        // The original is now marked reversed and linked to the reversing entry.
        const original = await get(posted._id);
        expect(original.status).toBe("reversed");
        expect(String(original.reversedBy._id ?? original.reversedBy)).toBe(String(reversing._id));

        // Ledger contract (R3.4): only `posted` entries contribute, and the
        // reversed original is NOT posted — so it drops out of the ledger while
        // the reversing entry's cancelling line remains. The cash line left in
        // the ledger is the reversal's credit of 300 (one line).
        const cashLedger = await getLedger(cashId);
        expect(cashLedger!.lines).toHaveLength(1);
        expect(cashLedger!.lines[0].credit).toBe(300);
    });

    it("rejects reversing a draft (only posted entries can be reversed)", async () => {
        const cashId = await accountIdByCode("1000");
        const revenueId = await accountIdByCode("4000");
        const draft = await createDraft({
            lines: [
                { accountId: cashId, debit: 10 },
                { accountId: revenueId, credit: 10 },
            ],
        });
        await expect(reverse(draft._id)).rejects.toThrow(/posted/i);
    });
});

describe("compatibility bridge: postLedgerEntry / reverseLedgerEntry (R8.1, R8.2)", () => {
    it("postLedgerEntry builds a balanced, posted JournalEntry from default mappings (and NO legacy Transaction)", async () => {
        // Direct (non-withAuth) internal call, exactly as the payment/invoice
        // flows invoke it, with the injected session user.
        const sourceId = new mongoose.Types.ObjectId().toString();
        const txn = await postLedgerEntry(ACCOUNTANT as never, {
            type: "income",
            category: "Consultation",
            amount: 750,
            source: "payment",
            sourceId,
        });
        expect(txn).not.toBeNull();
        expect(txn!.journalEntryId).toBeTruthy();
        // After retirement the returned id IS the JournalEntry id (R2/D2): `_id`
        // and the `journalEntryId` alias point at the SAME document.
        expect(String(txn!._id)).toBe(String(txn!.journalEntryId));

        const je = await JournalEntry.findById(txn!._id).lean();
        expect(je).not.toBeNull();
        expect(je!.status).toBe("posted");
        // income → debit Cash (1000), credit Revenue (4000); balanced at 750.
        const totalDebit = (je!.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
        const totalCredit = (je!.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
        expect(totalDebit).toBe(750);
        expect(totalCredit).toBe(750);

        // The debit lands on cash (the ledger confirms the double-entry side).
        const cashId = await accountIdByCode("1000");
        const cashLedger = await getLedger(cashId);
        expect(cashLedger!.closingBalance).toBe(750);

        // P2 — No legacy writes: zero Transaction documents created for this call.
        const legacyCount = await legacyTransactions().countDocuments({ sourceId });
        expect(legacyCount).toBe(0);
    });

    it("reverseLedgerEntry (JE id) posts a reversing entry and marks the bridged original reversed", async () => {
        const sourceId = new mongoose.Types.ObjectId().toString();
        const txn = await postLedgerEntry(ACCOUNTANT as never, {
            type: "expense",
            category: "Supplies",
            amount: 200,
            source: "purchase",
            sourceId,
        });
        expect(txn).not.toBeNull();
        // The id callers persist (`run.transactionId` / `purchase.transactionId`)
        // is now the JournalEntry id itself (P3) — reverse against it directly.
        const bridgedId = String(txn!._id);
        expect(bridgedId).toBe(String(txn!.journalEntryId));

        await reverseLedgerEntry(ACCOUNTANT as never, bridgedId);

        // The original bridged entry is now reversed and linked.
        const original = await JournalEntry.findById(bridgedId).lean();
        expect(original!.status).toBe("reversed");
        expect(original!.reversedBy).toBeTruthy();

        // A reversing posted entry exists mirroring the original.
        const reversing = await JournalEntry.findById(String(original!.reversedBy)).lean();
        expect(reversing!.status).toBe("posted");
        expect(String(reversing!.reversalOf)).toBe(bridgedId);

        // P2 — No legacy writes: the reversal path created/touched no Transaction.
        const legacyCount = await legacyTransactions().countDocuments({ sourceId });
        expect(legacyCount).toBe(0);

        // Ledger contract (R3.4): the reversed original drops out (status is no
        // longer `posted`); only the reversal's cancelling line remains. On the
        // debit-normal expense account that leaves a single credit line.
        const expenseId = await accountIdByCode("6900");
        const expLedger = await getLedger(expenseId);
        expect(expLedger!.lines).toHaveLength(1);
        expect(expLedger!.lines[0].credit).toBe(200);
    });

    // ---------------------------------------------------------------------
    // RETIREMENT (legacy-ledger-retirement, task 3 — flipped from the task-1
    // baseline).
    //
    // Task 1 pinned the OLD dual-write behaviour (postLedgerEntry wrote a legacy
    // `Transaction` + mutated an `Account` alongside the bridged `JournalEntry`).
    // Task 3 removes that legacy write-path, so this test now asserts the NEW
    // contract and MUST stay green: `postLedgerEntry` posts ONLY a balanced
    // JournalEntry, returns the JE id (with a `journalEntryId` alias equal to
    // `_id`), creates ZERO Transaction documents (P2), and mutates NO Account
    // balance (every pre-existing Account.balance is left untouched). (R1, R2, P1, P2)
    // ---------------------------------------------------------------------
    it("RETIREMENT: postLedgerEntry posts ONLY a JournalEntry — zero Transactions, no Account mutation", async () => {
        // Capture the full set of Account balances BEFORE the call so we can
        // assert the bridge leaves every one of them unchanged (P2).
        const accountsBefore = await legacyAccounts().find({}).toArray();
        const balancesBefore = new Map(
            accountsBefore.map((a) => [String(a._id), a.balance ?? 0]),
        );

        const sourceId = new mongoose.Types.ObjectId().toString();
        const txn = await postLedgerEntry(ACCOUNTANT as never, {
            type: "income",
            category: "Consultation",
            amount: 640,
            source: "payment",
            sourceId,
        });
        expect(txn).not.toBeNull();

        // The returned object exposes the JournalEntry `_id`; the `journalEntryId`
        // alias equals it (D2) so callers reading either key stay safe.
        expect(txn!._id).toBeTruthy();
        expect(txn!.journalEntryId).toBeTruthy();
        expect(String(txn!._id)).toBe(String(txn!.journalEntryId));

        // The returned id names a REAL posted, balanced JournalEntry (P1).
        const je = await JournalEntry.findById(String(txn!._id)).lean();
        expect(je).not.toBeNull();
        expect(je!.status).toBe("posted");
        const totalDebit = (je!.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
        const totalCredit = (je!.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
        expect(totalDebit).toBe(640);
        expect(totalCredit).toBe(640);

        // P2 — No legacy writes: ZERO Transaction documents were created, both for
        // this specific source and across the whole collection.
        const legacyCountForSource = await legacyTransactions().countDocuments({ sourceId });
        expect(legacyCountForSource).toBe(0);
        const legacyCountTotal = await legacyTransactions().countDocuments({});
        expect(legacyCountTotal).toBe(0);

        // P2 — No Account balance is mutated by the bridge. No new Account is
        // created, and every pre-existing balance is byte-identical.
        const accountsAfter = await legacyAccounts().find({}).toArray();
        expect(accountsAfter.length).toBe(accountsBefore.length);
        for (const a of accountsAfter) {
            expect(a.balance ?? 0).toBe(balancesBefore.get(String(a._id)));
        }
    });
});
