"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Insurance from "../models/insurance.models";
import Claim from "../models/claim.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

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
export const createInsurance = await withAuth(_createInsurance);

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
export const deleteInsurance = await withAuth(_deleteInsurance);

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
    const count = await Claim.countDocuments({});
    return `CLM-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function _createClaim(user: User, values: ClaimValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const claimNumber = await generateClaimNumber();
        const claim = new Claim({
            ...values,
            claimNumber,
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
export const createClaim = await withAuth(_createClaim);

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
export const updateClaim = await withAuth(_updateClaim);

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
export const deleteClaim = await withAuth(_deleteClaim);

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
