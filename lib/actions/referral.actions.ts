"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Referral from "../models/referral.models";
import { Patient } from "../models/patient.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import {
    canTransitionReferral,
    isValidDirection,
    type ReferralDirection,
    type ReferralStatus,
} from "../clinical/referral";

const REFERRALS_PATH = "/dashboard/referrals";

async function generateReferralNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`referral-${year}`);
    return `REF-${year}-${String(seq).padStart(5, "0")}`;
}

/* ═══════════════════════════════ REFERRALS ══════════════════════════════════ */

interface CreateReferralInput {
    direction: string;
    patientId: string;
    attendanceId?: string | null;
    facility?: string;
    provider?: string;
    contact?: string;
    reason: string;
    specialty?: string;
    note?: string;
}

/**
 * Raise a referral for a patient. The direction must be in/out, a patient and a
 * clinical reason are required, and a new referral starts `pending`. Linked to
 * the patient and (optionally) the visit it arose from. Gated by
 * `referralManagement`.
 */
async function _createReferral(user: User, values: CreateReferralInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!isValidDirection(values?.direction)) throw new Error("A valid referral direction (in/out) is required");
        if (!values?.patientId) throw new Error("A patient is required");
        const reason = (values?.reason || "").trim();
        if (!reason) throw new Error("A referral reason is required");
        await connectToDB();

        const patient = await Patient.findById(values.patientId).select("fullName patientId");
        if (!patient) throw new Error("Patient not found");

        const referralNumber = await generateReferralNumber();
        const referral = await Referral.create({
            referralNumber,
            direction: values.direction as ReferralDirection,
            patientId: patient._id,
            attendanceId: values.attendanceId || null,
            facility: values.facility?.trim() || "",
            provider: values.provider?.trim() || "",
            contact: values.contact?.trim() || "",
            reason,
            specialty: values.specialty?.trim() || "",
            status: "pending",
            note: values.note?.trim() || "",
            referredBy: user._id,
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "REFERRAL_CREATED",
            details: { itemId: referral._id, direction: referral.direction, patientId: patient._id },
            message: `${user.fullName} raised ${referral.direction === "in" ? "an inbound" : "an outbound"} referral ${referralNumber} for ${patient.fullName} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: referral._id,
            entityType: "REFERRAL",
        });

        revalidatePath(REFERRALS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(referral));
    } catch (error) {
        console.error("Error creating referral:", error);
        throw error;
    }
}
export const createReferral = await withAuth(_createReferral, "referralManagement");

async function _getReferrals(user: User, direction?: string, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (direction && direction !== "all") query.direction = direction;
        if (status && status !== "all") query.status = status;
        const referrals = await Referral.find(query)
            .populate("patientId", "fullName patientId")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(referrals || []));
    } catch (error) {
        console.error("Error fetching referrals:", error);
        return [];
    }
}
export const getReferrals = await withAuth(_getReferrals);

async function _getPatientReferrals(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!patientId) return [];
        await connectToDB();
        const referrals = await Referral.find({ patientId, del_flag: false })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return JSON.parse(JSON.stringify(referrals || []));
    } catch (error) {
        console.error("Error fetching patient referrals:", error);
        return [];
    }
}
export const getPatientReferrals = await withAuth(_getPatientReferrals);

/**
 * Advance a referral's workflow status (pending → accepted/declined →
 * completed, with cancelled reachable from the live states). The move is
 * validated against the allowed transitions so an invalid status can never be
 * persisted. Gated by `referralManagement`.
 */
async function _updateReferralStatus(user: User, id: string, status: ReferralStatus, note?: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A referral is required");
        await connectToDB();

        const referral = await Referral.findById(id);
        if (!referral) throw new Error("Referral not found");

        if (!canTransitionReferral(referral.status as ReferralStatus, status)) {
            throw new Error(`Cannot move a referral from ${referral.status} to ${status}`);
        }

        referral.status = status;
        if (note && note.trim()) referral.note = note.trim();
        referral.mod_flag = true;
        referral.modifiedBy = user._id as never;
        referral.action_type = "updated";
        await referral.save();

        await History.create({
            actionType: "REFERRAL_STATUS_CHANGED",
            details: { itemId: referral._id, status },
            message: `${user.fullName} marked referral ${referral.referralNumber} as ${status} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: referral._id,
            entityType: "REFERRAL",
        });

        revalidatePath(REFERRALS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(referral));
    } catch (error) {
        console.error("Error updating referral status:", error);
        throw error;
    }
}
export const updateReferralStatus = await withAuth(_updateReferralStatus, "referralManagement");

async function _deleteReferral(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const referral = await Referral.findById(id);
        if (!referral || !referral._id) throw new Error("Referral not found");

        await deleteDocument({
            actionType: "REFERRAL_DELETED",
            documentId: referral._id.toString(),
            collectionName: "Referral",
            userId: `${user._id}`,
            trashMessage: `Referral ${referral.referralNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted referral ${referral.referralNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(REFERRALS_PATH);
        return { success: true, message: "Referral deleted successfully" };
    } catch (error) {
        console.error("Error deleting referral:", error);
        throw error;
    }
}
export const deleteReferral = await withAuth(_deleteReferral, "referralManagement");
