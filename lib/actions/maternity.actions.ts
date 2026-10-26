"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { AncRecord, DeliveryRecord } from "../models/maternity.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import { createPatient } from "./patient.actions";
import { estimatedDueDate } from "../clinical/maternity";

const MATERNITY_PATH = "/dashboard/maternity";

async function generateEpisodeNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`anc-episode-${year}`);
    return `ANC-${year}-${String(seq).padStart(5, "0")}`;
}

async function generateDeliveryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`delivery-${year}`);
    return `DEL-${year}-${String(seq).padStart(5, "0")}`;
}

/* ──────────────────────────── ANC RECORDS ───────────────────────────────── */

interface CreateAncInput {
    patientId: string;
    attendanceId?: string | null;
    lmp?: string | Date | null;
    gravida?: number | null;
    para?: number | null;
    bloodGroup?: string;
    riskFactors?: string;
}

/**
 * Open an antenatal-care (pregnancy) episode for a mother. The estimated due
 * date is derived from the LMP via Naegele's rule and stored for quick listing.
 */
async function _createAncRecord(user: User, values: CreateAncInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.patientId) throw new Error("A patient is required");
        await connectToDB();

        const lmp = values.lmp ? new Date(values.lmp) : null;
        const lmpValid = lmp && !Number.isNaN(lmp.getTime()) ? lmp : null;
        const edd = lmpValid ? estimatedDueDate(lmpValid) : null;

        const episodeNumber = await generateEpisodeNumber();
        const record = await AncRecord.create({
            episodeNumber,
            patientId: values.patientId,
            attendanceId: values.attendanceId || null,
            lmp: lmpValid,
            edd,
            gravida: values.gravida ?? null,
            para: values.para ?? null,
            bloodGroup: values.bloodGroup?.trim() || "",
            riskFactors: values.riskFactors?.trim() || "",
            visits: [],
            status: "active",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "ANC_RECORD_CREATED",
            details: { itemId: record._id },
            message: `${user.fullName} opened ANC episode ${episodeNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: record._id,
            entityType: "ANC_RECORD",
        });

        revalidatePath(MATERNITY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.log("unable to create ANC record", error);
        throw error;
    }
}
export const createAncRecord = await withAuth(_createAncRecord, "maternityManagement");

interface AddAncVisitInput {
    visitDate?: string | Date;
    gestationalWeeks?: number | null;
    weightKg?: number | null;
    bloodPressure?: string;
    fundalHeightCm?: number | null;
    fetalHeartRate?: number | null;
    notes?: string;
}

/**
 * Append an ANC visit (gestational age + key observations) to an episode. The
 * visit list is append-style — a longitudinal record over the pregnancy.
 */
async function _addAncVisit(user: User, ancId: string, values: AddAncVisitInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const record = await AncRecord.findById(ancId);
        if (!record) throw new Error("ANC record not found");

        const visitDate = values.visitDate ? new Date(values.visitDate) : new Date();
        if (Number.isNaN(visitDate.getTime())) throw new Error("Invalid visit date");

        record.visits.push({
            visitDate,
            gestationalWeeks: values.gestationalWeeks ?? null,
            weightKg: values.weightKg ?? null,
            bloodPressure: values.bloodPressure?.trim() || "",
            fundalHeightCm: values.fundalHeightCm ?? null,
            fetalHeartRate: values.fetalHeartRate ?? null,
            notes: values.notes?.trim() || "",
            recordedBy: user._id,
        } as never);
        record.mod_flag = true;
        record.modifiedBy = user._id as never;
        record.action_type = "updated";
        await record.save();

        await History.create({
            actionType: "ANC_VISIT_ADDED",
            details: { itemId: record._id },
            message: `${user.fullName} recorded an ANC visit on episode ${record.episodeNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: record._id,
            entityType: "ANC_RECORD",
        });

        revalidatePath(MATERNITY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.log("unable to add ANC visit", error);
        throw error;
    }
}
export const addAncVisit = await withAuth(_addAncVisit, "maternityManagement");

async function _getAncRecords(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const records = await AncRecord.find({ del_flag: false, status: { $ne: "closed" } })
            .populate("patientId", "fullName patientId")
            .sort({ createdAt: -1 })
            .lean();
        return JSON.parse(JSON.stringify(records || []));
    } catch (error) {
        console.error("Error fetching ANC records:", error);
        return [];
    }
}
export const getAncRecords = await withAuth(_getAncRecords);

async function _deleteAncRecord(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const record = await AncRecord.findById(id);
        if (!record || !record._id) throw new Error("ANC record not found");

        await deleteDocument({
            actionType: "ANC_RECORD_DELETED",
            documentId: record._id.toString(),
            collectionName: "AncRecord",
            userId: `${user._id}`,
            trashMessage: `ANC episode ${record.episodeNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted ANC episode ${record.episodeNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(MATERNITY_PATH);
        return { success: true, message: "ANC record deleted successfully" };
    } catch (error) {
        console.log("error while deleting ANC record", error);
        throw error;
    }
}
export const deleteAncRecord = await withAuth(_deleteAncRecord, "maternityManagement");

/* ──────────────────────────── DELIVERIES ────────────────────────────────── */

interface NewbornInput {
    sex?: "male" | "female" | "unknown";
    birthWeightGrams?: number | null;
    apgarScore?: number | null;
    status?: "alive" | "stillbirth" | "deceased";
    notes?: string;
    // When true, register the newborn as its own Patient (reusing createPatient).
    registerAsPatient?: boolean;
    fullName?: string;
}

interface RecordDeliveryInput {
    patientId: string; // the mother
    attendanceId?: string | null;
    ancRecordId?: string | null;
    deliveredAt?: string | Date;
    mode?: "vaginal" | "assisted-vaginal" | "caesarean" | "vbac" | "other";
    outcome?: "live-birth" | "stillbirth" | "miscarriage" | "neonatal-death" | "other";
    attendants?: string[];
    notes?: string;
    babies?: NewbornInput[];
}

/**
 * Register a newborn as a Patient by reusing the shared patient-creation path.
 * A newborn has no email/phone, so unique placeholder contact values are
 * supplied to satisfy the uniqueness checks without colliding with real
 * patients. Returns the created patient's id, or null on any failure (newborn
 * registration must never block recording the delivery itself).
 */
async function registerNewbornPatient(baby: NewbornInput, mother: { fullName?: string }): Promise<string | null> {
    try {
        const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const fullName = baby.fullName?.trim() || `Baby of ${mother?.fullName || "Unknown"}`;
        const gender = baby.sex === "male" || baby.sex === "female" ? baby.sex : "male";
        const patient = await createPatient({
            fullName,
            dob: new Date().toISOString().slice(0, 10),
            gender,
            // Unique placeholders so the uniqueness guard in createPatient passes;
            // these are not real contact details for an infant.
            email: `newborn-${stamp}@placeholder.local`,
            phone: `+000${stamp}`,
            patientId: `PAT-${stamp}`,
            originalId: Date.now() + Math.floor(Math.random() * 1000),
            registeredAt: new Date().toISOString(),
            registeredInfo: `Newborn registered via maternity module on ${new Date().toLocaleDateString()}`,
            status: "active",
        });
        return patient?._id ? String(patient._id) : null;
    } catch (error) {
        console.error("Newborn patient registration failed (non-blocking):", error);
        return null;
    }
}

/**
 * Record a delivery for a mother: mode, outcome, attendants, notes and the
 * baby/babies born. Each baby flagged `registerAsPatient` gets its own Patient
 * record (reusing createPatient); the resulting patient id is linked back onto
 * the baby so the mother→newborn relationship is preserved. If the delivery is
 * tied to an ANC episode, that episode is marked `delivered`.
 */
async function _recordDelivery(user: User, values: RecordDeliveryInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.patientId) throw new Error("A mother (patient) is required");
        await connectToDB();

        const deliveredAt = values.deliveredAt ? new Date(values.deliveredAt) : new Date();
        if (Number.isNaN(deliveredAt.getTime())) throw new Error("Invalid delivery date/time");

        // Resolve the mother's name once (for newborn naming).
        const { Patient } = await import("../models/patient.models");
        const mother = await Patient.findById(values.patientId).select("fullName").lean() as { fullName?: string } | null;

        const babies: NewbornInput[] = Array.isArray(values.babies) ? values.babies : [];
        const resolvedBabies = [];
        for (const baby of babies) {
            let newbornPatientId: string | null = null;
            if (baby.registerAsPatient && baby.status !== "stillbirth") {
                newbornPatientId = await registerNewbornPatient(baby, mother || {});
            }
            resolvedBabies.push({
                sex: baby.sex || "unknown",
                birthWeightGrams: baby.birthWeightGrams ?? null,
                apgarScore: baby.apgarScore ?? null,
                status: baby.status || "alive",
                notes: baby.notes?.trim() || "",
                patientId: newbornPatientId,
            });
        }

        const deliveryNumber = await generateDeliveryNumber();
        const delivery = await DeliveryRecord.create({
            deliveryNumber,
            patientId: values.patientId,
            attendanceId: values.attendanceId || null,
            ancRecordId: values.ancRecordId || null,
            deliveredAt,
            mode: values.mode || "vaginal",
            outcome: values.outcome || "live-birth",
            attendants: values.attendants || [],
            notes: values.notes?.trim() || "",
            babies: resolvedBabies,
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        // Close out the ANC episode as delivered.
        if (values.ancRecordId) {
            try {
                await AncRecord.findByIdAndUpdate(values.ancRecordId, {
                    $set: { status: "delivered", modifiedBy: user._id, mod_flag: true, action_type: "updated" },
                });
            } catch (e) {
                console.error("Could not mark ANC episode delivered (non-blocking):", e);
            }
        }

        await History.create({
            actionType: "DELIVERY_RECORD_CREATED",
            details: { itemId: delivery._id, babies: resolvedBabies.length },
            message: `${user.fullName} recorded delivery ${deliveryNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: delivery._id,
            entityType: "DELIVERY_RECORD",
        });

        // Audit each newborn registered as a patient.
        for (const b of resolvedBabies) {
            if (b.patientId) {
                await History.create({
                    actionType: "NEWBORN_REGISTERED",
                    details: { itemId: delivery._id, patientId: b.patientId },
                    message: `${user.fullName} registered a newborn as a patient under delivery ${deliveryNumber} on ${new Date().toLocaleString()}.`,
                    performedBy: user._id,
                    entityId: delivery._id,
                    entityType: "DELIVERY_RECORD",
                });
            }
        }

        revalidatePath(MATERNITY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(delivery));
    } catch (error) {
        console.log("unable to record delivery", error);
        throw error;
    }
}
export const recordDelivery = await withAuth(_recordDelivery, "maternityManagement");

async function _getDeliveries(user: User, limit = 30) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const deliveries = await DeliveryRecord.find({ del_flag: false })
            .populate("patientId", "fullName patientId")
            .populate("attendants", "fullName")
            .populate("babies.patientId", "fullName patientId")
            .sort({ deliveredAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(deliveries || []));
    } catch (error) {
        console.error("Error fetching deliveries:", error);
        return [];
    }
}
export const getDeliveries = await withAuth(_getDeliveries);

async function _deleteDelivery(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const delivery = await DeliveryRecord.findById(id);
        if (!delivery || !delivery._id) throw new Error("Delivery record not found");

        await deleteDocument({
            actionType: "DELIVERY_RECORD_DELETED",
            documentId: delivery._id.toString(),
            collectionName: "DeliveryRecord",
            userId: `${user._id}`,
            trashMessage: `Delivery ${delivery.deliveryNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted delivery ${delivery.deliveryNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(MATERNITY_PATH);
        return { success: true, message: "Delivery record deleted successfully" };
    } catch (error) {
        console.log("error while deleting delivery record", error);
        throw error;
    }
}
export const deleteDelivery = await withAuth(_deleteDelivery, "maternityManagement");
