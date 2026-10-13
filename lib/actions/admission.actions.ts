"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Admission from "../models/admission.models";
import Bed from "../models/bed.models";
import Ward from "../models/ward.models";
import Attendance from "../models/attendance.models";
import Invoice from "../models/invoice.models";
import Payment from "../models/payment.models";
import History from "../models/history.models";
import BedTransfer from "../models/bed-transfer.models";
import { User, withAuth } from "../helpers/auth";
import { runInTransaction } from "../helpers/transaction";
import { canTransitionBedTransfer, type BedTransferStatus } from "../clinical/queue";

/**
 * Whole-day accrual: each started day counts as one. Minimum 1 while admitted.
 */
function computeBedDays(admittedAt: Date, end: Date): number {
    const ms = end.getTime() - new Date(admittedAt).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Add or refresh the "Bed charge" line on the visit's invoice from the stay's
 * ward daily rate × bed-days. Preserves all other line items and payments.
 * No ledger post (cash-basis; income posts only on payment). No-op when the
 * visit has no invoice, no ward rate, or the invoice is cancelled.
 */
async function syncBedChargeOnInvoice(admission: {
    attendanceId?: unknown;
    wardId?: unknown;
    admittedAt?: Date;
    dischargedAt?: Date | null;
    status?: string;
}) {
    const attendance = await Attendance.findById(String(admission.attendanceId)).select("billing.invoiceId");
    const invoiceId = attendance?.billing?.invoiceId;
    if (!invoiceId) return;

    const invoice = await Invoice.findById(String(invoiceId));
    if (!invoice || invoice.status === "cancelled") return;

    const ward = await Ward.findById(String(admission.wardId)).select("name dailyRate");
    const rate = Number(ward?.dailyRate) || 0;

    const end = admission.status === "discharged" && admission.dischargedAt
        ? new Date(admission.dischargedAt)
        : new Date();
    const days = admission.admittedAt ? computeBedDays(admission.admittedAt as Date, end) : 0;
    const amount = rate * days;

    // Rebuild items: drop any prior bed-charge line, then add the fresh one.
    const items = (invoice.items || []).filter(
        (it) => !String(it.description || "").startsWith("Bed charge")
    );
    if (rate > 0 && days > 0 && amount > 0) {
        items.push({
            description: `Bed charge — ${ward?.name || "Ward"} (${days} day${days === 1 ? "" : "s"})`,
            procedureId: null,
            tooth: null,
            quantity: days,
            unitPrice: rate,
            amount,
        } as never);
    }

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
    await invoice.save();

    // Mirror totals onto the attendance for the read-only summary.
    await Attendance.findByIdAndUpdate(String(admission.attendanceId), {
        $set: { "billing.totalCharged": total, "billing.amountPaid": amountPaid, "billing.balance": invoice.balance },
    });
}

interface AdmitValues {
    patientId: string;
    attendanceId: string;
    wardId: string;
    bedId: string;
    reason?: string;
    expectedDischarge?: string | null;
}

async function _admitPatient(user: User, values: AdmitValues, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        // Admission writes three documents (admission + bed + attendance). Run
        // them atomically where the DB supports transactions so a mid-way
        // failure never leaves an occupied bed with no admission (or vice versa).
        const admission = await runInTransaction(async (session) => {
            const opts = session ? { session } : {};

            // No two concurrent active admissions for one patient.
            const active = await Admission.findOne(
                { patientId: values.patientId, status: "admitted", del_flag: false },
                null,
                opts,
            );
            if (active) throw new Error("This patient already has an active admission.");

            // Re-check bed vacancy at admit time (race-safe guard, not just UI).
            const bed = await Bed.findById(values.bedId, null, opts);
            if (!bed) throw new Error("Bed not found");
            if (bed.status !== "vacant") throw new Error("That bed is no longer vacant. Pick another.");

            const now = new Date();
            const [created] = await Admission.create(
                [
                    {
                        patientId: values.patientId,
                        attendanceId: values.attendanceId,
                        admittingStaff: user._id,
                        wardId: values.wardId,
                        bedId: values.bedId,
                        admittedAt: now,
                        expectedDischarge: values.expectedDischarge ? new Date(values.expectedDischarge) : null,
                        reason: values.reason || "",
                        status: "admitted",
                        bedHistory: [{ wardId: values.wardId, bedId: values.bedId, from: now, to: null }],
                        createdBy: user._id,
                        action_type: "created",
                    },
                ],
                session ? { session } : {},
            );

            // Occupy the bed.
            bed.status = "occupied";
            bed.currentAdmissionId = created._id as never;
            bed.mod_flag = true;
            bed.modifiedBy = user._id as never;
            await bed.save(opts);

            // Flip the visit to inpatient and link the admission.
            await Attendance.findByIdAndUpdate(
                values.attendanceId,
                { $set: { visitType: "inpatient", admissionId: created._id } },
                opts,
            );

            await History.create(
                [
                    {
                        actionType: "PATIENT_ADMITTED",
                        details: { itemId: created._id, deletedAt: new Date() },
                        message: `${user.fullName} admitted a patient on ${now.toLocaleString()}.`,
                        performedBy: user._id,
                        entityId: created._id,
                        entityType: "ADMISSION",
                    },
                ],
                session ? { session } : {},
            );

            return created;
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/wards");
        revalidatePath("/dashboard/admission");
        return JSON.parse(JSON.stringify(admission));
    } catch (error) {
        console.error("Error admitting patient:", error);
        throw error;
    }
}
export const admitPatient = await withAuth(_admitPatient, "admissionManagement");

/**
 * The physical bed swap for an active admission: free the old bed, occupy the
 * new one, and push the move onto bedHistory. Shared by the immediate
 * `transferBed` and the approval-gated `approveBedTransfer` so the move logic
 * (and its guards) stay identical. Not auth-gated itself — callers are.
 */
async function performBedMove(user: User, admissionId: string, newBedId: string) {
    const admission = await Admission.findById(admissionId);
    if (!admission) throw new Error("Admission not found");
    if (admission.status !== "admitted") throw new Error("This admission is not active.");

    const newBed = await Bed.findById(newBedId);
    if (!newBed) throw new Error("Target bed not found");
    if (newBed.status !== "vacant") throw new Error("Target bed is not vacant.");
    if (String(newBed._id) === String(admission.bedId)) throw new Error("Patient is already in that bed.");

    // Free the old bed.
    const oldBed = await Bed.findById(admission.bedId);
    if (oldBed) {
        oldBed.status = "vacant";
        oldBed.currentAdmissionId = null;
        await oldBed.save();
    }

    // Occupy the new bed.
    newBed.status = "occupied";
    newBed.currentAdmissionId = admission._id as never;
    await newBed.save();

    // Close the previous bedHistory entry, open a new one.
    const now = new Date();
    const history = (admission.bedHistory || []) as { to?: Date | null }[];
    if (history.length > 0) history[history.length - 1].to = now;
    admission.bedHistory = [...history, { wardId: newBed.wardId, bedId: newBed._id, from: now, to: null }] as never;
    admission.wardId = newBed.wardId as never;
    admission.bedId = newBed._id as never;
    admission.mod_flag = true;
    admission.modifiedBy = user._id as never;
    await admission.save();

    return admission;
}

async function _transferBed(user: User, admissionId: string, newBedId: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const admission = await performBedMove(user, admissionId, newBedId);

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/wards");
        return JSON.parse(JSON.stringify(admission));
    } catch (error) {
        console.error("Error transferring bed:", error);
        throw error;
    }
}
export const transferBed = await withAuth(_transferBed, "admissionManagement");

/* ═══════════════════ BED-TRANSFER APPROVAL (Requirement 12) ═══════════════════ */

const QUEUE_PATH = "/dashboard/queue";

/**
 * Record a *requested* bed transfer for an active admission. This does NOT move
 * the patient — it creates a `pending-approval` record that an approver must
 * approve (which then performs the actual move). Validates the admission is
 * active and the target bed is a real, vacant, different bed at request time.
 * Gated by `admissionManagement`.
 */
async function _requestBedTransfer(user: User, admissionId: string, newBedId: string, reason?: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!admissionId || !newBedId) throw new Error("An admission and a target bed are required");
        await connectToDB();

        const admission = await Admission.findById(admissionId);
        if (!admission) throw new Error("Admission not found");
        if (admission.status !== "admitted") throw new Error("This admission is not active.");

        const newBed = await Bed.findById(newBedId);
        if (!newBed) throw new Error("Target bed not found");
        if (newBed.status !== "vacant") throw new Error("Target bed is not vacant.");
        if (String(newBed._id) === String(admission.bedId)) throw new Error("Patient is already in that bed.");

        // One open request per admission at a time avoids conflicting approvals.
        const existing = await BedTransfer.findOne({ admissionId, status: "pending-approval", del_flag: false });
        if (existing) throw new Error("A bed transfer is already pending approval for this admission.");

        const request = await BedTransfer.create({
            admissionId: admission._id,
            patientId: admission.patientId,
            fromWardId: admission.wardId,
            fromBedId: admission.bedId,
            toWardId: newBed.wardId,
            toBedId: newBed._id,
            reason: (reason || "").trim(),
            status: "pending-approval",
            requestedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "BED_TRANSFER_REQUESTED",
            details: { itemId: request._id, admissionId: admission._id, toBedId: newBed._id },
            message: `${user.fullName} requested a bed transfer on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: request._id,
            entityType: "BED_TRANSFER",
        });

        revalidatePath(QUEUE_PATH);
        revalidatePath("/dashboard/admission");
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(request));
    } catch (error) {
        console.error("Error requesting bed transfer:", error);
        throw error;
    }
}
export const requestBedTransfer = await withAuth(_requestBedTransfer, "admissionManagement");

/**
 * Approve a pending bed-transfer request and perform the actual move (free old
 * bed, occupy new bed, update bedHistory). The status move is validated against
 * the allowed transitions, so an already-decided request can't be approved
 * twice. Gated by `admissionManagement`.
 */
async function _approveBedTransfer(user: User, requestId: string, note?: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!requestId) throw new Error("A transfer request is required");
        await connectToDB();

        const request = await BedTransfer.findById(requestId);
        if (!request) throw new Error("Transfer request not found");
        if (!canTransitionBedTransfer(request.status as BedTransferStatus, "approved")) {
            throw new Error(`Cannot approve a transfer that is ${request.status}.`);
        }

        // Perform the physical move (re-validates admission active + bed vacant).
        const admission = await performBedMove(user, String(request.admissionId), String(request.toBedId));

        const now = new Date();
        request.status = "approved";
        if (note && note.trim()) request.decisionNote = note.trim();
        request.decidedBy = user._id as never;
        request.decidedAt = now;
        request.mod_flag = true;
        request.modifiedBy = user._id as never;
        request.action_type = "updated";
        await request.save();

        await History.create({
            actionType: "BED_TRANSFER_APPROVED",
            details: { itemId: request._id, admissionId: request.admissionId, toBedId: request.toBedId },
            message: `${user.fullName} approved a bed transfer on ${now.toLocaleString()}.`,
            performedBy: user._id,
            entityId: request._id,
            entityType: "BED_TRANSFER",
        });

        revalidatePath(QUEUE_PATH);
        revalidatePath("/dashboard/admission");
        revalidatePath("/dashboard/wards");
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ request, admission }));
    } catch (error) {
        console.error("Error approving bed transfer:", error);
        throw error;
    }
}
export const approveBedTransfer = await withAuth(_approveBedTransfer, "admissionManagement");

/**
 * Reject a pending bed-transfer request. No bed move happens. Gated by
 * `admissionManagement`.
 */
async function _rejectBedTransfer(user: User, requestId: string, note?: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!requestId) throw new Error("A transfer request is required");
        await connectToDB();

        const request = await BedTransfer.findById(requestId);
        if (!request) throw new Error("Transfer request not found");
        if (!canTransitionBedTransfer(request.status as BedTransferStatus, "rejected")) {
            throw new Error(`Cannot reject a transfer that is ${request.status}.`);
        }

        const now = new Date();
        request.status = "rejected";
        if (note && note.trim()) request.decisionNote = note.trim();
        request.decidedBy = user._id as never;
        request.decidedAt = now;
        request.mod_flag = true;
        request.modifiedBy = user._id as never;
        request.action_type = "updated";
        await request.save();

        await History.create({
            actionType: "BED_TRANSFER_REJECTED",
            details: { itemId: request._id, admissionId: request.admissionId },
            message: `${user.fullName} rejected a bed transfer on ${now.toLocaleString()}.`,
            performedBy: user._id,
            entityId: request._id,
            entityType: "BED_TRANSFER",
        });

        revalidatePath(QUEUE_PATH);
        revalidatePath("/dashboard/admission");
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(request));
    } catch (error) {
        console.error("Error rejecting bed transfer:", error);
        throw error;
    }
}
export const rejectBedTransfer = await withAuth(_rejectBedTransfer, "admissionManagement");

/** Pending (and optionally decided) bed-transfer requests — approver worklist. */
async function _getBedTransfers(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        else query.status = "pending-approval";
        const requests = await BedTransfer.find(query)
            .populate("patientId", "fullName patientId")
            .populate("fromWardId", "name")
            .populate("fromBedId", "label")
            .populate("toWardId", "name")
            .populate("toBedId", "label")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return JSON.parse(JSON.stringify(requests || []));
    } catch (error) {
        console.error("Error fetching bed transfers:", error);
        return [];
    }
}
export const getBedTransfers = await withAuth(_getBedTransfers);

async function _dischargePatient(user: User, admissionId: string, dischargeSummary: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const admission = await Admission.findById(admissionId);
        if (!admission) throw new Error("Admission not found");
        if (admission.status === "discharged") {
            return { success: true, alreadyDischarged: true };
        }

        const now = new Date();
        admission.status = "discharged";
        admission.dischargedAt = now;
        admission.dischargeSummary = dischargeSummary || "";
        const history = (admission.bedHistory || []) as { to?: Date | null }[];
        if (history.length > 0) history[history.length - 1].to = now;
        admission.mod_flag = true;
        admission.modifiedBy = user._id as never;
        await admission.save();

        // Free the bed.
        const bed = await Bed.findById(admission.bedId);
        if (bed) {
            bed.status = "vacant";
            bed.currentAdmissionId = null;
            await bed.save();
        }

        // Finalize the bed-day charge on the visit invoice (best-effort — a
        // billing hiccup must not block a clinical discharge).
        try {
            await syncBedChargeOnInvoice(admission as unknown as Parameters<typeof syncBedChargeOnInvoice>[0]);
        } catch (billingError) {
            console.error("Bed charge not finalized at discharge (non-blocking):", billingError);
        }

        await History.create({
            actionType: "PATIENT_DISCHARGED",
            details: { itemId: admission._id, deletedAt: new Date() },
            message: `${user.fullName} discharged a patient on ${now.toLocaleString()}.`,
            performedBy: user._id,
            entityId: admission._id,
            entityType: "ADMISSION",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/wards");
        revalidatePath("/dashboard/admission");
        return JSON.parse(JSON.stringify(admission));
    } catch (error) {
        console.error("Error discharging patient:", error);
        throw error;
    }
}
export const dischargePatient = await withAuth(_dischargePatient, "admissionManagement");

/** Active admissions (optionally for one ward) — nurse worklist / admissions list. */
async function _getActiveAdmissions(user: User, wardId?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { status: "admitted", del_flag: false };
        if (wardId) query.wardId = wardId;
        const admissions = await Admission.find(query)
            .populate("patientId", "fullName patientId")
            .populate("wardId", "name")
            .populate("bedId", "label")
            .populate("admittingStaff", "fullName")
            .sort({ admittedAt: -1 })
            .lean();
        return JSON.parse(JSON.stringify(admissions || []));
    } catch (error) {
        console.error("Error fetching active admissions:", error);
        return [];
    }
}
export const getActiveAdmissions = await withAuth(_getActiveAdmissions);

/**
 * Recompute the ongoing bed-day charge for a visit's active admission onto its
 * invoice. Safe to call on demand (e.g. when the invoice/billing is viewed) so
 * the accrued bed charge stays current for still-admitted patients. No-op if
 * there is no active admission.
 */
async function _refreshBedCharge(user: User, attendanceId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const admission = await Admission.findOne({ attendanceId, status: "admitted", del_flag: false });
        if (!admission) return { updated: false };
        await syncBedChargeOnInvoice(admission as unknown as Parameters<typeof syncBedChargeOnInvoice>[0]);
        return { updated: true };
    } catch (error) {
        console.error("Error refreshing bed charge:", error);
        return { updated: false };
    }
}
export const refreshBedCharge = await withAuth(_refreshBedCharge);

/**
 * Visits checked in as inpatient (planned) that have NOT yet been placed in a
 * bed — i.e. no active admission exists. These are "awaiting bed assignment"
 * and should be completed via admitPatient. Powers the admissions worklist.
 */
async function _getAwaitingAdmission(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        // Inpatient-intent visits with no linked admission id.
        const visits = await Attendance.find({
            visitType: "inpatient",
            $or: [{ admissionId: null }, { admissionId: { $exists: false } }],
        })
            .populate("patientId", "fullName patientId")
            .sort({ date: -1 })
            .limit(50)
            .lean();

        // Exclude any that already have an active admission (defensive).
        const ids = visits.map((v) => v._id);
        const admitted = ids.length
            ? await Admission.find({ attendanceId: { $in: ids }, status: "admitted", del_flag: false }).select("attendanceId").lean()
            : [];
        const admittedSet = new Set(admitted.map((a) => String(a.attendanceId)));

        const pending = visits.filter((v) => !admittedSet.has(String(v._id)));
        return JSON.parse(JSON.stringify(pending));
    } catch (error) {
        console.error("Error fetching awaiting-admission visits:", error);
        return [];
    }
}
export const getAwaitingAdmission = await withAuth(_getAwaitingAdmission);

/** The active admission for a visit (header context on the attendance page). */
async function _getAdmissionByAttendance(user: User, attendanceId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const admission = await Admission.findOne({ attendanceId, status: "admitted", del_flag: false })
            .populate("wardId", "name dailyRate")
            .populate("bedId", "label")
            .lean();
        return admission ? JSON.parse(JSON.stringify(admission)) : null;
    } catch (error) {
        console.error("Error fetching admission by attendance:", error);
        return null;
    }
}
export const getAdmissionByAttendance = await withAuth(_getAdmissionByAttendance);

/**
 * Core recompute: refresh the accruing bed-day charge for EVERY active
 * admission onto its invoice. No auth here — callers (the authed action below,
 * and the secret-protected cron route) are responsible for access control.
 * Keeps a long-staying inpatient's bill current without anyone opening it.
 */
export async function recomputeActiveBedChargesCore() {
    await connectToDB();
    const active = await Admission.find({ status: "admitted", del_flag: false });
    let updated = 0;
    for (const admission of active) {
        try {
            await syncBedChargeOnInvoice(admission as unknown as Parameters<typeof syncBedChargeOnInvoice>[0]);
            updated += 1;
        } catch (e) {
            console.error("Bed charge recompute failed for admission", String(admission._id), e);
        }
    }
    return { updated, total: active.length };
}

/**
 * In-app wrapper, gated by admissionManagement (e.g. a "refresh all" button).
 */
async function _recomputeAllActiveBedCharges(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        return await recomputeActiveBedChargesCore();
    } catch (error) {
        console.error("Error recomputing active bed charges:", error);
        return { updated: 0, total: 0 };
    }
}
export const recomputeAllActiveBedCharges = await withAuth(_recomputeAllActiveBedCharges, "admissionManagement");
