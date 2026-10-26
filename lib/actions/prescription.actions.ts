"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { User, withAuth } from "../helpers/auth";
import Prescription from "../models/prescription.models";
import Attendance from "../models/attendance.models";
import History from "../models/history.models";
import { deleteDocument } from "./trash.actions";
import { dispenseVisitProducts } from "./visit-clinical.actions";

interface PrescriptionItemInput {
    productId?: string | null;
    drugName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
}

interface PrescriptionInput {
    patientId: string;
    appointmentId?: string | null;
    items: PrescriptionItemInput[];
    notes?: string;
}

/* ─────────────── CREATE ─────────────── */
async function _createPrescription(user: User, values: PrescriptionInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values.patientId) throw new Error("Patient is required");
        if (!values.items || values.items.length === 0) throw new Error("Add at least one drug");
        await connectToDB();

        const prescription = await Prescription.create({
            patientId: values.patientId,
            appointmentId: values.appointmentId || null,
            prescribedBy: user._id,
            status: "pending",
            items: values.items.map((it) => ({
                productId: it.productId || null,
                drugName: it.drugName,
                dosage: it.dosage || "",
                frequency: it.frequency || "",
                duration: it.duration || "",
                quantity: Number(it.quantity) || 1,
                dispensedQuantity: 0,
                instructions: it.instructions || "",
            })),
            notes: values.notes || "",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "PRESCRIPTION_CREATED",
            details: { itemId: prescription._id, deletedAt: new Date() },
            message: `${user.fullName} prescribed ${values.items.length} drug(s) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: prescription._id,
            entityType: "PRESCRIPTION",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/pharmacy");
        return JSON.parse(JSON.stringify(prescription));
    } catch (error) {
        console.error("Error creating prescription:", error);
        throw error;
    }
}
export const createPrescription = await withAuth(_createPrescription);

/* ─────────────── READS ─────────────── */
async function _getPrescriptionsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const list = await Prescription.find({ patientId, del_flag: false })
            .populate("prescribedBy", "fullName")
            .sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(list || []));
    } catch (error) {
        console.error("Error fetching patient prescriptions:", error);
        return [];
    }
}
export const getPrescriptionsByPatient = await withAuth(_getPrescriptionsByPatient);

/** Prescriptions for a specific visit/appointment. */
async function _getPrescriptionsByVisit(user: User, appointmentId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const list = await Prescription.find({ appointmentId, del_flag: false })
            .populate("prescribedBy", "fullName")
            .sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(list || []));
    } catch (error) {
        console.error("Error fetching visit prescriptions:", error);
        return [];
    }
}
export const getPrescriptionsByVisit = await withAuth(_getPrescriptionsByVisit);

/** The pharmacy queue: prescriptions awaiting dispensing. */
async function _getPendingPrescriptions(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const list = await Prescription.find({
            status: { $in: ["pending", "partially-dispensed"] },
            del_flag: false,
        })
            .populate("patientId", "fullName patientId")
            .populate("prescribedBy", "fullName")
            .sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(list || []));
    } catch (error) {
        console.error("Error fetching pending prescriptions:", error);
        return [];
    }
}
export const getPendingPrescriptions = await withAuth(_getPendingPrescriptions);

async function _getPrescriptionById(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const p = await Prescription.findById(id)
            .populate("patientId", "fullName patientId phone")
            .populate("prescribedBy", "fullName")
            .populate("items.productId", "name salePrice quantity");
        return p ? JSON.parse(JSON.stringify(p)) : null;
    } catch (error) {
        console.error("Error fetching prescription:", error);
        return null;
    }
}
export const getPrescriptionById = await withAuth(_getPrescriptionById);

/* ─────────────── DISPENSE ───────────────
 * Fulfils the inventory-linked items of a prescription: dispenses them against
 * stock and bills the visit (via dispenseVisitProducts), then marks the
 * prescription dispensed. Free-text items (no productId) are marked advised
 * (no stock/billing). Requires the prescription to be linked to a visit.
 */
async function _dispensePrescription(user: User, prescriptionId: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) throw new Error("Prescription not found");
        if (prescription.status === "dispensed") throw new Error("Already dispensed");

        const attendanceId = prescription.appointmentId ? String(prescription.appointmentId) : null;

        // Inventory-linked items to dispense (remaining quantity).
        const toDispense = (prescription.items || [])
            .filter((it) => it.productId)
            .map((it) => ({
                productId: String(it.productId),
                quantity: Math.max(0, (Number(it.quantity) || 0) - (Number(it.dispensedQuantity) || 0)),
            }))
            .filter((it) => it.quantity > 0);

        if (toDispense.length > 0) {
            if (!attendanceId) {
                throw new Error("This prescription is not linked to a visit, so billable drugs cannot be dispensed to a bill. Dispense from the patient's visit.");
            }
            // Merge with whatever is already dispensed on the visit so we don't
            // overwrite earlier dispensing. dispenseVisitProducts reconciles stock
            // by delta, so sending cumulative quantities is correct.
            const visit = await Attendance.findById(attendanceId).select("billing.dispensedProducts");
            const existingRaw = visit?.billing?.dispensedProducts;
            const existing: { productId?: unknown; quantity?: number }[] = existingRaw
                ? (typeof (existingRaw as { toObject?: () => unknown }).toObject === "function"
                    ? (existingRaw as unknown as { toObject: () => { productId?: unknown; quantity?: number }[] }).toObject()
                    : (existingRaw as { productId?: unknown; quantity?: number }[]))
                : [];

            const merged = new Map<string, number>();
            for (const e of existing) {
                if (e.productId) merged.set(String(e.productId), (merged.get(String(e.productId)) || 0) + (Number(e.quantity) || 0));
            }
            for (const d of toDispense) {
                merged.set(d.productId, (merged.get(d.productId) || 0) + d.quantity);
            }
            const mergedItems = Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));

            await dispenseVisitProducts(attendanceId, mergedItems, path);
        }

        // Mark each item fully dispensed.
        prescription.items = prescription.items.map((it) => ({
            ...(typeof (it as { toObject?: () => unknown }).toObject === "function" ? (it as unknown as { toObject: () => Record<string, unknown> }).toObject() : it),
            dispensedQuantity: Number(it.quantity) || 0,
        })) as never;
        prescription.status = "dispensed";
        prescription.dispensedBy = user._id as never;
        prescription.dispensedAt = new Date();
        prescription.mod_flag = true;
        prescription.modifiedBy = user._id as never;
        await prescription.save();

        await History.create({
            actionType: "PRESCRIPTION_DISPENSED",
            details: { itemId: prescription._id, deletedAt: new Date() },
            message: `${user.fullName} dispensed a prescription on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: prescription._id,
            entityType: "PRESCRIPTION",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/pharmacy");
        return JSON.parse(JSON.stringify(prescription));
    } catch (error) {
        console.error("Error dispensing prescription:", error);
        throw error;
    }
}
export const dispensePrescription = await withAuth(_dispensePrescription, "pharmacyManagement");

/* ─────────────── CANCEL / DELETE ─────────────── */
async function _cancelPrescription(user: User, prescriptionId: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const updated = await Prescription.findByIdAndUpdate(
            prescriptionId,
            { $set: { status: "cancelled", mod_flag: true, modifiedBy: user._id, action_type: "updated" } },
            { new: true }
        );
        if (path) revalidatePath(path);
        revalidatePath("/dashboard/pharmacy");
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error cancelling prescription:", error);
        throw error;
    }
}
export const cancelPrescription = await withAuth(_cancelPrescription);
