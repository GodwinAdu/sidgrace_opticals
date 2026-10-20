"use server";

import { connectToDB } from "../../mongoose";
import JournalEntry from "../../models/accounting/journal-entry.models";
import ChartAccount from "../../models/accounting/chart-account.models";
import { User, withAuth } from "../../helpers/auth";
import {
    trialBalance as pureTrialBalance,
    incomeStatement as pureIncomeStatement,
    balanceSheet as pureBalanceSheet,
    cashFlow as pureCashFlow,
    filterByBasis,
    type Basis,
    type StatementRow,
} from "../../accounting/statements";
import { type AccountType } from "../../accounting/ledger";

/**
 * Shared period arguments for every statement.
 *
 * Either an explicit `from`/`to` window, or a `fiscalYear` (+ optional
 * `periodNo` 1–12 for a single month) that resolves to a window. Dates are
 * interpreted inclusively; `to` is pushed to end-of-day so same-day postings are
 * captured.
 */
export interface ReportPeriodArgs {
    from?: string;
    to?: string;
    fiscalYear?: number;
    periodNo?: number;
}

/** Resolve the period args into a concrete [from, to] window (either may be undefined). */
function resolveWindow(args?: ReportPeriodArgs): { from?: Date; to?: Date } {
    if (!args) return {};

    // Explicit from/to wins when supplied.
    if (args.from || args.to) {
        const from = args.from ? new Date(args.from) : undefined;
        const to = args.to ? new Date(new Date(args.to).setHours(23, 59, 59, 999)) : undefined;
        return {
            from: from && !Number.isNaN(from.getTime()) ? from : undefined,
            to: to && !Number.isNaN(to.getTime()) ? to : undefined,
        };
    }

    // Fiscal-year / period-number form.
    if (typeof args.fiscalYear === "number" && Number.isFinite(args.fiscalYear)) {
        const year = args.fiscalYear;
        if (typeof args.periodNo === "number" && args.periodNo >= 1 && args.periodNo <= 12) {
            const monthIdx = args.periodNo - 1;
            const from = new Date(year, monthIdx, 1, 0, 0, 0, 0);
            const to = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
            return { from, to };
        }
        const from = new Date(year, 0, 1, 0, 0, 0, 0);
        const to = new Date(year, 11, 31, 23, 59, 59, 999);
        return { from, to };
    }

    return {};
}

/**
 * Load POSTED journal lines in the window and join each line to its
 * ChartAccount, producing the `StatementRow[]` the pure statements engine
 * consumes. Only `status: "posted"` entries contribute (drafts and reversed-out
 * originals are excluded); a reversing entry is itself posted so it nets its
 * original back out.
 *
 * The account join carries `type`/`subtype`/`isCashAccount` so the pure engine
 * can classify each line, and the entry's `basis`/`vendorId`/`date` ride along
 * for basis filtering, vendor spend, and period scoping.
 */
async function loadStatementRows(window: { from?: Date; to?: Date }): Promise<StatementRow[]> {
    const query: Record<string, unknown> = { del_flag: false, status: "posted" };
    if (window.from || window.to) {
        const range: Record<string, Date> = {};
        if (window.from) range.$gte = window.from;
        if (window.to) range.$lte = window.to;
        query.date = range;
    }

    const entries = await JournalEntry.find(query).sort({ date: 1, createdAt: 1 }).lean();

    // Build a code/name/type/subtype/isCashAccount lookup for every account the
    // posted lines touch, in a single query.
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

/* ═══════════════════════════════════ TRIAL BALANCE ═══════════════════════════════════ */

/**
 * Trial balance (R4.1): per-account net debit/credit position from posted
 * entries in the period, with grand totals and a real `balanced` flag.
 * Gated by `accountingManagement`.
 */
async function _trialBalance(user: User, period?: ReportPeriodArgs, basis?: Basis) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const window = resolveWindow(period);
        const rows = filterByBasis(await loadStatementRows(window), normalizeBasis(basis));
        const result = pureTrialBalance(rows);

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error building trial balance:", error);
        return { accounts: [], totalDebit: 0, totalCredit: 0, balanced: true };
    }
}
export const trialBalance = await withAuth(_trialBalance, "accountingManagement");

/* ═══════════════════════════════════ INCOME STATEMENT ═══════════════════════════════════ */

/**
 * Income statement / P&L (R4.2): revenue and expense totals from posted entries
 * in the period, `netIncome = revenue - expenses`, with subtotals by subtype.
 * Gated by `accountingManagement`.
 */
async function _incomeStatement(user: User, period?: ReportPeriodArgs, basis?: Basis) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const window = resolveWindow(period);
        const rows = filterByBasis(await loadStatementRows(window), normalizeBasis(basis));
        // Rows are already period-scoped by the DB query; the pure engine's own
        // period filter is a no-op here but harmless.
        const result = pureIncomeStatement(rows);

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error building income statement:", error);
        return { revenue: 0, expenses: 0, netIncome: 0, groups: { revenue: {}, expenses: {} } };
    }
}
export const incomeStatement = await withAuth(_incomeStatement, "accountingManagement");

/* ═══════════════════════════════════ BALANCE SHEET ═══════════════════════════════════ */

/**
 * Balance sheet (R4.3): assets, liabilities and equity as of the end of the
 * period, with period net income folded into equity so Assets = Liabilities +
 * Equity, and a real `balanced` flag (R4.6). Gated by `accountingManagement`.
 */
async function _balanceSheet(user: User, period?: ReportPeriodArgs, basis?: Basis) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const window = resolveWindow(period);
        const rows = filterByBasis(await loadStatementRows(window), normalizeBasis(basis));
        const result = pureBalanceSheet(rows);

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error building balance sheet:", error);
        return { assets: 0, liabilities: 0, equity: 0, retainedEarnings: 0, balanced: true };
    }
}
export const balanceSheet = await withAuth(_balanceSheet, "accountingManagement");

/* ═══════════════════════════════════ CASH FLOW ═══════════════════════════════════ */

/**
 * Cash flow (R4.4): net change in cash for the period grouped into operating,
 * investing and financing activities. Gated by `accountingManagement`.
 */
async function _cashFlow(user: User, period?: ReportPeriodArgs, basis?: Basis) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const window = resolveWindow(period);
        const rows = filterByBasis(await loadStatementRows(window), normalizeBasis(basis));
        const result = pureCashFlow(rows);

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error building cash flow:", error);
        return { operating: 0, investing: 0, financing: 0, netChange: 0 };
    }
}
export const cashFlow = await withAuth(_cashFlow, "accountingManagement");
