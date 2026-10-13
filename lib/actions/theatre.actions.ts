"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { Theatre, SurgeryCase } from "../models/theatre.models";
import Invoice from "../models/invoice.models";
import Payment from "../models/payment.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import { findSlotConflict, type SurgeryBookingLike } from "../clinical/theatre";

const THEATRE_PATH = "/dashboard/theatre";

async function generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`surgery-case-${year}`);
    return `SX-${year}-${String(seq).padStart(5, "0")}`;
}

async function generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // Shares the same atomic sequence as invoice.actions so surgery-generated
    // and manual invoices never collide.
    const seq = await nextSequence(`invoice-${year}`);
    return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

/* ──────────────────────────── THEATRES (ROOMS) ──────────────────────────── */

async function _createTheatre(user: User, values: { name: string; location?: string }, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.name?.trim()) throw new Error("A theatre name is required");
        await connectToDB();

        const theatre = await Theatre.create({
            name: values.name.trim(),
            location: values.location?.trim() || "",
            isActive: true,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "THEATRE_CREATED",
            details: { itemId: theatre._id },
            message: `${user.fullName} added operating theatre "${theatre.name}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: theatre._id,
            entityType: "THEATRE",
        });

        revalidatePath(THEATRE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(theatre));
    } catch (error) {
        console.log("unable to create theatre", error);
        throw error;
    }
}
export const createTheatre = await withAuth(_createTheatre, "theatreManagement");

async function _getTheatres(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const theatres = await Theatre.find({ del_flag: false }).sort({ name: 1 }).lean();
        return JSON.parse(JSON.stringify(theatres || []));
    } catch (error) {
        console.error("Error fetching theatres:", error);
        return [];
    }
}
export const getTheatres = await withAuth(_getTheatres);

async function _deleteTheatre(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const theatre = await Theatre.findById(id);
        if (!theatre || !theatre._id) throw new Error("Theatre not found");

        await deleteDocument({
            actionType: "THEATRE_DELETED",
            documentId: theatre._id.toString(),
            collectionName: "Theatre",
            userId: `${user._id}`,
            trashMessage: `Theatre "${theatre.name}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted theatre "${theatre.name}" on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(THEATRE_PATH);
        return { success: true, message: "Theatre deleted successfully" };
    } catch (error) {
        console.log("error while deleting theatre", error);
        throw error;
    }
}
export const deleteTheatre = await withAuth(_deleteTheatre, "theatreManagement");

/* ──────────────────────────── SURGERY CASES ─────────────────────────────── */

interface BookSurgeryInput {
    patientId: string;
    attendanceId?: string | null;
    procedureId?: string | null;
    procedureName?: string;
    surgeons?: string[];
    theatreId: string;
    scheduledAt: string | Date;
    durationMinutes?: number;
    cost?: number;
    preOpNote?: string;
}

/**
 * Load active (non-cancelled, non-deleted) surgery cases for a theatre as the
 * minimal shape the pure slot-conflict guard needs. Excludes `excludeId` so an
 * edit of an existing case never collides with itself.
 */
async function activeBookingsForTheatre(theatreId: string, excludeId?: string): Promise<SurgeryBookingLike[]> {
    const query: Record<string, unknown> = {
        theatreId,
        del_flag: false,
        status: { $ne: "cancelled" },
    };
    if (excludeId) query._id = { $ne: excludeId };
    const cases = await SurgeryCase.find(query).select("theatreId scheduledAt durationMinutes status").lean();
    return (cases || []).map((c) => ({
        _id: String(c._id),
        theatreId: String(c.theatreId),
        scheduledAt: c.scheduledAt,
        durationMinutes: c.durationMinutes,
        status: c.status,
    }));
}

/**
 * Book a surgery case. Captures patient, procedure, surgeon(s), theatre, time
 * and (optional) pre-op note. Rejects a booking that double-books the theatre
 * slot using the pure slot-conflict guard.
 */
async function _bookSurgery(user: User, values: BookSurgeryInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.patientId) throw new Error("A patient is required");
        if (!values?.theatreId) throw new Error("A theatre is required");
        if (!values?.scheduledAt) throw new Error("A scheduled date/time is required");
        await connectToDB();

        const scheduledAt = new Date(values.scheduledAt);
        if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid scheduled date/time");
        const durationMinutes = Number(values.durationMinutes) > 0 ? Number(values.durationMinutes) : 60;

        const existing = await activeBookingsForTheatre(values.theatreId);
        const conflict = findSlotConflict(
            { theatreId: values.theatreId, scheduledAt, durationMinutes, status: "scheduled" },
            existing,
        );
        if (conflict) {
            throw new Error("That theatre slot overlaps an existing booking. Pick another time or theatre.");
        }

        const caseNumber = await generateCaseNumber();
        const surgery = await SurgeryCase.create({
            caseNumber,
            patientId: values.patientId,
            attendanceId: values.attendanceId || null,
            procedureId: values.procedureId || null,
            procedureName: values.procedureName?.trim() || "",
            surgeons: values.surgeons || [],
            theatreId: values.theatreId,
            scheduledAt,
            durationMinutes,
            cost: Number(values.cost) || 0,
            preOpNote: values.preOpNote?.trim() || "",
            status: "scheduled",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "SURGERY_CASE_CREATED",
            details: { itemId: surgery._id },
            message: `${user.fullName} booked surgery case ${caseNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: surgery._id,
            entityType: "SURGERY_CASE",
        });

        revalidatePath(THEATRE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(surgery));
    } catch (error) {
        console.log("unable to book surgery", error);
        throw error;
    }
}
export const bookSurgery = await withAuth(_bookSurgery, "theatreManagement");

interface UpdateSurgeryInput {
    procedureId?: string | null;
    procedureName?: string;
    surgeons?: string[];
    theatreId?: string;
    scheduledAt?: string | Date;
    durationMinutes?: number;
    cost?: number;
}

/**
 * Reschedule / edit a scheduled case. Re-runs the slot-conflict guard when the
 * theatre or time changes so an edit can't double-book either.
 */
async function _updateSurgery(user: User, id: string, values: UpdateSurgeryInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const surgery = await SurgeryCase.findById(id);
        if (!surgery) throw new Error("Surgery case not found");
        if (surgery.status === "completed" || surgery.status === "cancelled") {
            throw new Error("A completed or cancelled case cannot be edited.");
        }

        const nextTheatreId = values.theatreId || String(surgery.theatreId);
        const nextScheduledAt = values.scheduledAt ? new Date(values.scheduledAt) : surgery.scheduledAt;
        if (Number.isNaN(new Date(nextScheduledAt).getTime())) throw new Error("Invalid scheduled date/time");
        const nextDuration = Number(values.durationMinutes) > 0 ? Number(values.durationMinutes) : surgery.durationMinutes;

        const existing = await activeBookingsForTheatre(nextTheatreId, id);
        const conflict = findSlotConflict(
            { _id: id, theatreId: nextTheatreId, scheduledAt: nextScheduledAt, durationMinutes: nextDuration, status: "scheduled" },
            existing,
        );
        if (conflict) {
            throw new Error("That theatre slot overlaps an existing booking. Pick another time or theatre.");
        }

        surgery.theatreId = nextTheatreId as never;
        surgery.scheduledAt = nextScheduledAt;
        surgery.durationMinutes = nextDuration;
        if (values.procedureId !== undefined) surgery.procedureId = (values.procedureId || null) as never;
        if (values.procedureName !== undefined) surgery.procedureName = values.procedureName.trim();
        if (values.surgeons !== undefined) surgery.surgeons = values.surgeons as never;
        if (values.cost !== undefined) surgery.cost = Number(values.cost) || 0;
        surgery.mod_flag = true;
        surgery.modifiedBy = user._id as never;
        surgery.action_type = "updated";
        await surgery.save();

        await History.create({
            actionType: "SURGERY_CASE_UPDATED",
            details: { itemId: surgery._id },
            message: `${user.fullName} updated surgery case ${surgery.caseNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: surgery._id,
            entityType: "SURGERY_CASE",
        });

        revalidatePath(THEATRE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(surgery));
    } catch (error) {
        console.log("unable to update surgery", error);
        throw error;
    }
}
export const updateSurgery = await withAuth(_updateSurgery, "theatreManagement");

/**
 * Record a pre-op or post-op note against the case.
 */
async function _recordSurgeryNote(
    user: User,
    id: string,
    kind: "preOp" | "postOp",
    note: string,
    path?: string,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (kind !== "preOp" && kind !== "postOp") throw new Error("Invalid note type");
        await connectToDB();

        const surgery = await SurgeryCase.findById(id);
        if (!surgery) throw new Error("Surgery case not found");

        if (kind === "preOp") surgery.preOpNote = note?.trim() || "";
        else surgery.postOpNote = note?.trim() || "";
        surgery.mod_flag = true;
        surgery.modifiedBy = user._id as never;
        surgery.action_type = "updated";
        await surgery.save();

        await History.create({
            actionType: "SURGERY_NOTE_RECORDED",
            details: { itemId: surgery._id, kind },
            message: `${user.fullName} recorded a ${kind === "preOp" ? "pre-op" : "post-op"} note on surgery case ${surgery.caseNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: surgery._id,
            entityType: "SURGERY_CASE",
        });

        revalidatePath(THEATRE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(surgery));
    } catch (error) {
        console.log("unable to record surgery note", error);
        throw error;
    }
}
export const recordSurgeryNote = await withAuth(_recordSurgeryNote, "theatreManagement");

/**
 * Post a completed surgery's cost onto the patient's invoice via the shared
 * invoice-centric path (mirrors how bed charges post). Reuses the visit's
 * invoice when the case is linked to an attendance that already has one;
 * otherwise creates a standalone surgery invoice for the patient. Idempotent:
 * a case already marked `billed` is a no-op. No ledger post — income stays
 * cash-basis and posts only when the invoice is paid.
 */
async function billCompletedSurgery(user: User, surgery: ISurgeryCase): Promise<void> {
    if (surgery.billed) return;
    const amount = Number(surgery.cost) || 0;
    if (amount <= 0) return; // nothing to charge

    const lineDescription = `Surgery — ${surgery.procedureName || "Operation"} (${surgery.caseNumber})`;

    let invoice = null;
    // Prefer the attendance's existing invoice so the surgery lands on the
    // same bill as the rest of the visit.
    if (surgery.attendanceId) {
        const Attendance = (await import("../models/attendance.models")).default;
        const attendance = await Attendance.findById(String(surgery.attendanceId)).select("billing.invoiceId");
        const invoiceId = attendance?.billing?.invoiceId;
        if (invoiceId) {
            invoice = await Invoice.findById(String(invoiceId));
        }
    }

    if (invoice && invoice.status === "cancelled") invoice = null;

    if (!invoice) {
        // Standalone surgery invoice for the patient.
        const invoiceNumber = await generateInvoiceNumber();
        invoice = new Invoice({
            invoiceNumber,
            patientId: surgery.patientId,
            attendanceId: surgery.attendanceId || null,
            source: surgery.attendanceId ? "visit" : "manual",
            items: [],
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0,
            amountPaid: 0,
            balance: 0,
            status: "unpaid",
            notes: `Surgery charge for case ${surgery.caseNumber}`,
            createdBy: user._id,
            action_type: "created",
        });
    }

    // Rebuild items: drop any prior line for THIS case, then append the fresh one.
    const items = (invoice.items || []).filter(
        (it) => !String(it.description || "").includes(surgery.caseNumber),
    );
    items.push({
        description: lineDescription,
        procedureId: surgery.procedureId ? String(surgery.procedureId) : null,
        tooth: null,
        quantity: 1,
        unitPrice: amount,
        amount,
    } as never);

    const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const total = Math.max(0, subtotal + (Number(invoice.tax) || 0) - (Number(invoice.discount) || 0));

    // amountPaid is driven by recorded payments; recompute balance/status.
    const payments = await Payment.find({ invoiceId: invoice._id, del_flag: false });
    const amountPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    invoice.items = items as never;
    invoice.subtotal = subtotal;
    invoice.total = total;
    invoice.amountPaid = amountPaid;
    invoice.balance = Math.max(0, total - amountPaid);
    invoice.status = amountPaid <= 0 ? "unpaid" : invoice.balance <= 0 ? "paid" : "partial";
    invoice.mod_flag = true;
    invoice.modifiedBy = user._id as never;
    await invoice.save();

    surgery.billed = true;
    surgery.invoiceId = invoice._id as never;

    await History.create({
        actionType: "SURGERY_BILLED",
        details: { itemId: surgery._id, invoiceId: invoice._id, amount },
        message: `${user.fullName} billed surgery case ${surgery.caseNumber} (${amount}) onto invoice ${invoice.invoiceNumber} on ${new Date().toLocaleString()}.`,
        performedBy: user._id,
        entityId: surgery._id,
        entityType: "SURGERY_CASE",
    });
}

/**
 * Advance the case through its lifecycle (scheduled → in-progress → completed /
 * cancelled). On completion, the case cost is posted onto the patient's invoice.
 */
async function _setSurgeryStatus(
    user: User,
    id: string,
    status: "scheduled" | "in-progress" | "completed" | "cancelled",
    path?: string,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        const allowed = ["scheduled", "in-progress", "completed", "cancelled"] as const;
        if (!allowed.includes(status)) throw new Error("Invalid status");
        await connectToDB();

        const surgery = await SurgeryCase.findById(id);
        if (!surgery) throw new Error("Surgery case not found");

        surgery.status = status;
        if (status === "completed") surgery.completedAt = new Date();
        surgery.mod_flag = true;
        surgery.modifiedBy = user._id as never;
        surgery.action_type = "updated";

        // Completed surgery is billable onto the patient's invoice.
        if (status === "completed") {
            try {
                await billCompletedSurgery(user, surgery as unknown as ISurgeryCase);
            } catch (billingError) {
                // A billing hiccup must not block recording the clinical outcome.
                console.error("Surgery not billed at completion (non-blocking):", billingError);
            }
        }

        await surgery.save();

        await History.create({
            actionType: "SURGERY_STATUS_CHANGED",
            details: { itemId: surgery._id, status },
            message: `${user.fullName} set surgery case ${surgery.caseNumber} to "${status}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: surgery._id,
            entityType: "SURGERY_CASE",
        });

        revalidatePath(THEATRE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(surgery));
    } catch (error) {
        console.log("unable to set surgery status", error);
        throw error;
    }
}
export const setSurgeryStatus = await withAuth(_setSurgeryStatus, "theatreManagement");

async function _deleteSurgery(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const surgery = await SurgeryCase.findById(id);
        if (!surgery || !surgery._id) throw new Error("Surgery case not found");

        await deleteDocument({
            actionType: "SURGERY_CASE_DELETED",
            documentId: surgery._id.toString(),
            collectionName: "SurgeryCase",
            userId: `${user._id}`,
            trashMessage: `Surgery case ${surgery.caseNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted surgery case ${surgery.caseNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(THEATRE_PATH);
        return { success: true, message: "Surgery case deleted successfully" };
    } catch (error) {
        console.log("error while deleting surgery case", error);
        throw error;
    }
}
export const deleteSurgery = await withAuth(_deleteSurgery, "theatreManagement");

/**
 * The OR schedule — upcoming / active cases (not completed or cancelled),
 * ordered by theatre then time. Powers the per-theatre, per-day board.
 */
async function _getSurgerySchedule(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const cases = await SurgeryCase.find({ status: { $in: ["scheduled", "in-progress"] }, del_flag: false })
            .populate("patientId", "fullName patientId")
            .populate("theatreId", "name location")
            .populate("surgeons", "fullName")
            .sort({ scheduledAt: 1 })
            .lean();
        return JSON.parse(JSON.stringify(cases || []));
    } catch (error) {
        console.error("Error fetching surgery schedule:", error);
        return [];
    }
}
export const getSurgerySchedule = await withAuth(_getSurgerySchedule);

/** Recently completed / cancelled cases — a short history under the schedule. */
async function _getPastSurgeryCases(user: User, limit = 20) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const cases = await SurgeryCase.find({ status: { $in: ["completed", "cancelled"] }, del_flag: false })
            .populate("patientId", "fullName patientId")
            .populate("theatreId", "name location")
            .populate("surgeons", "fullName")
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(cases || []));
    } catch (error) {
        console.error("Error fetching past surgery cases:", error);
        return [];
    }
}
export const getPastSurgeryCases = await withAuth(_getPastSurgeryCases);
