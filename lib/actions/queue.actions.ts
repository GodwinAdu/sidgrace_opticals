"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import QueueTicket from "../models/queue-ticket.models";
import { Patient } from "../models/patient.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";
import {
    canTransitionTicket,
    isValidQueueService,
    nextTicketNumber,
    orderQueueForDisplay,
    type QueueService,
    type QueueStatus,
} from "../clinical/queue";

const QUEUE_PATH = "/dashboard/queue";

/** The calendar day a ticket belongs to, as YYYY-MM-DD (local), so numbering
 *  restarts each day per service and the display shows only today's queue. */
function dayKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/* ═══════════════════════════════ QUEUE TICKETS ══════════════════════════════ */

interface IssueTicketInput {
    service: string;
    label?: string;
    patientId?: string | null;
    attendanceId?: string | null;
    note?: string;
}

/**
 * Issue a queue token at a service point (OPD / pharmacy / lab). The token
 * number restarts at 1 each day per service and the ticket starts `waiting`.
 * A patient/visit may be linked, or a free label used for a walk-in. Gated by
 * the existing OPD/attendance flags — no new flag per Requirement 12 AC 3.
 */
async function _issueTicket(user: User, values: IssueTicketInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!isValidQueueService(values?.service)) {
            throw new Error("A valid queue service (opd/pharmacy/lab) is required");
        }
        await connectToDB();

        const service = values.service as QueueService;
        const day = dayKey();

        let patientId: string | null = null;
        let label = (values.label || "").trim();
        if (values.patientId) {
            const patient = await Patient.findById(values.patientId).select("fullName patientId");
            if (!patient) throw new Error("Patient not found");
            patientId = String(patient._id);
            if (!label) label = patient.fullName || "";
        }

        // Compute the next token number for this service today. The unique
        // index on {service, day, number} is the race-safe backstop; retry a
        // few times if two tokens are issued at the same instant.
        let created: unknown = null;
        for (let attempt = 0; attempt < 5 && !created; attempt++) {
            const todays = await QueueTicket.find({ service, day, del_flag: false })
                .select("number")
                .lean();
            const number = nextTicketNumber(todays.map((t) => Number(t.number)));
            try {
                created = await QueueTicket.create({
                    service,
                    number,
                    day,
                    label,
                    patientId,
                    attendanceId: values.attendanceId || null,
                    status: "waiting",
                    note: (values.note || "").trim(),
                    issuedBy: user._id,
                    createdBy: user._id,
                    action_type: "created",
                });
            } catch (e) {
                // Duplicate token number under concurrency — recompute and retry.
                if ((e as { code?: number })?.code === 11000) continue;
                throw e;
            }
        }
        if (!created) throw new Error("Could not issue a token, please try again");

        const ticket = created as { _id: unknown; number: number };
        await History.create({
            actionType: "QUEUE_TICKET_CREATED",
            details: { itemId: ticket._id, service, number: ticket.number },
            message: `${user.fullName} issued ${service.toUpperCase()} token #${ticket.number} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: ticket._id,
            entityType: "QUEUE_TICKET",
        });

        revalidatePath(QUEUE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(created));
    } catch (error) {
        console.error("Error issuing queue ticket:", error);
        throw error;
    }
}
export const issueTicket = await withAuth(_issueTicket, "opdManagement");

/**
 * Today's tickets for a service (or all services), ordered for the display
 * screen (serving → called → waiting → done → skipped, then token number).
 * Read-only — auth is enough.
 */
async function _getQueueTickets(user: User, service?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { day: dayKey(), del_flag: false };
        if (service && service !== "all" && isValidQueueService(service)) query.service = service;
        const tickets = await QueueTicket.find(query)
            .populate("patientId", "fullName patientId")
            .lean();
        const ordered = orderQueueForDisplay(
            (tickets || []).map((t) => ({ ...t, status: t.status as QueueStatus, number: Number(t.number) })),
        );
        return JSON.parse(JSON.stringify(ordered));
    } catch (error) {
        console.error("Error fetching queue tickets:", error);
        return [];
    }
}
export const getQueueTickets = await withAuth(_getQueueTickets);

/**
 * Advance a ticket's status (waiting → called → serving → done, with skipped as
 * an early exit and recall/requeue allowed). The move is validated against the
 * allowed transitions so an invalid status can never be persisted. Gated by the
 * existing OPD/attendance flags.
 */
async function _updateTicketStatus(user: User, id: string, status: QueueStatus, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A ticket is required");
        await connectToDB();

        const ticket = await QueueTicket.findById(id);
        if (!ticket) throw new Error("Ticket not found");

        if (!canTransitionTicket(ticket.status as QueueStatus, status)) {
            throw new Error(`Cannot move a ticket from ${ticket.status} to ${status}`);
        }

        const now = new Date();
        ticket.status = status;
        if (status === "called") ticket.calledAt = now;
        if (status === "serving") ticket.servedAt = now;
        if (status === "done") ticket.completedAt = now;
        ticket.mod_flag = true;
        ticket.modifiedBy = user._id as never;
        ticket.action_type = "updated";
        await ticket.save();

        await History.create({
            actionType: "QUEUE_TICKET_STATUS_CHANGED",
            details: { itemId: ticket._id, service: ticket.service, number: ticket.number, status },
            message: `${user.fullName} marked ${ticket.service.toUpperCase()} token #${ticket.number} as ${status} on ${now.toLocaleString()}.`,
            performedBy: user._id,
            entityId: ticket._id,
            entityType: "QUEUE_TICKET",
        });

        revalidatePath(QUEUE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(ticket));
    } catch (error) {
        console.error("Error updating ticket status:", error);
        throw error;
    }
}
export const updateTicketStatus = await withAuth(_updateTicketStatus, "opdManagement");

async function _deleteTicket(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const ticket = await QueueTicket.findById(id);
        if (!ticket || !ticket._id) throw new Error("Ticket not found");

        await deleteDocument({
            actionType: "QUEUE_TICKET_DELETED",
            documentId: ticket._id.toString(),
            collectionName: "QueueTicket",
            userId: `${user._id}`,
            trashMessage: `${ticket.service.toUpperCase()} token #${ticket.number} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} removed ${ticket.service.toUpperCase()} token #${ticket.number} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(QUEUE_PATH);
        return { success: true, message: "Ticket removed successfully" };
    } catch (error) {
        console.error("Error deleting queue ticket:", error);
        throw error;
    }
}
export const deleteTicket = await withAuth(_deleteTicket, "opdManagement");
