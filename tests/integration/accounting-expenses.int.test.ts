import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

/**
 * Server-level integration tests for the Layer C accounting flows — vendors,
 * expenses, and the multi-level approval engine — exercising the REAL server
 * actions against an in-memory MongoDB.
 *
 * Auth strategy (test-only, no production change): we mock `lib/helpers/auth`
 * exactly like `clinical-attribution.int.test.ts` and `accounting-ledger.int.
 * test.ts`, so `withAuth(handler, permission?)` injects a controllable session
 * user and enforces the permission against a controllable role using the REAL
 * `hasPermission` predicate. Everything else — the capture → submit → approve →
 * post lifecycle, the frozen approval chain, the balancing invariant, the period
 * lock, the Mongoose writes, and the vendor-spend join — runs for real against
 * the in-memory DB. This is what lets us assert:
 *
 *  - an expense submit → approve → post yields a BALANCED JournalEntry and the
 *    expense ends `posted`, and posting into a CLOSED period is blocked
 *    (R5.3, R5.6, R11.5);
 *  - approval is DENIED for the wrong role (not the next pending role) and for a
 *    user lacking the `accountingApprove` permission (R5.3, R5.5);
 *  - vendor spend ties to posted entries: a posted expense carrying a vendorId
 *    is totalled by `vendorSpendReport` (R11.2, R11.3).
 */

// The accounting actions call `revalidatePath` to refresh their dashboard
// routes. Outside a Next request/render context that throws, so we no-op it here
// — a test-only concern that does not touch production behaviour (the real cache
// revalidation is irrelevant to the DB writes we assert on).
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
const { configure, close: closePeriod } = await import(
    "../../lib/actions/accounting/accounting-period.actions"
);
const { createApprovalRule } = await import("../../lib/actions/accounting/approval-rule.actions");
const { createVendor, vendorSpendReport } = await import("../../lib/actions/accounting/vendor.actions");
const {
    capture,
    submit,
    approve,
    post: postExpense,
} = await import("../../lib/actions/accounting/expense.actions");
const JournalEntryModule = await import("../../lib/models/accounting/journal-entry.models");
const JournalEntry = JournalEntryModule.default;

/* ────────────────────────────── test identities ────────────────────────────── */

/** The capturing/submitting/posting accountant — role is NOT an approver role. */
const ACCOUNTANT = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "Ada Ledger",
    role: "accountant",
};
/** A manager — the single approver role in the chain used by most tests. */
const MANAGER = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "Max Manager",
    role: "manager",
};
/** A finance-director — the second approver role for the two-step chain. */
const DIRECTOR = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: "Dana Director",
    role: "finance-director",
};

/** A role with every Layer C accounting flag the actions gate on. */
const FULL_ACCT_ROLE = {
    name: "accountant",
    accountingManagement: true,
    accountingPost: true,
    accountingApprove: true,
    accountingSettings: true,
};

/** Find a seeded account's ObjectId by its chart code (e.g. "1000"). */
async function accountIdByCode(code: string): Promise<string> {
    const accounts = (await listChartAccounts()) as Array<{ _id: string; code: string }>;
    const match = accounts.find((a) => a.code === code);
    if (!match) throw new Error(`Seed missing account ${code}`);
    return match._id;
}

/** Switch the acting user AND give them the full accounting role flags. */
function actAs(user: typeof ACCOUNTANT) {
    testCtx.user = { ...user };
    testCtx.role = { ...FULL_ACCT_ROLE, name: user.role };
}

beforeEach(async () => {
    actAs(ACCOUNTANT);
    // Seed the default clinic chart so expense (6300) + cash (1000) exist.
    await seedDefaultChart();
});

describe("expense submit → approve → post yields a balanced JournalEntry (R5.3, R11.5)", () => {
    it("captures, submits (freezes chain), approves as the chain role, and posts a balanced entry", async () => {
        const expenseAccountId = await accountIdByCode("6300"); // Medical Supplies Expense (debit-normal)
        const cashId = await accountIdByCode("1000"); // Cash on Hand (credit side)

        // A rule whose chain is a single "manager" step for any amount >= 0.
        await createApprovalRule({
            name: "All expenses → manager",
            minAmount: 0,
            maxAmount: null,
            approverRoles: ["manager"],
            isDefault: true,
            isActive: true,
        });

        // Capture (draft) as the accountant.
        const draft = await capture({
            amount: 400,
            expenseAccountId,
            creditAccountId: cashId,
            payee: "Acme Clinic Supplies",
            description: "Gloves + swabs",
        });
        expect(draft.status).toBe("draft");
        expect(draft.approvalChain).toHaveLength(0);

        // Submit → chain frozen from the active rule (one "manager" step).
        const submitted = await submit(draft._id);
        expect(submitted.status).toBe("submitted");
        expect(submitted.approvalChain).toHaveLength(1);
        // New multi-approver model: a role rule freezes into a step whose
        // approvers list carries the role, with a quorum of 1 and no decisions yet.
        expect(submitted.approvalChain[0].approvers[0]).toMatchObject({ kind: "role", value: "manager" });
        expect(submitted.approvalChain[0].requiredCount).toBe(1);
        expect(submitted.approvalChain[0].decisions ?? []).toHaveLength(0);

        // Approve as the manager (the next pending role).
        actAs(MANAGER);
        const approved = await approve(draft._id);
        expect(approved.status).toBe("approved");
        expect(approved.approvalChain[0].decisions).toHaveLength(1);
        expect(approved.approvalChain[0].decisions[0].decision).toBe("approved");

        // Post as the accountant → balanced journal entry + status posted.
        actAs(ACCOUNTANT);
        const posted = await postExpense(draft._id);
        expect(posted.status).toBe("posted");
        expect(posted.journalEntryId).toBeTruthy();

        const je = await JournalEntry.findById(posted.journalEntryId).lean();
        expect(je).not.toBeNull();
        expect(je!.status).toBe("posted");
        expect(je!.source).toBe("expense");

        // The entry is BALANCED: total debits === total credits (=== 400).
        const totalDebit = (je!.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
        const totalCredit = (je!.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
        expect(totalDebit).toBe(totalCredit);
        expect(totalDebit).toBe(400);

        // Debit lands on the expense account, credit on cash.
        const debitLine = (je!.lines || []).find((l) => (l.debit || 0) > 0);
        const creditLine = (je!.lines || []).find((l) => (l.credit || 0) > 0);
        expect(String(debitLine!.accountId)).toBe(String(expenseAccountId));
        expect(String(creditLine!.accountId)).toBe(String(cashId));
    });

    it("blocks posting an approved expense dated inside a CLOSED period (R5.6)", async () => {
        const expenseAccountId = await accountIdByCode("6300");
        const cashId = await accountIdByCode("1000");

        await createApprovalRule({
            name: "All expenses → manager",
            minAmount: 0,
            maxAmount: null,
            approverRoles: ["manager"],
            isDefault: true,
            isActive: true,
        });

        // Configure a period covering Jan 2023 and close it.
        const period = await configure({
            fiscalYear: 2023,
            periodNo: 1,
            start: "2023-01-01",
            end: "2023-01-31",
        });
        await closePeriod(period._id);

        // Capture + submit + approve an expense dated inside the closed period.
        const draft = await capture({
            date: "2023-01-15",
            amount: 150,
            expenseAccountId,
            creditAccountId: cashId,
            description: "Dated inside closed period",
        });
        await submit(draft._id);
        actAs(MANAGER);
        await approve(draft._id);

        // Posting is blocked by the closed-period lock.
        actAs(ACCOUNTANT);
        await expect(postExpense(draft._id)).rejects.toThrow(/closed accounting period/i);
    });
});

describe("approval denied for the wrong role / missing permission (R5.3, R5.5)", () => {
    it("rejects approval by a user whose role is not the next pending role", async () => {
        const expenseAccountId = await accountIdByCode("6300");
        const cashId = await accountIdByCode("1000");

        // Two-step chain: manager, then finance-director.
        await createApprovalRule({
            name: "Two-step chain",
            minAmount: 0,
            maxAmount: null,
            approverRoles: ["manager", "finance-director"],
            isDefault: true,
            isActive: true,
        });

        const draft = await capture({
            amount: 900,
            expenseAccountId,
            creditAccountId: cashId,
        });
        await submit(draft._id);

        // The director is NOT the next pending role (manager is first) → denied.
        actAs(DIRECTOR);
        await expect(approve(draft._id)).rejects.toThrow(/not an approver for the current step/i);

        // The manager (next pending) CAN approve the first step.
        actAs(MANAGER);
        const afterFirst = await approve(draft._id);
        expect(afterFirst.status).toBe("submitted"); // still one step pending
        expect(afterFirst.approvalChain[0].decisions[0].decision).toBe("approved");
        expect(afterFirst.approvalChain[1].decisions ?? []).toHaveLength(0);

        // Now the manager is NOT the next pending role (director is) → denied.
        actAs(MANAGER);
        await expect(approve(draft._id)).rejects.toThrow(/not an approver for the current step/i);

        // The director completes the chain → approved.
        actAs(DIRECTOR);
        const fully = await approve(draft._id);
        expect(fully.status).toBe("approved");
    });

    it("denies a user who lacks the accountingApprove permission", async () => {
        const expenseAccountId = await accountIdByCode("6300");
        const cashId = await accountIdByCode("1000");

        await createApprovalRule({
            name: "All expenses → manager",
            minAmount: 0,
            maxAmount: null,
            approverRoles: ["manager"],
            isDefault: true,
            isActive: true,
        });

        const draft = await capture({
            amount: 200,
            expenseAccountId,
            creditAccountId: cashId,
        });
        await submit(draft._id);

        // Act as the manager (right role) but STRIP the accountingApprove flag —
        // the permission gate (fail-closed) denies the approval regardless.
        testCtx.user = { ...MANAGER };
        testCtx.role = {
            name: "manager",
            accountingManagement: true,
            accountingPost: true,
            accountingApprove: false,
            accountingSettings: true,
        };
        await expect(approve(draft._id)).rejects.toThrow();
    });
});

describe("vendor spend ties to posted entries (R11.2, R11.3)", () => {
    it("totals a posted expense's amount against its vendor via vendorSpendReport", async () => {
        const expenseAccountId = await accountIdByCode("6300");
        const cashId = await accountIdByCode("1000");

        const vendor = await createVendor({ name: "Optical Depot Ltd" });

        await createApprovalRule({
            name: "All expenses → manager",
            minAmount: 0,
            maxAmount: null,
            approverRoles: ["manager"],
            isDefault: true,
            isActive: true,
        });

        // Capture an expense WITH a vendorId, run it through to posted.
        const draft = await capture({
            amount: 750,
            expenseAccountId,
            creditAccountId: cashId,
            vendorId: vendor._id,
            description: "Frames restock",
        });
        await submit(draft._id);
        actAs(MANAGER);
        await approve(draft._id);
        actAs(ACCOUNTANT);
        const posted = await postExpense(draft._id);
        expect(posted.status).toBe("posted");

        // The vendor-spend report totals the posted expense amount for the vendor.
        const report = (await vendorSpendReport()) as Array<{
            vendorId: string;
            vendorName: string;
            total: number;
        }>;
        const row = report.find((r) => String(r.vendorId) === String(vendor._id));
        expect(row).toBeTruthy();
        expect(row!.total).toBe(750);
        expect(row!.vendorName).toBe("Optical Depot Ltd");
    });

    it("a draft (unposted) expense contributes nothing to vendor spend", async () => {
        const expenseAccountId = await accountIdByCode("6300");
        const cashId = await accountIdByCode("1000");
        const vendor = await createVendor({ name: "Pending Vendor" });

        // Captured but never posted → no posted journal entry carries this vendor.
        await capture({
            amount: 500,
            expenseAccountId,
            creditAccountId: cashId,
            vendorId: vendor._id,
        });

        const report = (await vendorSpendReport()) as Array<{ vendorId: string; total: number }>;
        const row = report.find((r) => String(r.vendorId) === String(vendor._id));
        expect(row).toBeFalsy();
    });
});
