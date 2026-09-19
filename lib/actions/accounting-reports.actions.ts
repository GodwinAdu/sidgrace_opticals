"use server"

import { connectToDB } from "../mongoose";
import Transaction from "../models/transaction.models";
import Account from "../models/account.models";
import Invoice from "../models/invoice.models";
import { User, withAuth } from "../helpers/auth";

function rangeQuery(from?: string, to?: string) {
    const q: Record<string, unknown> = { del_flag: { $ne: true } };
    if (from || to) {
        const d: Record<string, Date> = {};
        if (from) d.$gte = new Date(from);
        if (to) d.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
        q.date = d;
    }
    return q;
}

/** Income statement (P&L): revenue & expenses grouped by category for a date range. */
async function _getIncomeStatement(user: User, from?: string, to?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const match = rangeQuery(from, to);
        const grouped = await Transaction.aggregate([
            { $match: match },
            { $group: { _id: { type: "$type", category: "$category" }, total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
        ]);

        const revenue = grouped
            .filter((g) => g._id.type === "income")
            .map((g) => ({ category: g._id.category, amount: Math.round(g.total) }));
        const expenses = grouped
            .filter((g) => g._id.type === "expense")
            .map((g) => ({ category: g._id.category, amount: Math.round(g.total) }));

        const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

        return JSON.parse(JSON.stringify({ revenue, expenses, totalRevenue, totalExpenses, netProfit, margin }));
    } catch (error) {
        console.error("Error building income statement:", error);
        return { revenue: [], expenses: [], totalRevenue: 0, totalExpenses: 0, netProfit: 0, margin: 0 };
    }
}
export const getIncomeStatement = await withAuth(_getIncomeStatement);

/** Trial balance: each account's net debit/credit position from real transactions. */
async function _getTrialBalance(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const accounts = await Account.find({ del_flag: { $ne: true } }).lean();

        const perAccount = await Transaction.aggregate([
            { $match: { del_flag: { $ne: true } } },
            { $group: { _id: { accountId: "$accountId", type: "$type" }, total: { $sum: "$amount" } } },
        ]);

        const rows = accounts.map((acc) => {
            const income = perAccount.find((p) => String(p._id.accountId) === String(acc._id) && p._id.type === "income")?.total || 0;
            const expense = perAccount.find((p) => String(p._id.accountId) === String(acc._id) && p._id.type === "expense")?.total || 0;
            // Debit = expenses/assets side, Credit = income side (simplified)
            return {
                id: String(acc._id),
                account: acc.accountName,
                balance: Math.round(Number(acc.balance) || 0),
                debit: Math.round(expense),
                credit: Math.round(income),
            };
        });

        const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
        const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

        return JSON.parse(JSON.stringify({ rows, totalDebit, totalCredit }));
    } catch (error) {
        console.error("Error building trial balance:", error);
        return { rows: [], totalDebit: 0, totalCredit: 0 };
    }
}
export const getTrialBalance = await withAuth(_getTrialBalance);

/** Balance sheet: assets (account balances + receivables), liabilities, equity. */
async function _getBalanceSheet(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const accounts = await Account.find({ del_flag: { $ne: true } }).lean();
        const cashAndBank = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

        // Accounts receivable = sum of outstanding invoice balances
        const invAgg = await Invoice.aggregate([
            { $match: { del_flag: { $ne: true }, status: { $ne: "cancelled" } } },
            { $group: { _id: null, receivable: { $sum: "$balance" } } },
        ]);
        const receivable = Math.round(invAgg[0]?.receivable || 0);

        // Net income (all time) = income - expenses -> retained earnings / equity
        const txnAgg = await Transaction.aggregate([
            { $match: { del_flag: { $ne: true } } },
            { $group: { _id: "$type", total: { $sum: "$amount" } } },
        ]);
        const income = txnAgg.find((t) => t._id === "income")?.total || 0;
        const expenses = txnAgg.find((t) => t._id === "expense")?.total || 0;
        const retainedEarnings = Math.round(income - expenses);

        const assets = {
            accounts: accounts.map((a) => ({ name: a.accountName, value: Math.round(Number(a.balance) || 0) })),
            cashAndBank: Math.round(cashAndBank),
            receivable,
            total: Math.round(cashAndBank + receivable),
        };
        const liabilities = { total: 0, items: [] as { name: string; value: number }[] };
        const equity = { retainedEarnings, total: retainedEarnings };

        return JSON.parse(JSON.stringify({ assets, liabilities, equity }));
    } catch (error) {
        console.error("Error building balance sheet:", error);
        return {
            assets: { accounts: [], cashAndBank: 0, receivable: 0, total: 0 },
            liabilities: { total: 0, items: [] },
            equity: { retainedEarnings: 0, total: 0 },
        };
    }
}
export const getBalanceSheet = await withAuth(_getBalanceSheet);
