"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Waitlist from "../models/waitlist.models";
import Consent from "../models/consent.models";
import Appointment from "../models/appointment.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

/* ─────────────── WAITLIST ─────────────── */

interface WaitlistValues {
    patientId: string;
    reason?: string;
    preferredDate?: string | null;
    priority?: "normal" | "urgent" | "emergency";
    note?: string;
}

async function _addToWaitlist(user: User, values: WaitlistValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const entry = new Waitlist({
            patientId: values.patientId,
            reason: values.reason || "",
            preferredDate: values.preferredDate ? new Date(values.preferredDate) : null,
            priority: values.priority || "normal",
            note: values.note || "",
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "WAITLIST_CREATED",
            details: { itemId: entry._id, deletedAt: new Date() },
            message: `${user.fullName} added a patient to the waitlist on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "WAITLIST",
        });

        await Promise.all([entry.save(), history.save()]);
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.log("unable to add to waitlist", error);
        throw error;
    }
}
export const addToWaitlist = await withAuth(_addToWaitlist);

async function _getWaitlist(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const entries = await Waitlist.find({ del_flag: false, status: { $ne: "removed" } })
            .populate("patientId", "fullName patientId phone")
            .sort({ priority: -1, createdAt: 1 });
        if (!entries || entries.length === 0) return [];
        return JSON.parse(JSON.stringify(entries));
    } catch (error) {
        console.error("Error fetching waitlist:", error);
        throw error;
    }
}
export const getWaitlist = await withAuth(_getWaitlist);

async function _updateWaitlistStatus(user: User, id: string, status: string, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const updated = await Waitlist.findByIdAndUpdate(
            id,
            { $set: { status, mod_flag: true, modifiedBy: user._id, action_type: "updated" } },
            { new: true }
        );
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating waitlist:", error);
        throw error;
    }
}
export const updateWaitlistStatus = await withAuth(_updateWaitlistStatus);

async function _removeFromWaitlist(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const entry = await Waitlist.findById(id);
        if (!entry || !entry._id) throw new Error("Waitlist entry not found");
        await deleteDocument({
            actionType: "WAITLIST_DELETED",
            documentId: entry._id.toString(),
            collectionName: "Waitlist",
            userId: `${user._id}`,
            trashMessage: `A waitlist entry (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} removed a waitlist entry on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while removing from waitlist", error);
        throw error;
    }
}
export const removeFromWaitlist = await withAuth(_removeFromWaitlist);

/* ─────────────── NO-SHOW TRACKING ─────────────── */

async function _getNoShowStats(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const [total, noShows] = await Promise.all([
            Appointment.countDocuments({}),
            Appointment.countDocuments({ status: "no-show" }),
        ]);

        // Top patients by no-show count
        const byPatient = await Appointment.aggregate([
            { $match: { status: "no-show" } },
            { $group: { _id: "$patientId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: "patients", localField: "_id", foreignField: "_id", as: "patient" } },
            { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
            { $project: { count: 1, fullName: "$patient.fullName", patientId: "$patient.patientId" } },
        ]);

        const rate = total > 0 ? Math.round((noShows / total) * 1000) / 10 : 0;

        return JSON.parse(JSON.stringify({ total, noShows, rate, byPatient }));
    } catch (error) {
        console.error("Error computing no-show stats:", error);
        return { total: 0, noShows: 0, rate: 0, byPatient: [] };
    }
}
export const getNoShowStats = await withAuth(_getNoShowStats);

/* ─────────────── CONSENT ─────────────── */

interface ConsentValues {
    patientId: string;
    procedureName: string;
    content: string;
}

async function _createConsent(user: User, values: ConsentValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const consent = new Consent({
            ...values,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "CONSENT_CREATED",
            details: { itemId: consent._id, deletedAt: new Date() },
            message: `${user.fullName} created a consent form "${values.procedureName}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: consent._id,
            entityType: "CONSENT",
        });

        await Promise.all([consent.save(), history.save()]);
        return JSON.parse(JSON.stringify(consent));
    } catch (error) {
        console.log("unable to create consent", error);
        throw error;
    }
}
export const createConsent = await withAuth(_createConsent);

async function _getConsentsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const consents = await Consent.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!consents || consents.length === 0) return [];
        return JSON.parse(JSON.stringify(consents));
    } catch (error) {
        console.error("Error fetching consents:", error);
        throw error;
    }
}
export const getConsentsByPatient = await withAuth(_getConsentsByPatient);

async function _signConsent(user: User, id: string, signatureName: string, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const updated = await Consent.findByIdAndUpdate(
            id,
            { $set: { signed: true, signatureName, signedAt: new Date(), mod_flag: true, modifiedBy: user._id, action_type: "updated" } },
            { new: true }
        );
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error signing consent:", error);
        throw error;
    }
}
export const signConsent = await withAuth(_signConsent);
