"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Recall from "../models/recall.models";
import { Patient } from "../models/patient.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";
import { getClinicName, sendSms } from "../helpers/sms";

interface RecallValues {
    patientId: string;
    type: string;
    dueDate: string;
    note?: string;
}

async function _createRecall(user: User, values: RecallValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const recall = new Recall({
            patientId: values.patientId,
            type: values.type,
            dueDate: new Date(values.dueDate),
            note: values.note || "",
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "RECALL_CREATED",
            details: { itemId: recall._id, deletedAt: new Date() },
            message: `${user.fullName} scheduled a "${values.type}" recall on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: recall._id,
            entityType: "RECALL",
        });

        await Promise.all([recall.save(), history.save()]);
        return JSON.parse(JSON.stringify(recall));
    } catch (error) {
        console.log("unable to create recall", error);
        throw error;
    }
}
export const createRecall = await withAuth(_createRecall);

async function _getAllRecalls(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const recalls = await Recall.find({ del_flag: false })
            .populate("patientId", "fullName patientId phone")
            .sort({ dueDate: 1 });
        if (!recalls || recalls.length === 0) return [];
        return JSON.parse(JSON.stringify(recalls));
    } catch (error) {
        console.error("Error fetching recalls:", error);
        throw error;
    }
}
export const getAllRecalls = await withAuth(_getAllRecalls);

async function _updateRecallStatus(user: User, id: string, status: string, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const updated = await Recall.findByIdAndUpdate(
            id,
            { $set: { status, mod_flag: true, modifiedBy: user._id, action_type: "updated" } },
            { new: true }
        );
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating recall:", error);
        throw error;
    }
}
export const updateRecallStatus = await withAuth(_updateRecallStatus);

/**
 * Sends an SMS reminder for a recall through the SMS backend (SMSOnlineGH).
 * Returns { sent: boolean, queued?: boolean, reason?: string } so the UI can report
 * gracefully when the SMS service is offline or not configured yet.
 */
async function _sendRecallReminder(user: User, id: string, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const recall = await Recall.findById(id);
        if (!recall) throw new Error("Recall not found");

        const patient = await Patient.findById(recall.patientId);
        const phone = patient?.phone;
        if (!phone) {
            return { sent: false, reason: "Patient has no phone number on file" };
        }

        const clinicName = await getClinicName();
        const dueDate = new Date(recall.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        const message = `Dear ${patient.fullName || "patient"}, this is a reminder from ${clinicName} that your ${recall.type} is due on ${dueDate}. Please call us to book your appointment.`;

        const sms = await sendSms({ to: phone, message, recipientName: patient.fullName, source: "recall" });
        if (!sms.success) {
            console.warn(`Recall SMS not sent${sms.queued ? " (queued for retry)" : ""}: ${sms.message}`);
            const reason = sms.queued
                ? `Not sent yet (${sms.message}). It is queued and will be retried automatically.`
                : sms.message;
            return { sent: false, queued: sms.queued, reason };
        }

        recall.lastRemindedAt = new Date();
        if (recall.status === "pending") recall.status = "contacted";
        await recall.save();

        await History.create({
            actionType: "REMINDER_SENT",
            details: { itemId: recall._id, deletedAt: new Date() },
            message: `${user.fullName} sent a recall reminder SMS to ${patient.fullName} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: recall._id,
            entityType: "RECALL",
        });

        if (path) revalidatePath(path);
        return { sent: true };
    } catch (error) {
        console.log("unable to send recall reminder", error);
        throw error;
    }
}
export const sendRecallReminder = await withAuth(_sendRecallReminder);

async function _deleteRecall(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const recall = await Recall.findById(id);
        if (!recall || !recall._id) throw new Error("Recall not found");
        await deleteDocument({
            actionType: "RECALL_DELETED",
            documentId: recall._id.toString(),
            collectionName: "Recall",
            userId: `${user._id}`,
            trashMessage: `A recall (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a recall on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while deleting recall", error);
        throw error;
    }
}
export const deleteRecall = await withAuth(_deleteRecall);
