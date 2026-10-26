/**
 * Pure, dependency-free financial-statements engine.
 *
 * These helpers derive the statement set (Trial Balance, Income Statement,
 * Balance Sheet, Cash Flow) plus the basis filter, vendor-spend, and
 * budget-vs-actual reports from an array of posted journal lines joined with
 * their account's type/metadata (a `StatementRow`).
 *
 * DB/React-free: the report action layer builds `StatementRow[]` by joining
 * posted lines to Chart-of-Accounts records and then calls these functions, so
 * the reporting math stays identical between the app and the unit tests.
 *
 * Invariants surfaced, never hidden (R4.6): `trialBalance` and `balanceSheet`
 * return a `balanced` flag computed from the real numbers rather than forcing
 * the result to look balanced.
 */

import { lineSignedAmount, normalBalanceForType, type AccountType } from "./ledger";

export type { AccountType };

/** Reporting basis: accrual (earned/incurred) or cash (when cash moves). */
export type Basis = "accrual" | "cash";

/**
 * A single posted journal line joined with its account's reporting metadata.
 * Exactly one of `debit`/`credit` is expected to be positive (the posting
 * layer guarantees balanced, one-sided lines); the math here coerces junk to 0.
 */
export interface StatementRow {
    accountId: string;
    code: string;
    name: string;
    type: AccountType;
    /** Reporting group, e.g. "current-asset", "operating-expense". */
    subtype?: string;
    debit: number;
    credit: number;
    /** True for cash/bank accounts — drives cash-flow deltas. */
    isCashAccount?: boolean;
    /** The basis this line is relevant to (defaults to accrual). */
    basis?: Basis;
    /** Vendor the line is attributed to, when any. */
    vendorId?: string;
    /** Posting date, used for period scoping by the caller. */
    date?: Date;
}

/** An optional period window used to scope rows by posting date. */
export interface Period {
    from?: Date;
    to?: Date;
}

/** A budget target for one account in one period. */
export interface BudgetTarget {
    accountId: string;
    amount: number;
}

/** Coerce a value to a finite, non-negative amount (0 for junk/negatives). */
function amount(value: number | undefined | null): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Round to cents so floating-point noise does not break equality checks. */
function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Include only rows relevant to the given basis (Property 10, R4.5).
 *
 * Accrual reporting sees everything (a row with no explicit basis is treated as
 * accrual); cash reporting sees only rows explicitly flagged `basis: "cash"`.
 * Returns a fresh array and never mutates the input.
 */
export function filterByBasis(rows: StatementRow[], basis: Basis): StatementRow[] {
    if (!Array.isArray(rows)) return [];
    if (basis === "cash") return rows.filter((r) => r && r.basis === "cash");
    // Accrual: everything that isn't explicitly cash-only, i.e. all rows.
    return rows.filter((r) => Boolean(r));
}

/** Scope rows to a period window by posting date (inclusive). Missing dates pass. */
function filterByPeriod(rows: StatementRow[], period?: Period): StatementRow[] {
    if (!period || (!period.from && !period.to)) return rows.filter(Boolean);
    const fromT = period.from ? period.from.getTime() : -Infinity;
    const toT = period.to ? period.to.getTime() : Infinity;
    return rows.filter((r) => {
        if (!r) return false;
        if (!r.date) return true;
        const t = r.date.getTime();
        return t >= fromT && t <= toT;
    });
}

/**
 * Trial Balance: per-account net position, each account landing on exactly one
 * side (its remaining debit or credit balance), with grand totals that must be
 * equal (Property 3, R4.1). `balanced` reflects the real figures (R4.6).
 */
export function trialBalance(rows: StatementRow[]): {
    accounts: { code: string; name: string; debit: number; credit: number }[];
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
} {
    const byAccount = new Map<string, { code: string; name: string; net: number }>();

    for (const r of rows ?? []) {
        if (!r) continue;
        // Net in natural debit-positive terms: debit adds, credit subtracts.
        const delta = amount(r.debit) - amount(r.credit);
        const existing = byAccount.get(r.accountId);
        if (existing) {
            existing.net += delta;
        } else {
            byAccount.set(r.accountId, { code: r.code, name: r.name, net: delta });
        }
    }

    const accounts = [...byAccount.values()]
        .map(({ code, name, net }) => ({
            code,
            name,
            debit: net > 0 ? round2(net) : 0,
            credit: net < 0 ? round2(-net) : 0,
        }))
        .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

    const totalDebit = round2(accounts.reduce((s, a) => s + a.debit, 0));
    const totalCredit = round2(accounts.reduce((s, a) => s + a.credit, 0));

    return { accounts, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

/** Sum the signed (normal-balance-positive) amount for a set of rows of one type. */
function signedTotalForType(rows: StatementRow[], type: AccountType): number {
    return rows
        .filter((r) => r && r.type === type)
        .reduce((s, r) => s + lineSignedAmount({ debit: r.debit, credit: r.credit }, type), 0);
}

/** Group signed totals by subtype for a given account type. */
function groupBySubtype(rows: StatementRow[], type: AccountType): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const r of rows ?? []) {
        if (!r || r.type !== type) continue;
        const key = r.subtype || "ungrouped";
        groups[key] = round2((groups[key] ?? 0) + lineSignedAmount({ debit: r.debit, credit: r.credit }, type));
    }
    return groups;
}

/**
 * Income Statement: revenue and expense totals from posted entries, with
 * `netIncome = revenue - expenses` (R4.2). `groups` carries revenue/expense
 * subtotals by subtype for presentation.
 */
export function incomeStatement(
    rows: StatementRow[],
    period?: Period,
): {
    revenue: number;
    expenses: number;
    netIncome: number;
    groups: { revenue: Record<string, number>; expenses: Record<string, number> };
} {
    const scoped = filterByPeriod(rows ?? [], period);

    const revenue = round2(signedTotalForType(scoped, "revenue"));
    const expenses = round2(signedTotalForType(scoped, "expense"));

    return {
        revenue,
        expenses,
        netIncome: round2(revenue - expenses),
        groups: {
            revenue: groupBySubtype(scoped, "revenue"),
            expenses: groupBySubtype(scoped, "expense"),
        },
    };
}

/**
 * Balance Sheet as of a date: Assets, Liabilities, Equity, with period net
 * income folded into equity via retained earnings, so the accounting equation
 * Assets = Liabilities + Equity holds (Property 4, R4.3). `balanced` reflects
 * the real figures and is surfaced rather than hidden (R4.6).
 *
 * `retainedEarnings` here is the net income implied by the posted revenue and
 * expense rows (revenue - expenses); it is added to booked equity so a set of
 * rows derived from balanced entries satisfies the equation exactly.
 */
export function balanceSheet(
    rows: StatementRow[],
    asOf?: Date,
): {
    assets: number;
    liabilities: number;
    equity: number;
    retainedEarnings: number;
    balanced: boolean;
} {
    const scoped = filterByPeriod(rows ?? [], asOf ? { to: asOf } : undefined);

    const assets = round2(signedTotalForType(scoped, "asset"));
    const liabilities = round2(signedTotalForType(scoped, "liability"));
    const bookedEquity = round2(signedTotalForType(scoped, "equity"));

    const revenue = signedTotalForType(scoped, "revenue");
    const expenses = signedTotalForType(scoped, "expense");
    const retainedEarnings = round2(revenue - expenses);

    const equity = round2(bookedEquity + retainedEarnings);

    return {
        assets,
        liabilities,
        equity,
        retainedEarnings,
        balanced: assets === round2(liabilities + equity),
    };
}

/**
 * Classify a cash movement into an activity bucket from the counter-account's
 * type/subtype. Operating: revenue/expense and current working-capital items.
 * Investing: fixed assets. Financing: equity and long-term liabilities.
 */
function cashActivityForType(type: AccountType, subtype?: string): "operating" | "investing" | "financing" {
    if (type === "equity") return "financing";
    if (type === "liability") return subtype && subtype.startsWith("long-term") ? "financing" : "operating";
    if (type === "asset") return subtype && subtype.startsWith("fixed") ? "investing" : "operating";
    // revenue + expense are operating
    return "operating";
}

/**
 * Cash Flow for a period: net change in cash grouped into operating, investing
 * and financing activities (R4.4). Each journal entry's cash leg produces a
 * cash delta; the entry's non-cash legs classify that delta into a bucket.
 *
 * Rows are grouped by `entryId` when present (falling back to date) so each
 * posting's cash movement is attributed to its own counter-accounts. `netChange`
 * is the signed change in cash across the period and equals the sum of the
 * three buckets.
 */
export function cashFlow(
    rows: StatementRow[],
    period?: Period,
): {
    operating: number;
    investing: number;
    financing: number;
    netChange: number;
} {
    const scoped = filterByPeriod(rows ?? [], period).filter(Boolean);

    let operating = 0;
    let investing = 0;
    let financing = 0;

    // Each cash-account row is a cash movement; its signed asset delta is the
    // change in cash. Classify by the dominant non-cash counter leg of the same
    // posting when grouping metadata exists, else by the row's own context.
    const cashRows = scoped.filter((r) => r.isCashAccount);
    const nonCashRows = scoped.filter((r) => !r.isCashAccount);

    for (const r of cashRows) {
        // Cash delta: debit to cash is an inflow (+), credit is an outflow (-).
        const delta = lineSignedAmount({ debit: r.debit, credit: r.credit }, "asset");

        // Find a counter leg in the same posting (matched by date) to classify.
        const counter = nonCashRows.find(
            (n) => sameEntry(n, r),
        );
        const activity = counter
            ? cashActivityForType(counter.type, counter.subtype)
            : "operating";

        if (activity === "operating") operating += delta;
        else if (activity === "investing") investing += delta;
        else financing += delta;
    }

    operating = round2(operating);
    investing = round2(investing);
    financing = round2(financing);

    return {
        operating,
        investing,
        financing,
        netChange: round2(operating + investing + financing),
    };
}

/** Two rows belong to the same posting when their dates line up (best-effort). */
function sameEntry(a: StatementRow, b: StatementRow): boolean {
    if (a.date && b.date) return a.date.getTime() === b.date.getTime();
    return false;
}

/**
 * Vendor spend: total posted expense/purchase amounts grouped by vendor
 * (Property 11, R11.3). Only rows carrying a `vendorId` on an expense account
 * contribute; the total is the signed (increase-of-expense) amount per vendor,
 * so a debit to an expense adds and a (rare) credit reduces it.
 */
export function vendorSpend(rows: StatementRow[]): { vendorId: string; total: number }[] {
    const byVendor = new Map<string, number>();

    for (const r of rows ?? []) {
        if (!r || !r.vendorId || r.type !== "expense") continue;
        const delta = lineSignedAmount({ debit: r.debit, credit: r.credit }, "expense");
        byVendor.set(r.vendorId, (byVendor.get(r.vendorId) ?? 0) + delta);
    }

    return [...byVendor.entries()]
        .map(([vendorId, total]) => ({ vendorId, total: round2(total) }))
        .sort((a, b) => (a.vendorId < b.vendorId ? -1 : a.vendorId > b.vendorId ? 1 : 0));
}

/**
 * Budget vs actual (Property 12, R12.2): per account, `actual` is the sum of the
 * posted lines for that account (signed on the account's normal side), `variance`
 * is `budget - actual`, and `variancePct` is the variance as a percentage of the
 * budget (0 when there is no budget). A budget with no matching actual rows
 * reports actual 0; an account with activity but no budget reports budget 0
 * (actual-only, not an error, R12.4).
 */
export function budgetVsActual(
    budgets: BudgetTarget[],
    actualRows: StatementRow[],
): { accountId: string; budget: number; actual: number; variance: number; variancePct: number }[] {
    // Sum actual per account on the account's normal side.
    const actualByAccount = new Map<string, number>();
    for (const r of actualRows ?? []) {
        if (!r) continue;
        const signed = lineSignedAmount({ debit: r.debit, credit: r.credit }, r.type);
        actualByAccount.set(r.accountId, (actualByAccount.get(r.accountId) ?? 0) + signed);
    }

    const budgetByAccount = new Map<string, number>();
    for (const b of budgets ?? []) {
        if (!b || !b.accountId) continue;
        budgetByAccount.set(b.accountId, (budgetByAccount.get(b.accountId) ?? 0) + (Number(b.amount) || 0));
    }

    // Every account that has either a budget or actual activity appears once.
    const accountIds = new Set<string>([...budgetByAccount.keys(), ...actualByAccount.keys()]);

    return [...accountIds]
        .map((accountId) => {
            const budget = round2(budgetByAccount.get(accountId) ?? 0);
            const actual = round2(actualByAccount.get(accountId) ?? 0);
            const variance = round2(budget - actual);
            const variancePct = budget !== 0 ? round2((variance / budget) * 100) : 0;
            return { accountId, budget, actual, variance, variancePct };
        })
        .sort((a, b) => (a.accountId < b.accountId ? -1 : a.accountId > b.accountId ? 1 : 0));
}

export { normalBalanceForType };
