"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Transaction from "../models/transaction.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { getOrCreateAccount, adjustAccountBalance } from "./account.actions";

interface TxnInput {
    type: "income" | "expense";
    category: string;
    amount: number;
    accountName?: string;
    date?: string;
    description?: string;
    method?: string;
    source?: "manual" | "payment" | "invoice" | "purchase" | "attendance";
    sourceId?: string | null;
    patientId?: string | null;
}

/**
 * Core ledger post. Creates a Transaction, updates the target account balance
 * (income = +amount, expense = -amount), writes a History record, and links
 * the transaction onto the Account's deposits[]/expenses[] arrays.
 */
async function _postTransaction(user: User, values: TxnInput, path?: string) {
    if (!user) throw new Error("User not authenticated");
    await connectToDB();

    const accountName = values.accountName || (values.type === "income" ? "Clinic Revenue" : "Operating Expenses");
    const account = await getOrCreateAccount(accountName, user._id as string);

    const txn = await Transaction.create({
        type: values.type,
        category: values.category,
        amount: Number(values.amount) || 0,
        accountId: account._id,
        accountName,
        date: values.date ? new Date(values.date) : new Date(),
        description: values.description || "",
        method: values.method || "",
        source: values.source || "manual",
        sourceId: values.sourceId || null,
        patientId: values.patientId || null,
        createdBy: user._id,
        action_type: "created",
    });

    // Adjust balance and link onto the account
    await adjustAccountBalance(String(account._id), values.type === "income" ? txn.amount : -txn.amount);
    const field = values.type === "income" ? "deposits" : "expenses";
    const { default: Account } = await import("../models/account.models");
    await Account.findByIdAndUpdate(account._id, { $addToSet: { [field]: txn._id } });

    await History.create({
        actionType: "TRANSACTION_CREATED",
        details: { itemId: txn._id, deletedAt: new Date() },
        message: `${user.fullName} recorded ${values.type} of ${txn.amount} (${values.category}) on ${new Date().toLocaleString()}.`,
        performedBy: user._id,
        entityId: txn._id,
        entityType: "TRANSACTION",
    });

    if (path) revalidatePath(path);
    return JSON.parse(JSON.stringify(txn));
}

async function _recordIncome(user: User, values: Omit<TxnInput, "type">, path?: string) {
    return _postTransaction(user, { ...values, type: "income" }, path);
}
export const recordIncome = await withAuth(_recordIncome);

async function _recordExpense(user: User, values: Omit<TxnInput, "type">, path?: string) {
    return _postTransaction(user, { ...values, type: "expense" }, path);
}
export const recordExpense = await withAuth(_recordExpense);

/**
 * Internal, non-withAuth post used by other server actions (e.g. payments)
 * that already have an authenticated user object.
 */
export async function postLedgerEntry(user: User, values: TxnInput) {
    try {
        return await _postTransaction(user, values);
    } catch (error) {
        console.error("Failed to post ledger entry:", error);
        return null;
    }
}

/**
 * Internal reversal used by other server actions (e.g. re-charging a
 * consultation fee) to undo a prior ledger entry: reverses the account
 * balance and soft-deletes the transaction. Safe no-op if not found.
 */
export async function reverseLedgerEntry(user: User, transactionId: string) {
    try {
        await connectToDB();
        const txn = await Transaction.findById(transactionId);
        if (!txn || txn.del_flag) return { success: true };
        if (txn.accountId) {
            await adjustAccountBalance(String(txn.accountId), txn.type === "income" ? -txn.amount : txn.amount);
        }
        txn.del_flag = true;
        txn.deletedBy = user._id as unknown as ITransaction["deletedBy"];
        txn.action_type = "deleted";
        await txn.save();
        return { success: true };
    } catch (error) {
        console.error("Failed to reverse ledger entry:", error);
        return { success: false };
    }
}

interface TxnFilter {
    type?: "income" | "expense";
    from?: string;
    to?: string;
    limit?: number;
}

async function _getTransactions(user: User, filter: TxnFilter = {}) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const query: Record<string, unknown> = { del_flag: { $ne: true } };
        if (filter.type) query.type = filter.type;
        if (filter.from || filter.to) {
            const dateQ: Record<string, Date> = {};
            if (filter.from) dateQ.$gte = new Date(filter.from);
            if (filter.to) dateQ.$lte = new Date(filter.to);
            query.date = dateQ;
        }

        const txns = await Transaction.find(query)
            .populate("createdBy", "fullName")
            .sort({ date: -1 })
            .limit(filter.limit || 200);
        if (!txns || txns.length === 0) return [];
        return JSON.parse(JSON.stringify(txns));
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
}
export const getTransactions = await withAuth(_getTransactions);

async function _deleteTransaction(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const txn = await Transaction.findById(id);
        if (!txn) throw new Error("Transaction not found");

        // Reverse the balance effect before soft-deleting.
        if (txn.accountId) {
            await adjustAccountBalance(String(txn.accountId), txn.type === "income" ? -txn.amount : txn.amount);
        }
        txn.del_flag = true;
        txn.deletedBy = user._id as unknown as ITransaction["deletedBy"];
        txn.action_type = "deleted";
        await txn.save();

        await History.create({
            actionType: "TRANSACTION_DELETED",
            details: { itemId: txn._id, deletedAt: new Date() },
            message: `${user.fullName} deleted a ${txn.type} transaction (${txn.amount}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: txn._id,
            entityType: "TRANSACTION",
        });

        if (path) revalidatePath(path);
        return { success: true };
    } catch (error) {
        console.log("error while deleting transaction", error);
        throw error;
    }
}
export const deleteTransaction = await withAuth(_deleteTransaction);
