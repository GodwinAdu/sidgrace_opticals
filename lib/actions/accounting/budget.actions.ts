"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import Budget from "../../models/accounting/budget.models";
import JournalEntry from "../../models/accounting/journal-entry.models";
import ChartAccount from "../../models/accounting/chart-account.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";
import {
    budgetVsActual as pureBudgetVsActual,
    filterByBasis,
    type Basis,
    type StatementRow,
    type BudgetTarget,
} from "../../accounting/statements";
import { lineSignedAmount, type AccountType } from "../../accounting/ledger";

const BUDGET_PATH = "/dashboard/account";

/* ════════════════════════════════ HELPERS ════════════════════════════════ */

/**
 * A fiscal period expressed as a `fiscalYear` plus an optional `periodNo`
 * (1..12 for a single calendar month; absent/null = the whole year). This is
 * the same shape budgets are keyed on and the over-budget check consumes.
 */
export interface BudgetPeriod {
    fiscalYear: number;
    periodNo?: number | null;
}

/**
 * Resolve a budget period into the concrete [from, to] posting-date window used
 * to scope posted journal lines — mirroring the report layer so budget-vs-actual
 * reads the same actual as the statements. A `periodNo` of 1..12 is a calendar
 * month; anything else (or null) is the whole fiscal year. `to` is pushed to
 * end-of-day so same-day postings are captured.
 */
function resolveWindow(period: BudgetPeriod): { from: Date; to: Date } {
    const year = period.fiscalYear;
    const periodNo = period.periodNo;
    if (typeof periodNo === "number" && periodNo >= 1 && periodNo <= 12) {
        const monthIdx = periodNo - 1;
        return {
            from: new Date(year, monthIdx, 1, 0, 0, 0, 0),
            to: new Date(year, monthIdx + 1, 0, 23, 59, 59, 999),
        };
    }
    return {
        from: new Date(year, 0, 1, 0, 0, 0, 0),
        to: new Date(year, 11, 31, 23, 59, 59, 999),
    };
}

/**
 * Derive the fiscal `fiscalYear`/`periodNo` a posting date falls in, using the
 * same calendar-month convention as the report/period layer (periodNo = month,
 * 1..12). The expense submit hook uses this to look up the matching budget.
 */
function periodForDate(date: Date): BudgetPeriod {
    return { fiscalYear: date.getFullYear(), periodNo: date.getMonth() + 1 };
}

/**
 * Load POSTED journal lines in a window and join each to its ChartAccount,
 * producing the `StatementRow[]` the pure budget engine consumes. Mirrors the
 * report layer's loader so budget-vs-actual actuals equal the statement actuals.
 */
async function loadStatementRows(window: { from: Date; to: Date }): Promise<StatementRow[]> {
    const entries = await JournalEntry.find({
        del_flag: false,
        status: "posted",
        date: { $gte: window.from, $lte: window.to },
    })
        .sort({ date: 1, createdAt: 1 })
        .lean();

    const accountIds = new Set<string>();
    for (const entry of entries) {
        for (const line of entry.lines || []) {
            if (line?.accountId) accountIds.add(String(line.accountId));
        }
    }

    const accounts = await ChartAccount.find({ _id: { $in: [...accountIds] } }).lean();
    const accountById = new Map<
        string,
        { code: string; name: string; type: AccountType; subtype?: string; isCashAccount?: boolean }
    >();
    for (const acc of accounts) {
        accountById.set(String(acc._id), {
            code: acc.code,
            name: acc.name,
            type: acc.type as AccountType,
            subtype: acc.subtype || undefined,
            isCashAccount: Boolean(acc.isCashAccount),
        });
    }

    const rows: StatementRow[] = [];
    for (const entry of entries) {
        const basis: Basis = entry.basis === "cash" ? "cash" : "accrual";
        for (const line of entry.lines || []) {
            if (!line?.accountId) continue;
            const acc = accountById.get(String(line.accountId));
            if (!acc) continue;
            rows.push({
                accountId: String(line.accountId),
                code: acc.code,
                name: acc.name,
                type: acc.type,
                subtype: acc.subtype,
                debit: line.debit || 0,
                credit: line.credit || 0,
                isCashAccount: acc.isCashAccount,
                basis,
                vendorId: entry.vendorId ? String(entry.vendorId) : undefined,
                date: new Date(entry.date),
            });
        }
    }

    return rows;
}

/** Coerce an untrusted basis arg into a valid `Basis` (defaults to accrual). */
function normalizeBasis(basis?: Basis | string): Basis {
    return basis === "cash" ? "cash" : "accrual";
}

/* ════════════════════════════════ CRUD ════════════════════════════════ */

interface CreateBudgetInput {
    fiscalYear: number;
    periodNo?: number | null;
    accountId: string;
    departmentId?: string | null;
    amount: number;
    note?: string;
}

/**
 * Create a budget target for an account in a fiscal period (R12.1). `periodNo`
 * null = a whole-year budget; `departmentId` optionally scopes it to a cost
 * center. The unique (fiscalYear, periodNo, accountId, departmentId) index
 * blocks duplicates — a clearer error is surfaced on a duplicate-key clash.
 * Gated by `accountingSettings`; audited with the actor (R12.5).
 */
async function _createBudget(user: User, values: CreateBudgetInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const fiscalYear = Number(values?.fiscalYear);
        if (!Number.isInteger(fiscalYear) || fiscalYear < 1900) {
            throw new Error("A valid fiscal year is required");
        }
        if (!values?.accountId) throw new Error("A budgeted account is required");

        const amount = Number(values?.amount);
        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error("A budget amount must be zero or greater");
        }

        let periodNo: number | null = null;
        if (values.periodNo !== undefined && values.periodNo !== null) {
            const p = Number(values.periodNo);
            if (!Number.isInteger(p) || p < 1 || p > 13) {
                throw new Error("A period number must be between 1 and 13 (or empty for the whole year)");
            }
            periodNo = p;
        }

        const account = await ChartAccount.findById(values.accountId).lean();
        if (!account) throw new Error("The budgeted account was not found");

        let budget;
        try {
            budget = await Budget.create({
                fiscalYear,
                periodNo,
                accountId: values.accountId,
                departmentId: values.departmentId || null,
                amount,
                note: values.note?.trim() || "",
                createdBy: user._id,
                action_type: "created",
            });
        } catch (err) {
            if ((err as { code?: number })?.code === 11000) {
                throw new Error(
                    "A budget already exists for this account, period and department. Edit it instead.",
                );
            }
            throw err;
        }

        await History.create({
            actionType: "BUDGET_CREATED",
            details: {
                itemId: budget._id,
                fiscalYear,
                periodNo,
                accountId: values.accountId,
                departmentId: values.departmentId || null,
                amount,
            },
            message: `${user.fullName} created a budget for account ${account.code} (${account.name}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: budget._id,
            entityType: "BUDGET",
        });

        revalidatePath(BUDGET_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(budget));
    } catch (error) {
        console.error("Error creating budget:", error);
        throw error;
    }
}
export const createBudget = await withAuth(_createBudget, "accountingSettings");

interface UpdateBudgetInput {
    amount?: number;
    note?: string;
    departmentId?: string | null;
}

/**
 * Update a budget's amount, note, or department. The period/account keys are
 * fixed on create (change them by deleting and recreating). Only the supplied
 * fields change. Gated by `accountingSettings`; audited with the actor (R12.5).
 */
async function _updateBudget(user: User, id: string, values: UpdateBudgetInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A budget is required");
        await connectToDB();

        const budget = await Budget.findById(id);
        if (!budget || budget.del_flag) throw new Error("Budget not found");

        if (values.amount !== undefined) {
            const amount = Number(values.amount);
            if (!Number.isFinite(amount) || amount < 0) {
                throw new Error("A budget amount must be zero or greater");
            }
            budget.amount = amount;
        }
        if (values.note !== undefined) budget.note = values.note.trim();
        if (values.departmentId !== undefined) {
            budget.departmentId = (values.departmentId || null) as never;
        }

        budget.mod_flag = true;
        budget.modifiedBy = user._id as never;
        budget.action_type = "updated";

        try {
            await budget.save();
        } catch (err) {
            if ((err as { code?: number })?.code === 11000) {
                throw new Error(
                    "A budget already exists for this account, period and department. Edit it instead.",
                );
            }
            throw err;
        }

        await History.create({
            actionType: "BUDGET_UPDATED",
            details: {
                itemId: budget._id,
                fiscalYear: budget.fiscalYear,
                periodNo: budget.periodNo,
                accountId: budget.accountId,
                amount: budget.amount,
            },
            message: `${user.fullName} updated a budget on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: budget._id,
            entityType: "BUDGET",
        });

        revalidatePath(BUDGET_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(budget));
    } catch (error) {
        console.error("Error updating budget:", error);
        throw error;
    }
}
export const updateBudget = await withAuth(_updateBudget, "accountingSettings");

/**
 * Hard-delete a budget (budgets carry no posted ledger activity, so a straight
 * delete is safe). Gated by `accountingSettings`; audited with the actor
 * (R12.5).
 */
async function _deleteBudget(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A budget is required");
        await connectToDB();

        const budget = await Budget.findById(id);
        if (!budget) throw new Error("Budget not found");

        const deletedId = budget._id;
        const { fiscalYear, periodNo, accountId, amount } = budget;
        await Budget.deleteOne({ _id: budget._id });

        await History.create({
            actionType: "BUDGET_DELETED",
            details: { itemId: deletedId, fiscalYear, periodNo, accountId, amount },
            message: `${user.fullName} deleted a budget on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: deletedId,
            entityType: "BUDGET",
        });

        revalidatePath(BUDGET_PATH);
        if (path) revalidatePath(path);
        return { success: true, message: "Budget deleted successfully" };
    } catch (error) {
        console.error("Error deleting budget:", error);
        throw error;
    }
}
export const deleteBudget = await withAuth(_deleteBudget, "accountingSettings");

/* ════════════════════════════════ READS ════════════════════════════════ */

interface ListBudgetInput {
    fiscalYear?: number;
    periodNo?: number | null;
    accountId?: string;
    departmentId?: string | null;
}

/**
 * List budgets, optionally filtered by fiscal year, period, account, and
 * department, with the account's code/name/type joined for presentation.
 * Read-only; gated by `accountingManagement`.
 */
async function _listBudgets(user: User, filter?: ListBudgetInput) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const query: Record<string, unknown> = { del_flag: false };
        if (filter?.fiscalYear !== undefined) query.fiscalYear = Number(filter.fiscalYear);
        if (filter?.periodNo !== undefined) query.periodNo = filter.periodNo;
        if (filter?.accountId) query.accountId = filter.accountId;
        if (filter?.departmentId !== undefined) query.departmentId = filter.departmentId;

        const budgets = await Budget.find(query)
            .populate("accountId", "code name type")
            .populate("departmentId", "name")
            .sort({ fiscalYear: -1, periodNo: 1 })
            .lean();
        return JSON.parse(JSON.stringify(budgets || []));
    } catch (error) {
        console.error("Error listing budgets:", error);
        return [];
    }
}
export const listBudgets = await withAuth(_listBudgets, "accountingManagement");

/**
 * Read a single budget with its account and department joined. Read-only; gated
 * by `accountingManagement`.
 */
async function _getBudget(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A budget is required");
        await connectToDB();

        const budget = await Budget.findById(id)
            .populate("accountId", "code name type")
            .populate("departmentId", "name")
            .lean();
        if (!budget) return null;
        return JSON.parse(JSON.stringify(budget));
    } catch (error) {
        console.error("Error fetching budget:", error);
        return null;
    }
}
export const getBudget = await withAuth(_getBudget, "accountingManagement");

/* ════════════════════════════ BUDGET VS ACTUAL ════════════════════════════ */

/**
 * Budget-vs-actual for a fiscal period (R12.2). Loads the budgets for the period
 * (an exact `periodNo` match when supplied, else the whole-year budgets) and the
 * POSTED journal lines in the period's window, builds the actual rows, and calls
 * the pure `budgetVsActual` engine so the math matches the unit tests exactly.
 * The account `code`/`name` are joined for presentation. A budgeted account with
 * no activity reports actual 0; an account with activity but no budget reports
 * budget 0 (actual-only, not an error, R12.4). Read-only; gated by
 * `accountingManagement`.
 */
async function _budgetVsActual(
    user: User,
    fiscalYear: number,
    periodNo?: number | null,
    basis?: Basis,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const year = Number(fiscalYear);
        if (!Number.isInteger(year) || year < 1900) throw new Error("A valid fiscal year is required");

        const period: BudgetPeriod = {
            fiscalYear: year,
            periodNo: periodNo === undefined ? null : periodNo,
        };

        // Load the budgets for this exact period scope.
        const budgetDocs = await Budget.find({
            del_flag: false,
            fiscalYear: year,
            periodNo: period.periodNo,
        }).lean();

        const budgets: BudgetTarget[] = budgetDocs.map((b) => ({
            accountId: String(b.accountId),
            amount: Number(b.amount) || 0,
        }));

        // Load the actual from posted lines in the period's window.
        const window = resolveWindow(period);
        const rows = filterByBasis(await loadStatementRows(window), normalizeBasis(basis));

        const result = pureBudgetVsActual(budgets, rows);

        // Join account code/name for presentation. Pull from the loaded rows
        // first (already in-memory), falling back to a Chart lookup for any
        // budgeted account with no activity this period.
        const metaById = new Map<string, { code: string; name: string }>();
        for (const r of rows) {
            if (!metaById.has(r.accountId)) metaById.set(r.accountId, { code: r.code, name: r.name });
        }
        const missing = result
            .map((r) => r.accountId)
            .filter((id) => !metaById.has(id));
        if (missing.length) {
            const accounts = await ChartAccount.find({ _id: { $in: missing } })
                .select("code name")
                .lean();
            for (const acc of accounts) {
                metaById.set(String(acc._id), { code: acc.code, name: acc.name });
            }
        }

        const report = result.map((r) => ({
            ...r,
            code: metaById.get(r.accountId)?.code || "",
            name: metaById.get(r.accountId)?.name || "",
        }));

        return JSON.parse(
            JSON.stringify({ fiscalYear: year, periodNo: period.periodNo, rows: report }),
        );
    } catch (error) {
        console.error("Error building budget vs actual:", error);
        return { fiscalYear: Number(fiscalYear) || 0, periodNo: periodNo ?? null, rows: [] };
    }
}
export const budgetVsActual = await withAuth(_budgetVsActual, "accountingManagement");

/* ════════════════════════════ OVER-BUDGET CHECK ════════════════════════════ */

export interface OverBudgetResult {
    overBudget: boolean;
    budget: number;
    actual: number;
    projected: number;
    mode: "warn" | "block";
}

/**
 * Internal over-budget check (R12.3, R12.4). Computes the account's current
 * actual for the period from POSTED lines, projects `actual + addAmount`, and
 * compares it against the account's budget for the period. Returns the mode read
 * from `AccountingSettings.overBudgetMode` ("warn" | "block", default "warn").
 *
 * A MISSING budget is a no-op: `overBudget` is false and `budget` is 0 — the
 * submission is never blocked just because no budget was set (R12.4). This is
 * the non-gated core so the expense submit flow can call it without a second
 * permission check inside an already-authorised action.
 */
export async function checkOverBudgetInternal(
    accountId: string,
    period: BudgetPeriod,
    addAmount: number,
): Promise<OverBudgetResult> {
    await connectToDB();

    // Read the configurable mode without a permission gate (default warn).
    const settings = await (
        await import("./accounting-settings.actions")
    ).getSettingsInternal();
    const mode: "warn" | "block" = settings?.overBudgetMode === "block" ? "block" : "warn";

    const add = Number(addAmount) || 0;

    if (!accountId) {
        return { overBudget: false, budget: 0, actual: 0, projected: add, mode };
    }

    // Find the budget for this account+period (exact periodNo match, incl. the
    // whole-year budget when periodNo is null).
    const budgetDoc = await Budget.findOne({
        del_flag: false,
        fiscalYear: period.fiscalYear,
        periodNo: period.periodNo === undefined ? null : period.periodNo,
        accountId,
    }).lean();

    // Current actual for the account in the period, on its normal side.
    const window = resolveWindow(period);
    const rows = (await loadStatementRows(window)).filter((r) => r.accountId === String(accountId));
    const actual = rows.reduce(
        (sum, r) => sum + lineSignedAmount({ debit: r.debit, credit: r.credit }, r.type),
        0,
    );
    const projected = round2(actual + add);

    // No budget → no-op (not over budget), R12.4.
    if (!budgetDoc) {
        return { overBudget: false, budget: 0, actual: round2(actual), projected, mode };
    }

    const budget = Number(budgetDoc.amount) || 0;
    return {
        overBudget: projected > budget,
        budget: round2(budget),
        actual: round2(actual),
        projected,
        mode,
    };
}

/** Round to cents so floating-point noise does not break the comparison. */
function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Over-budget check (R12.3, R12.4) exposed as a gated action for UI callers
 * (e.g. a pre-submit preview). Compares `actual + addAmount` against the budget
 * for the account/period and returns `{ overBudget, budget, actual, projected,
 * mode }`. A missing budget is a no-op (not over budget). This is a read-ish
 * check, so it is gated by `accountingManagement`.
 */
async function _checkOverBudget(
    user: User,
    accountId: string,
    period: BudgetPeriod,
    addAmount: number,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        const result = await checkOverBudgetInternal(accountId, period, addAmount);
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error checking over-budget:", error);
        throw error;
    }
}
export const checkOverBudget = await withAuth(_checkOverBudget, "accountingManagement");

/**
 * Derive the fiscal `{ fiscalYear, periodNo }` a date falls in (calendar-month
 * convention, periodNo 1..12). Exposed for server-side callers — e.g. the
 * expense submit flow deriving the period for the over-budget hook.
 */
export async function budgetPeriodForDate(date: Date | string): Promise<BudgetPeriod> {
    return periodForDate(new Date(date));
}
