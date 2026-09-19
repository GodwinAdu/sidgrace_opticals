"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Payment from "../models/payment.models";
import Invoice from "../models/invoice.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { postLedgerEntry } from "./transaction.actions";

interface PaymentValues {
    patientId: string;
    invoiceId?: string | null;
    amount: number;
    method: "cash" | "card" | "mobile-money" | "bank-transfer" | "insurance" | "other";
    reference?: string;
    note?: string;
}

/**
 * Recomputes an invoice's amountPaid/balance/status from its payments.
 */
async function recomputeInvoice(invoiceId: string) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;

    const payments = await Payment.find({ invoiceId, del_flag: false });
    const amountPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, Number(invoice.total) - amountPaid);

    let status = invoice.status;
    if (invoice.status !== "cancelled") {
        if (amountPaid <= 0) status = "unpaid";
        else if (balance <= 0) status = "paid";
        else status = "partial";
    }

    invoice.amountPaid = amountPaid;
    invoice.balance = balance;
    invoice.status = status;
    await invoice.save();
}

async function _recordPayment(user: User, values: PaymentValues, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const payment = new Payment({
            ...values,
            receivedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "PAYMENT_CREATED",
            details: { itemId: payment._id, deletedAt: new Date() },
            message: `${user.fullName} recorded a payment of ${values.amount} (${values.method}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: payment._id,
            entityType: "PAYMENT",
        });

        await Promise.all([payment.save(), history.save()]);

        if (values.invoiceId) {
            await recomputeInvoice(values.invoiceId);
        }

        // Post the payment to the accounting ledger as income (Clinic Revenue).
        await postLedgerEntry(user, {
            type: "income",
            category: values.method === "insurance" ? "Insurance Reimbursement" : "Procedure",
            amount: Number(values.amount) || 0,
            accountName: "Clinic Revenue",
            method: values.method,
            source: "payment",
            sourceId: payment._id ? String(payment._id) : null,
            patientId: values.patientId,
            description: values.reference ? `Payment ref: ${values.reference}` : "Patient payment",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(payment));
    } catch (error) {
        console.log("unable to record payment", error);
        throw error;
    }
}
export const recordPayment = await withAuth(_recordPayment);

async function _getPaymentsByInvoice(user: User, invoiceId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const payments = await Payment.find({ invoiceId, del_flag: false })
            .populate("receivedBy", "fullName")
            .sort({ createdAt: -1 });
        if (!payments || payments.length === 0) return [];
        return JSON.parse(JSON.stringify(payments));
    } catch (error) {
        console.error("Error fetching invoice payments:", error);
        throw error;
    }
}
export const getPaymentsByInvoice = await withAuth(_getPaymentsByInvoice);

async function _getPaymentsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const payments = await Payment.find({ patientId, del_flag: false })
            .populate("invoiceId", "invoiceNumber")
            .sort({ createdAt: -1 });
        if (!payments || payments.length === 0) return [];
        return JSON.parse(JSON.stringify(payments));
    } catch (error) {
        console.error("Error fetching patient payments:", error);
        throw error;
    }
}
export const getPaymentsByPatient = await withAuth(_getPaymentsByPatient);
