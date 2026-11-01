"use server";

import { Types } from "mongoose";
import { withAuth, type User } from "../helpers/auth";
import { connectToDB } from "../mongoose";
import { Patient } from "../models/patient.models";
import Notification from "../models/notification.models";
import { kickSmsQueue } from "../helpers/sms";

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

/**
 * Bulk SMS targets patients by their record status. (The form field is still called
 * selectedRole for compatibility; it carries these status values, not staff roles.)
 * "All patients" means every patient who is not inactive, archived or deceased.
 */
const BULK_GROUP_STATUSES = ["active", "follow-up", "pending", "inactive"] as const
const NEVER_BULK = ["inactive", "archived", "deceased"]

function bulkQuery(allContacts: boolean, groups: string[]) {
    const hasPhone = { phone: { $exists: true, $nin: [null, ""] } }
    if (allContacts) return { ...hasPhone, status: { $nin: NEVER_BULK } }
    const statuses = groups.filter((g) => (BULK_GROUP_STATUSES as readonly string[]).includes(g))
    return { ...hasPhone, status: { $in: statuses } }
}

async function getRecipientsForBulkMode(allContacts: boolean, selectedRole: string[]): Promise<Types.ObjectId[]> {
    const patients = await Patient.find(bulkQuery(allContacts, selectedRole)).select("_id")
    return patients.map((p) => p._id)
}

/** Real number of patients a bulk send would reach (shown before sending). */
async function _countBulkRecipients(user: User, allContacts: boolean, groups: string[] = []): Promise<number> {
    if (!user) return 0
    if (!allContacts && groups.length === 0) return 0
    await connectToDB()
    return Patient.countDocuments(bulkQuery(allContacts, groups))
}
export const countBulkRecipients = await withAuth(_countBulkRecipients, "messaging")

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

    if (values.sendMode === "bulk" && !values.allContacts && !(values.selectedRole?.length)) {
        errors.push("Choose 'All patients' or at least one patient group")
    }

    if (values.type !== "SMS") {
        errors.push("Only SMS sending is supported")
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
        })

        // The SMS backend turns the notification into one queued message per patient and
        // sends them (it also checks every minute). Ask it to start now for immediate sends.
        if (!isScheduled && status === "published") {
            await kickSmsQueue()
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

export const createNotification = await withAuth(_createNotification, "messaging")
