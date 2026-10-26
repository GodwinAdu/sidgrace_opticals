"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import IcuChartEntry from "../models/icu.models";
import Admission from "../models/admission.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { gcsTotal, orderTimeline, type IcuEntryType } from "../clinical/icu";

const VALID_TYPES: IcuEntryType[] = ["vitals", "ventilator", "gcs", "fluids", "note"];

interface AddIcuEntryInput {
    type: IcuEntryType;
    recordedAt?: string | Date | null;
    // Vitals
    temperature?: number | null;
    pulse?: number | null;
    bloodPressure?: string;
    respiratoryRate?: number | null;
    spo2?: number | null;
    // Ventilator settings
    ventMode?: string;
    fio2?: number | null;
    peep?: number | null;
    tidalVolume?: number | null;
    // GCS
    gcsEye?: number | null;
    gcsVerbal?: number | null;
    gcsMotor?: number | null;
    // Fluids
    fluidDirection?: "in" | "out" | "";
    fluidKind?: string;
    fluidVolumeMl?: number | null;
    // Shared
    note?: string;
}

/**
 * Append a time-stamped ICU observation to an admission's chart. Entries are
 * append-only — there is no edit or delete path, so each entry is an immutable
 * point on the flow-sheet. The GCS total is derived on write from its three
 * components. Gated by `attNursing` (nurses record at the bedside); the wider
 * ICU view is gated by `icuManagement`.
 */
async function _addIcuChartEntry(user: User, admissionId: string, values: AddIcuEntryInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!admissionId) throw new Error("An admission is required");
        if (!values?.type || !VALID_TYPES.includes(values.type)) throw new Error("A valid observation type is required");
        await connectToDB();

        // The entry is keyed to a real admission; grab the patient id from it so
        // the chart can also be queried per-patient.
        const admission = await Admission.findById(admissionId).select("patientId");
        if (!admission) throw new Error("Admission not found");

        const recordedAt = values.recordedAt ? new Date(values.recordedAt) : new Date();
        if (Number.isNaN(recordedAt.getTime())) throw new Error("Invalid observation time");

        const total =
            values.type === "gcs"
                ? gcsTotal({ eye: values.gcsEye, verbal: values.gcsVerbal, motor: values.gcsMotor })
                : null;

        const entry = await IcuChartEntry.create({
            admissionId,
            patientId: admission.patientId,
            type: values.type,
            recordedAt,
            temperature: values.temperature ?? null,
            pulse: values.pulse ?? null,
            bloodPressure: values.bloodPressure?.trim() || "",
            respiratoryRate: values.respiratoryRate ?? null,
            spo2: values.spo2 ?? null,
            ventMode: values.ventMode?.trim() || "",
            fio2: values.fio2 ?? null,
            peep: values.peep ?? null,
            tidalVolume: values.tidalVolume ?? null,
            gcsEye: values.gcsEye ?? null,
            gcsVerbal: values.gcsVerbal ?? null,
            gcsMotor: values.gcsMotor ?? null,
            gcsTotal: total,
            fluidDirection: values.fluidDirection === "in" || values.fluidDirection === "out" ? values.fluidDirection : "",
            fluidKind: values.fluidKind?.trim() || "",
            fluidVolumeMl: values.fluidVolumeMl ?? null,
            note: values.note?.trim() || "",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "ICU_CHART_ENTRY_CREATED",
            details: { itemId: entry._id, admissionId, type: values.type },
            message: `${user.fullName} recorded an ICU ${values.type} observation on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "ICU_CHART_ENTRY",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.error("Error adding ICU chart entry:", error);
        throw error;
    }
}
export const addIcuChartEntry = await withAuth(_addIcuChartEntry, "attNursing");

/**
 * The full ICU chart for an admission as an ordered timeline. Default is
 * chronological (oldest first); the UI can reverse for a newest-first feed.
 */
async function _getIcuChart(user: User, admissionId: string, direction: "asc" | "desc" = "asc") {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!admissionId) return [];
        await connectToDB();
        const entries = await IcuChartEntry.find({ admissionId })
            .populate("recordedBy", "fullName")
            .lean();
        const ordered = orderTimeline(entries as never[], direction);
        return JSON.parse(JSON.stringify(ordered));
    } catch (error) {
        console.error("Error fetching ICU chart:", error);
        return [];
    }
}
export const getIcuChart = await withAuth(_getIcuChart);
