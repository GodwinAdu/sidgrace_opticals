"use server";

import { Types } from "mongoose";
import { withAuth, type User } from "../helpers/auth";
import { connectToDB } from "../mongoose";
import { Patient } from "../models/patient.models";
import Notification from "../models/notification.models";
import Staff from "../models/staff.models";

interface NotificationInput {
    sendMode: "individual" | "bulk" | "employeeBulk";
    recipients?: { recipientId: string }[]; // Only for individual
    type: "EMAIL" | "SMS";
    subject?: string;
    message: string;
    isScheduled: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
    selectedRole?: string[];
    allContacts: boolean;
    status: "draft" | "published" | "pending" | "achieved";
}
interface NotificationResponse {
    success: boolean
    message: string
    data?: any
    error?: string
}

async function getRecipientsForBulkMode(allContacts: boolean, selectedRole: string[]): Promise<Types.ObjectId[]> {
    const query = allContacts ? {} : { role: { $in: selectedRole } }
    const patients = await Patient.find(query).select("_id")
    return patients.map((p) => p._id)
}

async function validateNotificationInput(values: NotificationInput): Promise<string[]> {
    const errors: string[] = []

    if (!values.message?.trim()) {
        errors.push("Message is required")
    } else if (values.message.length > 1000) {
        errors.push("Message cannot exceed 1000 characters")
    }

    if (values.type === "EMAIL" && !values.subject?.trim()) {
        errors.push("Subject is required for email notifications")
    }

    if (values.isScheduled) {
        if (!values.scheduledDate) {
            errors.push("Scheduled date is required")
        } else if (new Date(values.scheduledDate) <= new Date()) {
            errors.push("Scheduled date must be in the future")
        }

        if (values.scheduledTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(values.scheduledTime)) {
            errors.push("Invalid time format. Use HH:MM")
        }
    }

    if (values.sendMode === "individual" && (!values.recipients || values.recipients.length === 0)) {
        errors.push("At least one recipient is required for individual mode")
    }

    return errors
}

async function _createNotification(user: User, values: NotificationInput): Promise<NotificationResponse> {
    try {
        if (!user) return { success: false, message: "Unauthorized", error: "UNAUTHORIZED" }

        await connectToDB()

        const errors = await validateNotificationInput(values)
        if (errors.length > 0) {
            return { success: false, message: "Validation failed", error: errors.join(", ") }
        }

        const {
            sendMode,
            recipients = [],
            type,
            subject,
            message,
            isScheduled,
            scheduledDate,
            scheduledTime,
            selectedRole = [],
            allContacts,
            status = "pending",
        } = values

        let finalRecipients: Types.ObjectId[] = []

        if (sendMode === "individual") {
            const ids = recipients.map((r) => new Types.ObjectId(r))
            const existing = await Patient.find({ _id: { $in: ids } }).select("_id")
            finalRecipients = existing.map((p) => p._id)

            if (finalRecipients.length === 0) {
                return { success: false, message: "No valid patients found", error: "NO_VALID_RECIPIENTS" }
            }
        }

        if (sendMode === "bulk") {
            finalRecipients = await getRecipientsForBulkMode(allContacts, selectedRole)
        }

        // if (sendMode === "employeeBulk") {
        //     const query = allContacts ? {} : { role: { $in: selectedRole } }
        //     const employees = await Staff.find(query).select("_id")
        //     finalRecipients = employees.map((e) => e._id)
        // }

        if (finalRecipients.length === 0) {
            return { success: false, message: "No recipients found", error: "NO_RECIPIENTS" }
        }

        const notification = await Notification.create({
            sendMode,
            recipients: finalRecipients,
            type,
            subject: type === "EMAIL" ? subject : undefined,
            message,
            isScheduled,
            scheduledDate: isScheduled ? new Date(scheduledDate!) : undefined,
            scheduledTime: isScheduled ? scheduledTime : undefined,
            selectedRole,
            allContacts,
            status,
            createdBy: new Types.ObjectId(user._id as string),
            deliveryStatus: {
                total: finalRecipients.length,
                sent: 0,
                failed: 0,
                pending: finalRecipients.length,
            },
        })

        // If not scheduled, trigger send (could be done in background with queue)
        if (!isScheduled && status === "published") {
            // Trigger immediate delivery
            // TODO: Send SMS or Email here
            console.log("🚀 Sending notification now:", notification._id)
        }

        return {
            success: true,
            message: `${isScheduled ? "Scheduled" : "Created"} notification successfully`,
            data: {
                id: notification._id,
                recipientCount: finalRecipients.length,
                scheduledFor: isScheduled ? notification.scheduledDate : null,
                status: notification.status,
                type: notification.type,
                sendMode: notification.sendMode,
            },
        }
    } catch (error: any) {
        console.error("Error creating notification:", error)
        const message = error?.message || "UNKNOWN_ERROR"

        if (error.name === "ValidationError") {
            const details = Object.values(error.errors).map((e: any) => e.message).join(", ")
            return { success: false, message: "Validation failed", error: details }
        }

        if (error.code === 11000) {
            return { success: false, message: "Duplicate entry", error: "DUPLICATE" }
        }

        return { success: false, message: "Notification creation failed", error: message }
    }
}

export const createNotification = await withAuth(_createNotification)
