"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Invoice from "../models/invoice.models";
import TreatmentPlan from "../models/treatment-plan.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";
import { computeInvoiceTotals } from "../finance/calc";
import { nextSequence } from "../models/counter.models";

interface InvoiceItemInput {
    description: string;
    procedureId?: string | null;
    tooth?: number | null;
    quantity: number;
    unitPrice: number;
}

interface InvoiceValues {
    patientId: string;
    treatmentPlanId?: string | null;
    items: InvoiceItemInput[];
    tax?: number;
    discount?: number;
    dueDate?: string | null;
    notes?: string;
}

async function generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // Atomic per-year sequence — safe under concurrent creation.
    const seq = await nextSequence(`invoice-${year}`);
    return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

function computeTotals(items: InvoiceItemInput[], tax = 0, discount = 0) {
    // Delegates to the shared, unit-tested pure helper.
    return computeInvoiceTotals(items, tax, discount);
}

async function _createInvoice(user: User, values: InvoiceValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const { withAmounts, subtotal, total } = computeTotals(values.items, values.tax, values.discount);
        const invoiceNumber = await generateInvoiceNumber();

        const invoice = new Invoice({
            invoiceNumber,
            patientId: values.patientId,
            treatmentPlanId: values.treatmentPlanId || null,
            items: withAmounts,
            subtotal,
            tax: Number(values.tax || 0),
            discount: Number(values.discount || 0),
            total,
            amountPaid: 0,
            balance: total,
            status: total > 0 ? "unpaid" : "paid",
            dueDate: values.dueDate ? new Date(values.dueDate) : null,
            notes: values.notes || "",
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "INVOICE_CREATED",
            details: { itemId: invoice._id, deletedAt: new Date() },
            message: `${user.fullName} created invoice ${invoiceNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: invoice._id,
            entityType: "INVOICE",
        });

        await Promise.all([invoice.save(), history.save()]);
        return JSON.parse(JSON.stringify(invoice));
    } catch (error) {
        console.log("unable to create invoice", error);
        throw error;
    }
}
export const createInvoice = await withAuth(_createInvoice, "billingManagement");

async function _createInvoiceFromPlan(user: User, treatmentPlanId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const plan = await TreatmentPlan.findById(treatmentPlanId);
        if (!plan) throw new Error("Treatment plan not found");

        const items: InvoiceItemInput[] = (plan.items || []).map((it) => ({
            description: it.procedureName + (it.tooth ? ` (Tooth ${it.tooth})` : ""),
            procedureId: it.procedureId ? String(it.procedureId) : null,
            tooth: it.tooth ?? null,
            quantity: 1,
            unitPrice: it.cost,
        }));

        return _createInvoice(user, {
            patientId: String(plan.patientId),
            treatmentPlanId,
            items,
            notes: `Generated from treatment plan: ${plan.title}`,
        });
    } catch (error) {
        console.log("unable to create invoice from plan", error);
        throw error;
    }
}
export const createInvoiceFromPlan = await withAuth(_createInvoiceFromPlan, "billingManagement");

/**
 * Replace an invoice's line items (and optionally tax/discount) and recompute
 * subtotal/total/balance/status. Preserves amountPaid. Used by the billing
 * invoice-detail custom line-item editor. Rejects edits to a cancelled invoice.
 */
async function _updateInvoiceItems(
    user: User,
    invoiceId: string,
    items: InvoiceItemInput[],
    tax: number | undefined,
    discount: number | undefined,
    path?: string
) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) throw new Error("Invoice not found");
        if (invoice.status === "cancelled") throw new Error("Cannot edit a cancelled invoice");

        const nextTax = tax === undefined ? Number(invoice.tax) || 0 : Number(tax) || 0;
        const nextDiscount = discount === undefined ? Number(invoice.discount) || 0 : Number(discount) || 0;
        const { withAmounts, subtotal, total } = computeTotals(items || [], nextTax, nextDiscount);

        const amountPaid = Number(invoice.amountPaid) || 0;
        invoice.items = withAmounts as never;
        invoice.subtotal = subtotal;
        invoice.tax = nextTax;
        invoice.discount = nextDiscount;
        invoice.total = total;
        invoice.balance = Math.max(0, total - amountPaid);
        invoice.status = amountPaid <= 0 ? "unpaid" : invoice.balance <= 0 ? "paid" : "partial";
        invoice.mod_flag = true;
        invoice.modifiedBy = user._id;
        invoice.action_type = "updated";
        await invoice.save();

        await History.create({
            actionType: "INVOICE_UPDATED",
            details: { itemId: invoice._id, deletedAt: new Date() },
            message: `${user.fullName} updated invoice ${invoice.invoiceNumber} line items on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: invoice._id,
            entityType: "INVOICE",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/billing/invoices");
        return JSON.parse(JSON.stringify(invoice));
    } catch (error) {
        console.error("Error updating invoice items:", error);
        throw error;
    }
}
export const updateInvoiceItems = await withAuth(_updateInvoiceItems, "billingManagement");

async function _getAllInvoices(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const invoices = await Invoice.find({ del_flag: false })
            .populate("patientId", "fullName patientId")
            .sort({ createdAt: -1 });
        if (!invoices || invoices.length === 0) return [];
        return JSON.parse(JSON.stringify(invoices));
    } catch (error) {
        console.error("Error fetching invoices:", error);
        throw error;
    }
}
export const getAllInvoices = await withAuth(_getAllInvoices);

async function _getInvoicesByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const invoices = await Invoice.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!invoices || invoices.length === 0) return [];
        return JSON.parse(JSON.stringify(invoices));
    } catch (error) {
        console.error("Error fetching patient invoices:", error);
        throw error;
    }
}
export const getInvoicesByPatient = await withAuth(_getInvoicesByPatient);

async function _getInvoiceById(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const invoice = await Invoice.findById(id).populate("patientId", "fullName patientId phone email address");
        return JSON.parse(JSON.stringify(invoice));
    } catch (error) {
        console.log("unable to fetch invoice", error);
        throw error;
    }
}
export const getInvoiceById = await withAuth(_getInvoiceById);

async function _updateInvoiceStatus(user: User, id: string, status: string, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const updated = await Invoice.findByIdAndUpdate(
            id,
            { $set: { status, mod_flag: true, modifiedBy: user._id, action_type: "updated" } },
            { new: true }
        );
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating invoice status:", error);
        throw error;
    }
}
export const updateInvoiceStatus = await withAuth(_updateInvoiceStatus, "billingManagement");

async function _deleteInvoice(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const invoice = await Invoice.findById(id);
        if (!invoice || !invoice._id) throw new Error("Invoice not found");

        await deleteDocument({
            actionType: "INVOICE_DELETED",
            documentId: invoice._id.toString(),
            collectionName: "Invoice",
            userId: `${user._id}`,
            trashMessage: `Invoice ${invoice.invoiceNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted invoice ${invoice.invoiceNumber} on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Invoice deleted successfully" };
    } catch (error) {
        console.log("error while deleting invoice", error);
        throw error;
    }
}
export const deleteInvoice = await withAuth(_deleteInvoice, "billingManagement");


/**
 * Sum the patient's outstanding invoice balances (unpaid/partial), optionally
 * excluding one invoice (e.g. the current visit's own invoice) so the caller
 * can show "previous outstanding" separately from the current visit balance.
 */
async function _getPatientOutstanding(user: User, patientId: string, excludeInvoiceId?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = {
            patientId,
            del_flag: false,
            status: { $in: ["unpaid", "partial"] },
        };
        if (excludeInvoiceId) query._id = { $ne: excludeInvoiceId };
        const invoices = await Invoice.find(query).select("balance invoiceNumber");
        const total = invoices.reduce((s, inv) => s + (Number(inv.balance) || 0), 0);
        return { total, count: invoices.length };
    } catch (error) {
        console.error("Error computing patient outstanding:", error);
        return { total: 0, count: 0 };
    }
}
export const getPatientOutstanding = await withAuth(_getPatientOutstanding);
