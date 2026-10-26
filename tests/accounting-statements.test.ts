import { describe, it, expect } from "vitest";
import {
    trialBalance,
    incomeStatement,
    balanceSheet,
    cashFlow,
    filterByBasis,
    vendorSpend,
    budgetVsActual,
    type StatementRow,
    type Basis,
    type BudgetTarget,
} from "../lib/accounting/statements";
import { lineSignedAmount, type AccountType } from "../lib/accounting/ledger";

/* ------------------------------------------------------------------ helpers */

const rint = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

let seq = 0;
const nextCode = () => `${1000 + seq++}`;

/** A debit row for an account of a given type. */
function debitRow(
    type: AccountType,
    debit: number,
    extra: Partial<StatementRow> = {},
): StatementRow {
    const code = extra.code ?? nextCode();
    return { accountId: extra.accountId ?? code, code, name: `acct-${code}`, type, debit, credit: 0, ...extra };
}

/** A credit row for an account of a given type. */
function creditRow(
    type: AccountType,
    credit: number,
    extra: Partial<StatementRow> = {},
): StatementRow {
    const code = extra.code ?? nextCode();
    return { accountId: extra.accountId ?? code, code, name: `acct-${code}`, type, debit: 0, credit, ...extra };
}

/**
 * Build a random set of rows derived from BALANCED journal entries. Each entry
 * is one debit leg and one balancing credit leg, each leg landing on a random
 * account type, so the whole set has total debits == total credits. We also
 * fold revenue/expense into the mix so the balance-sheet net-income path is
 * exercised. Returns the flat row list.
 */
function randomBalancedRows(entryCount: number): StatementRow[] {
    const rows: StatementRow[] = [];
    const types: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];
    for (let i = 0; i < entryCount; i++) {
        const value = rint(1, 5000);
        const debitType = types[rint(0, types.length - 1)];
        const creditType = types[rint(0, types.length - 1)];
        rows.push(debitRow(debitType, value));
        rows.push(creditRow(creditType, value));
    }
    return rows;
}

/* ------------------------------------------------- Property 3: Trial balance */

/**
 * Property 3: trial balance balances.
 * Validates: Requirements 4.1
 */
describe("trialBalance", () => {
    it("has equal total debits and credits for a simple balanced set", () => {
        const rows: StatementRow[] = [
            debitRow("asset", 100, { accountId: "cash", code: "1000" }),
            creditRow("revenue", 100, { accountId: "rev", code: "4000" }),
        ];
        const tb = trialBalance(rows);
        expect(tb.totalDebit).toBe(tb.totalCredit);
        expect(tb.balanced).toBe(true);
    });

    it("nets multiple lines for the same account onto one side", () => {
        const rows: StatementRow[] = [
            debitRow("asset", 200, { accountId: "cash", code: "1000" }),
            creditRow("asset", 50, { accountId: "cash", code: "1000" }),
            creditRow("revenue", 150, { accountId: "rev", code: "4000" }),
        ];
        const tb = trialBalance(rows);
        const cash = tb.accounts.find((a) => a.code === "1000");
        expect(cash).toBeDefined();
        expect(cash!.debit).toBe(150);
        expect(cash!.credit).toBe(0);
        expect(tb.totalDebit).toBe(tb.totalCredit);
    });

    it("surfaces an imbalance rather than hiding it (R4.6)", () => {
        const rows: StatementRow[] = [
            debitRow("asset", 100, { accountId: "cash", code: "1000" }),
            creditRow("revenue", 90, { accountId: "rev", code: "4000" }),
        ];
        const tb = trialBalance(rows);
        expect(tb.balanced).toBe(false);
        expect(tb.totalDebit).not.toBe(tb.totalCredit);
    });

    it("totals are equal for many random balanced sets", () => {
        for (let i = 0; i < 200; i++) {
            const rows = randomBalancedRows(rint(1, 8));
            const tb = trialBalance(rows);
            expect(tb.totalDebit).toBe(tb.totalCredit);
            expect(tb.balanced).toBe(true);
        }
    });
});

/* -------------------------------------------- Property 4: Accounting equation */

/**
 * Property 4: Assets = Liabilities + Equity (incl. period net income).
 * Validates: Requirements 4.3
 */
describe("balanceSheet", () => {
    it("satisfies A = L + E for a simple set with net income", () => {
        // Owner invests 1000 cash; earns 300 revenue in cash; pays 100 expense cash.
        const rows: StatementRow[] = [
            debitRow("asset", 1000, { accountId: "cash", code: "1000" }),
            creditRow("equity", 1000, { accountId: "cap", code: "3000" }),
            debitRow("asset", 300, { accountId: "cash", code: "1000" }),
            creditRow("revenue", 300, { accountId: "rev", code: "4000" }),
            debitRow("expense", 100, { accountId: "exp", code: "6000" }),
            creditRow("asset", 100, { accountId: "cash", code: "1000" }),
        ];
        const bs = balanceSheet(rows);
        expect(bs.assets).toBe(1200); // 1000 + 300 - 100
        expect(bs.retainedEarnings).toBe(200); // 300 - 100
        expect(bs.equity).toBe(1200); // 1000 capital + 200 retained
        expect(bs.liabilities).toBe(0);
        expect(bs.assets).toBe(Math.round((bs.liabilities + bs.equity) * 100) / 100);
        expect(bs.balanced).toBe(true);
    });

    it("holds A = L + E including net income for many random balanced sets", () => {
        for (let i = 0; i < 200; i++) {
            const rows = randomBalancedRows(rint(1, 8));
            const bs = balanceSheet(rows);
            expect(bs.assets).toBe(Math.round((bs.liabilities + bs.equity) * 100) / 100);
            expect(bs.balanced).toBe(true);
        }
    });

    it("surfaces an imbalance when the set is not derived from balanced entries", () => {
        const rows: StatementRow[] = [debitRow("asset", 500, { accountId: "cash", code: "1000" })];
        const bs = balanceSheet(rows);
        expect(bs.balanced).toBe(false);
    });
});

/* ----------------------------------------- Income statement (net income math) */

describe("incomeStatement", () => {
    it("computes netIncome = revenue - expenses", () => {
        const rows: StatementRow[] = [
            creditRow("revenue", 800, { accountId: "rev", code: "4000", subtype: "operating-revenue" }),
            debitRow("expense", 300, { accountId: "exp", code: "6000", subtype: "operating-expense" }),
        ];
        const is = incomeStatement(rows);
        expect(is.revenue).toBe(800);
        expect(is.expenses).toBe(300);
        expect(is.netIncome).toBe(500);
        expect(is.groups.revenue["operating-revenue"]).toBe(800);
        expect(is.groups.expenses["operating-expense"]).toBe(300);
    });

    it("scopes rows to the supplied period by date", () => {
        const rows: StatementRow[] = [
            creditRow("revenue", 100, { accountId: "rev", code: "4000", date: new Date("2024-01-15") }),
            creditRow("revenue", 500, { accountId: "rev", code: "4000", date: new Date("2024-03-15") }),
        ];
        const is = incomeStatement(rows, { from: new Date("2024-01-01"), to: new Date("2024-01-31") });
        expect(is.revenue).toBe(100);
    });
});

/* ------------------------------------------------ Property 10: Basis filtering */

/**
 * Property 10: basis filtering includes only matching rows.
 * Validates: Requirements 4.5
 */
describe("filterByBasis", () => {
    const rows: StatementRow[] = [
        debitRow("expense", 100, { basis: "cash" }),
        debitRow("expense", 200, { basis: "accrual" }),
        debitRow("expense", 300), // unspecified -> accrual
    ];

    it("cash basis includes only cash rows", () => {
        const out = filterByBasis(rows, "cash");
        expect(out).toHaveLength(1);
        expect(out.every((r) => r.basis === "cash")).toBe(true);
    });

    it("accrual basis includes everything that isn't cash-only", () => {
        const out = filterByBasis(rows, "accrual");
        expect(out).toHaveLength(3);
    });

    it("every returned row matches the requested basis predicate for random sets", () => {
        for (let i = 0; i < 100; i++) {
            const bases: Basis[] = ["accrual", "cash"];
            const sample: StatementRow[] = Array.from({ length: rint(1, 10) }, () =>
                debitRow("expense", rint(1, 500), {
                    basis: Math.random() < 0.5 ? "cash" : "accrual",
                }),
            );
            const basis = bases[rint(0, 1)];
            const out = filterByBasis(sample, basis);
            if (basis === "cash") {
                expect(out.every((r) => r.basis === "cash")).toBe(true);
                expect(out.length).toBe(sample.filter((r) => r.basis === "cash").length);
            } else {
                expect(out.length).toBe(sample.length);
            }
        }
    });

    it("does not mutate the input array", () => {
        const original = [...rows];
        filterByBasis(rows, "cash");
        expect(rows).toEqual(original);
    });
});

/* --------------------------------------------- Property 11: Vendor spend totals */

/**
 * Property 11: vendor spend totals tie to grouped posted expense amounts.
 * Validates: Requirements 11.3
 */
describe("vendorSpend", () => {
    it("groups expense totals by vendor", () => {
        const rows: StatementRow[] = [
            debitRow("expense", 100, { vendorId: "v1" }),
            debitRow("expense", 50, { vendorId: "v1" }),
            debitRow("expense", 200, { vendorId: "v2" }),
            debitRow("asset", 999, { vendorId: "v1" }), // non-expense ignored
            debitRow("expense", 10), // no vendor ignored
        ];
        const spend = vendorSpend(rows);
        const v1 = spend.find((s) => s.vendorId === "v1");
        const v2 = spend.find((s) => s.vendorId === "v2");
        expect(v1!.total).toBe(150);
        expect(v2!.total).toBe(200);
        expect(spend).toHaveLength(2);
    });

    it("totals equal the directly grouped signed amounts for random sets", () => {
        for (let i = 0; i < 100; i++) {
            const vendors = ["v1", "v2", "v3"];
            const rows: StatementRow[] = Array.from({ length: rint(1, 15) }, () => {
                const vendorId = vendors[rint(0, vendors.length - 1)];
                return debitRow("expense", rint(1, 500), { vendorId });
            });

            // Independent reference grouping.
            const expected = new Map<string, number>();
            for (const r of rows) {
                const signed = lineSignedAmount({ debit: r.debit, credit: r.credit }, "expense");
                expected.set(r.vendorId!, (expected.get(r.vendorId!) ?? 0) + signed);
            }

            const spend = vendorSpend(rows);
            for (const { vendorId, total } of spend) {
                expect(total).toBe(Math.round((expected.get(vendorId) ?? 0) * 100) / 100);
            }
            // every vendor with rows is represented
            expect(spend.length).toBe(expected.size);
        }
    });
});

/* ----------------------------------------- Property 12: Budget-vs-actual math */

/**
 * Property 12: budget-vs-actual math including the missing-budget case.
 * Validates: Requirements 12.2
 */
describe("budgetVsActual", () => {
    it("computes actual, variance and variancePct per budgeted account", () => {
        const budgets: BudgetTarget[] = [
            { accountId: "6000", amount: 1000 },
            { accountId: "6100", amount: 500 },
        ];
        const actuals: StatementRow[] = [
            debitRow("expense", 800, { accountId: "6000", code: "6000" }),
            debitRow("expense", 600, { accountId: "6100", code: "6100" }),
        ];
        const report = budgetVsActual(budgets, actuals);

        const a = report.find((r) => r.accountId === "6000")!;
        expect(a.budget).toBe(1000);
        expect(a.actual).toBe(800);
        expect(a.variance).toBe(200); // budget - actual
        expect(a.variancePct).toBe(20);

        const b = report.find((r) => r.accountId === "6100")!;
        expect(b.actual).toBe(600);
        expect(b.variance).toBe(-100); // over budget
        expect(b.variancePct).toBe(-20);
    });

    it("treats a missing budget as actual-only (no error, budget 0)", () => {
        const budgets: BudgetTarget[] = [];
        const actuals: StatementRow[] = [debitRow("expense", 250, { accountId: "6900", code: "6900" })];
        const report = budgetVsActual(budgets, actuals);
        expect(report).toHaveLength(1);
        expect(report[0].accountId).toBe("6900");
        expect(report[0].budget).toBe(0);
        expect(report[0].actual).toBe(250);
        expect(report[0].variance).toBe(-250);
        expect(report[0].variancePct).toBe(0); // no divide-by-zero
    });

    it("reports a budget with no actuals as actual 0 (full positive variance)", () => {
        const budgets: BudgetTarget[] = [{ accountId: "6500", amount: 400 }];
        const report = budgetVsActual(budgets, []);
        expect(report).toHaveLength(1);
        expect(report[0].actual).toBe(0);
        expect(report[0].variance).toBe(400);
        expect(report[0].variancePct).toBe(100);
    });

    it("holds variance = budget - actual for random inputs", () => {
        for (let i = 0; i < 100; i++) {
            const accountId = `60${rint(0, 9)}0`;
            const budgetAmt = rint(0, 2000);
            const budgets: BudgetTarget[] = budgetAmt > 0 ? [{ accountId, amount: budgetAmt }] : [];
            const actualAmt = rint(0, 2000);
            const actuals: StatementRow[] =
                actualAmt > 0 ? [debitRow("expense", actualAmt, { accountId, code: accountId })] : [];

            const report = budgetVsActual(budgets, actuals);
            if (budgetAmt === 0 && actualAmt === 0) {
                expect(report).toHaveLength(0);
                continue;
            }
            const row = report.find((r) => r.accountId === accountId)!;
            expect(row.variance).toBe(Math.round((row.budget - row.actual) * 100) / 100);
            if (row.budget === 0) expect(row.variancePct).toBe(0);
        }
    });
});

/* ------------------------------------------------------- Cash flow grouping */

describe("cashFlow", () => {
    it("classifies cash movements into operating/investing/financing and nets them", () => {
        const d = new Date("2024-02-01");
        const d2 = new Date("2024-02-02");
        const d3 = new Date("2024-02-03");
        const rows: StatementRow[] = [
            // operating inflow: cash in, revenue counter
            debitRow("asset", 500, { accountId: "cash", code: "1000", isCashAccount: true, date: d }),
            creditRow("revenue", 500, { accountId: "rev", code: "4000", date: d }),
            // investing outflow: cash out to buy equipment (fixed asset)
            creditRow("asset", 300, { accountId: "cash", code: "1000", isCashAccount: true, date: d2 }),
            debitRow("asset", 300, { accountId: "equip", code: "1500", subtype: "fixed-asset", date: d2 }),
            // financing inflow: owner invests cash (equity)
            debitRow("asset", 1000, { accountId: "cash", code: "1000", isCashAccount: true, date: d3 }),
            creditRow("equity", 1000, { accountId: "cap", code: "3000", date: d3 }),
        ];
        const cf = cashFlow(rows);
        expect(cf.operating).toBe(500);
        expect(cf.investing).toBe(-300);
        expect(cf.financing).toBe(1000);
        expect(cf.netChange).toBe(1200);
    });
});
