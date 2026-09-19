"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import PerioChart from "../models/perio-chart.models";
import ClinicalNote from "../models/clinical-note.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

/* ─────────────── PERIO CHART ─────────────── */

interface PerioMeasurementInput {
    tooth: number;
    pocketDepth: number[];
    bleeding?: boolean;
    recession?: number;
    mobility?: number;
}

async function _savePerioChart(
    user: User,
    patientId: string,
    values: { measurements: PerioMeasurementInput[]; note?: string; appointmentId?: string | null },
    path: string
) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const chart = new PerioChart({
            patientId,
            appointmentId: values.appointmentId || null,
            measurements: values.measurements || [],
            note: values.note || "",
            examinedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "PERIO_CHART_CREATED",
            details: { itemId: chart._id, deletedAt: new Date() },
            message: `${user.fullName} recorded a periodontal chart for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: chart._id,
            entityType: "PERIO_CHART",
        });

        await Promise.all([chart.save(), history.save()]);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(chart));
    } catch (error) {
        console.log("unable to save perio chart", error);
        throw error;
    }
}
export const savePerioChart = await withAuth(_savePerioChart);

async function _getPerioChartsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const charts = await PerioChart.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!charts || charts.length === 0) return [];
        return JSON.parse(JSON.stringify(charts));
    } catch (error) {
        console.error("Error fetching perio charts:", error);
        throw error;
    }
}
export const getPerioChartsByPatient = await withAuth(_getPerioChartsByPatient);

/* ─────────────── CLINICAL SOAP NOTES ─────────────── */

interface ClinicalNoteInput {
    appointmentId?: string | null;
    teeth?: number[];
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
}

async function _createClinicalNote(user: User, patientId: string, values: ClinicalNoteInput, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const note = new ClinicalNote({
            patientId,
            appointmentId: values.appointmentId || null,
            teeth: values.teeth || [],
            subjective: values.subjective || "",
            objective: values.objective || "",
            assessment: values.assessment || "",
            plan: values.plan || "",
            authoredBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "CLINICAL_NOTE_CREATED",
            details: { itemId: note._id, deletedAt: new Date() },
            message: `${user.fullName} added a clinical note for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: note._id,
            entityType: "CLINICAL_NOTE",
        });

        await Promise.all([note.save(), history.save()]);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(note));
    } catch (error) {
        console.log("unable to create clinical note", error);
        throw error;
    }
}
export const createClinicalNote = await withAuth(_createClinicalNote);

async function _getNotesByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const notes = await ClinicalNote.find({ patientId, del_flag: false })
            .populate("authoredBy", "fullName")
            .sort({ createdAt: -1 });
        if (!notes || notes.length === 0) return [];
        return JSON.parse(JSON.stringify(notes));
    } catch (error) {
        console.error("Error fetching clinical notes:", error);
        throw error;
    }
}
export const getNotesByPatient = await withAuth(_getNotesByPatient);

async function _deleteClinicalNote(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const note = await ClinicalNote.findById(id);
        if (!note || !note._id) throw new Error("Clinical note not found");

        await deleteDocument({
            actionType: "CLINICAL_NOTE_DELETED",
            documentId: note._id.toString(),
            collectionName: "ClinicalNote",
            userId: `${user._id}`,
            trashMessage: `A clinical note (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a clinical note on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Clinical note deleted successfully" };
    } catch (error) {
        console.log("error while deleting clinical note", error);
        throw error;
    }
}
export const deleteClinicalNote = await withAuth(_deleteClinicalNote);
