"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Invoice from "../models/invoice.models";
import TreatmentPlan from "../models/treatment-plan.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

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
    const count = await Invoice.countDocuments({});
    const seq = String(count + 1).padStart(5, "0");
    return `INV-${year}-${seq}`;
}

function computeTotals(items: InvoiceItemInput[], tax = 0, discount = 0) {
    const withAmounts = items.map((it) => ({
        ...it,
        amount: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    }));
    const subtotal = withAmounts.reduce((s, it) => s + it.amount, 0);
    const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0));
    return { withAmounts, subtotal, total };
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
export const createInvoice = await withAuth(_createInvoice);

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
export const createInvoiceFromPlan = await withAuth(_createInvoiceFromPlan);

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
export const updateInvoiceStatus = await withAuth(_updateInvoiceStatus);

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
export const deleteInvoice = await withAuth(_deleteInvoice);


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
