"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Insurance from "../models/insurance.models";
import Claim from "../models/claim.models";
import Invoice from "../models/invoice.models";
import History from "../models/history.models";
import Payment from "../models/payment.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";
import { postLedgerEntry } from "./accounting/bridge.actions";
import { nextSequence, nextUniqueNumber } from "../models/counter.models";

/* ─────────────── INSURANCE ─────────────── */

interface InsuranceValues {
    patientId: string;
    insurer: string;
    policyNumber: string;
    coveragePercent: number;
    validUntil?: string | null;
    notes?: string;
}

async function _createInsurance(user: User, values: InsuranceValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const insurance = new Insurance({
            ...values,
            validUntil: values.validUntil ? new Date(values.validUntil) : null,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "INSURANCE_CREATED",
            details: { itemId: insurance._id, deletedAt: new Date() },
            message: `${user.fullName} added insurance "${values.insurer}" for patient ${values.patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: insurance._id,
            entityType: "INSURANCE",
        });

        await Promise.all([insurance.save(), history.save()]);
        return JSON.parse(JSON.stringify(insurance));
    } catch (error) {
        console.log("unable to create insurance", error);
        throw error;
    }
}
export const createInsurance = await withAuth(_createInsurance, "insuranceManagement");

async function _getInsuranceByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const records = await Insurance.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!records || records.length === 0) return [];
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching insurance:", error);
        throw error;
    }
}
export const getInsuranceByPatient = await withAuth(_getInsuranceByPatient);

async function _deleteInsurance(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const rec = await Insurance.findById(id);
        if (!rec || !rec._id) throw new Error("Insurance not found");
        await deleteDocument({
            actionType: "INSURANCE_DELETED",
            documentId: rec._id.toString(),
            collectionName: "Insurance",
            userId: `${user._id}`,
            trashMessage: `Insurance "${rec.insurer}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted insurance "${rec.insurer}" on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while deleting insurance", error);
        throw error;
    }
}
export const deleteInsurance = await withAuth(_deleteInsurance, "insuranceManagement");

/* ─────────────── CLAIMS ─────────────── */

interface ClaimValues {
    patientId: string;
    insuranceId?: string | null;
    invoiceId?: string | null;
    amountClaimed: number;
    notes?: string;
}

async function generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    return nextUniqueNumber(
        `claim-${year}`,
        (seq) => `CLM-${year}-${String(seq).padStart(5, "0")}`,
        async (value) => !!(await Claim.exists({ claimNumber: value })),
    );
}

async function _createClaim(user: User, values: ClaimValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const claimNumber = await generateClaimNumber();
        const claim = new Claim({
            ...values,
            claimNumber,
            // Default the approved amount to the claimed amount; the accountant
            // adjusts it only if the insurer approves less.
            amountApproved: Number(values.amountClaimed) || 0,
            status: "draft",
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "CLAIM_CREATED",
            details: { itemId: claim._id, deletedAt: new Date() },
            message: `${user.fullName} created claim ${claimNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: claim._id,
            entityType: "CLAIM",
        });

        await Promise.all([claim.save(), history.save()]);
        return JSON.parse(JSON.stringify(claim));
    } catch (error) {
        console.log("unable to create claim", error);
        throw error;
    }
}
export const createClaim = await withAuth(_createClaim, "insuranceManagement");

/**
 * Raise an insurance claim directly from an invoice. Looks up the patient's
 * most relevant active policy and pre-computes the insurer's share from its
 * coverage percent (claimed = invoice total × coverage%). The accountant can
 * still adjust the approved amount later. Links the claim to both the invoice
 * and the policy so settlement can post back to the invoice.
 */
async function _createClaimFromInvoice(user: User, invoiceId: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) throw new Error("Invoice not found");

        const patientId = String(invoice.patientId);
        // Prefer the newest active policy that is still valid (or has no expiry).
        const now = new Date();
        const policies = await Insurance.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        const policy =
            policies.find((p) => !p.validUntil || new Date(p.validUntil) >= now) || policies[0] || null;

        const coverage = policy ? Number(policy.coveragePercent) || 0 : 0;
        const invoiceTotal = Number(invoice.total) || 0;
        const claimed = coverage > 0 ? Math.round((invoiceTotal * coverage) / 100 * 100) / 100 : 0;

        const claimNumber = await generateClaimNumber();
        const claim = await Claim.create({
            patientId,
            insuranceId: policy?._id || null,
            invoiceId: invoice._id,
            claimNumber,
            amountClaimed: claimed,
            // Default approved to claimed; adjusted only if the insurer pays less.
            amountApproved: claimed,
            status: "draft",
            notes: policy ? `Policy ${policy.policyNumber} (${coverage}% coverage)` : "No active policy on file",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "CLAIM_CREATED",
            details: { itemId: claim._id, deletedAt: new Date() },
            message: `${user.fullName} raised claim ${claimNumber} from invoice ${invoice.invoiceNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: claim._id,
            entityType: "CLAIM",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/billing/claims");
        return JSON.parse(JSON.stringify(claim));
    } catch (error) {
        console.log("unable to create claim from invoice", error);
        throw error;
    }
}
export const createClaimFromInvoice = await withAuth(_createClaimFromInvoice, "insuranceManagement");

/** Claims linked to a specific invoice. */
async function _getClaimsByInvoice(user: User, invoiceId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const claims = await Claim.find({ invoiceId, del_flag: false }).sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(claims || []));
    } catch (error) {
        console.error("Error fetching invoice claims:", error);
        return [];
    }
}
export const getClaimsByInvoice = await withAuth(_getClaimsByInvoice);

async function _getAllClaims(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const claims = await Claim.find({ del_flag: false })
            .populate("patientId", "fullName patientId")
            .sort({ createdAt: -1 });
        if (!claims || claims.length === 0) return [];
        return JSON.parse(JSON.stringify(claims));
    } catch (error) {
        console.error("Error fetching claims:", error);
        throw error;
    }
}
export const getAllClaims = await withAuth(_getAllClaims);

/**
 * Recompute an invoice's amountPaid/balance/status from its (non-deleted)
 * payments. Mirrors payment.actions.recomputeInvoice; inlined here to avoid a
 * circular import between the two action modules.
 */
async function recomputeInvoiceFromPayments(invoiceId: string) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;
    const payments = await Payment.find({ invoiceId, del_flag: false });
    const amountPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, Number(invoice.total) - amountPaid);
    if (invoice.status !== "cancelled") {
        invoice.status = amountPaid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";
    }
    invoice.amountPaid = amountPaid;
    invoice.balance = balance;
    await invoice.save();
}

/**
 * When an insurer settles a claim, record their payment against the linked
 * invoice ONCE. "Terminal paid" states are `approved` / `partially-approved` /
 * `paid`. The amount is the claim's amountApproved (capped at the invoice
 * balance). Idempotent: guarded by claim.insurerPaid so re-saving the same
 * status does not post twice.
 */
async function maybePostInsurancePayment(
    user: User,
    claim: { _id?: unknown; status?: string; amountApproved?: number; invoiceId?: unknown; patientId?: unknown; insurerPaid?: boolean; claimNumber?: string },
    path?: string
) {
    const paidStates = new Set(["approved", "partially-approved", "paid"]);
    if (!paidStates.has(String(claim.status))) return;
    if (claim.insurerPaid) return; // already posted
    if (!claim.invoiceId) return;  // nothing to pay against
    const approved = Number(claim.amountApproved) || 0;
    if (approved <= 0) return;

    const invoice = await Invoice.findById(String(claim.invoiceId));
    if (!invoice || invoice.status === "cancelled") return;

    const pay = Math.min(approved, Number(invoice.balance) || 0);
    if (pay <= 0) {
        // Nothing outstanding to cover, but mark handled so we don't re-check.
        await Claim.findByIdAndUpdate(claim._id, { $set: { insurerPaid: true } });
        return;
    }

    const payment = await Payment.create({
        patientId: claim.patientId,
        invoiceId: invoice._id,
        amount: pay,
        method: "insurance",
        note: `Insurance claim ${claim.claimNumber || ""} settlement`,
        receivedBy: user._id,
        createdBy: user._id,
        action_type: "created",
    });

    await recomputeInvoiceFromPayments(String(invoice._id));

    await postLedgerEntry(user, {
        type: "income",
        category: "Insurance Reimbursement",
        amount: pay,
        accountName: "Clinic Revenue",
        method: "insurance",
        source: "payment",
        sourceId: payment._id ? String(payment._id) : null,
        patientId: claim.patientId ? String(claim.patientId) : null,
        description: `Insurance claim ${claim.claimNumber || ""}`,
    });

    await Claim.findByIdAndUpdate(claim._id, { $set: { insurerPaid: true } });

    if (path) revalidatePath(path);
    revalidatePath("/dashboard/billing/invoices");
    revalidatePath("/dashboard/account/journal-entries");
}

async function _updateClaim(
    user: User,
    id: string,
    values: { status?: string; amountApproved?: number; notes?: string },
    path: string
) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = { ...values, mod_flag: true, modifiedBy: user._id, action_type: "updated" };
        if (values.status === "submitted") update.submittedAt = new Date();

        const updated = await Claim.findByIdAndUpdate(id, { $set: update }, { new: true });
        if (!updated) return null;

        // If this update settles the claim, post the insurer's payment to the
        // linked invoice (once).
        await maybePostInsurancePayment(user, updated as unknown as Parameters<typeof maybePostInsurancePayment>[1], path);

        await History.create({
            actionType: "CLAIM_UPDATED",
            details: { itemId: updated._id, deletedAt: new Date() },
            message: `${user.fullName} updated claim ${updated.claimNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: updated._id,
            entityType: "CLAIM",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating claim:", error);
        throw error;
    }
}
export const updateClaim = await withAuth(_updateClaim, "insuranceManagement");

async function _deleteClaim(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const claim = await Claim.findById(id);
        if (!claim || !claim._id) throw new Error("Claim not found");
        await deleteDocument({
            actionType: "CLAIM_DELETED",
            documentId: claim._id.toString(),
            collectionName: "Claim",
            userId: `${user._id}`,
            trashMessage: `Claim ${claim.claimNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted claim ${claim.claimNumber} on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while deleting claim", error);
        throw error;
    }
}
export const deleteClaim = await withAuth(_deleteClaim, "insuranceManagement");

/* ─────────────── COMBINED (patient billing view) ─────────────── */

async function _getClaimsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const claims = await Claim.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!claims || claims.length === 0) return [];
        return JSON.parse(JSON.stringify(claims));
    } catch (error) {
        console.error("Error fetching patient claims:", error);
        throw error;
    }
}
export const getClaimsByPatient = await withAuth(_getClaimsByPatient);
