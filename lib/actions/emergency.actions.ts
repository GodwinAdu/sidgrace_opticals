"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import EmergencyCase from "../models/emergency.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import { sortEmergencyBoard } from "../clinical/emergency";

const EMERGENCY_PATH = "/dashboard/emergency";

async function generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`emergency-case-${year}`);
    return `ER-${year}-${String(seq).padStart(5, "0")}`;
}

interface TriageInput {
    patientId: string;
    attendanceId?: string | null;
    triageLevel: string;
    chiefComplaint: string;
    bay?: string;
    arrivedAt?: string | Date | null;
}

/**
 * Triage / register a new emergency case. Captures the triage level + chief
 * complaint and links to the patient (and optionally an attendance).
 */
async function _createEmergencyCase(user: User, values: TriageInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.patientId) throw new Error("A patient is required");
        if (!values?.triageLevel?.trim()) throw new Error("A triage level is required");
        if (!values?.chiefComplaint?.trim()) throw new Error("A chief complaint is required");
        await connectToDB();

        const caseNumber = await generateCaseNumber();
        const emergencyCase = await EmergencyCase.create({
            caseNumber,
            patientId: values.patientId,
            attendanceId: values.attendanceId || null,
            triageLevel: values.triageLevel.trim(),
            chiefComplaint: values.chiefComplaint.trim(),
            bay: values.bay?.trim() || "",
            status: "waiting",
            arrivedAt: values.arrivedAt ? new Date(values.arrivedAt) : new Date(),
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "EMERGENCY_CASE_CREATED",
            details: { itemId: emergencyCase._id },
            message: `${user.fullName} triaged emergency case ${caseNumber} (level ${emergencyCase.triageLevel}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: emergencyCase._id,
            entityType: "EMERGENCY_CASE",
        });

        revalidatePath(EMERGENCY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(emergencyCase));
    } catch (error) {
        console.log("unable to create emergency case", error);
        throw error;
    }
}
export const createEmergencyCase = await withAuth(_createEmergencyCase, "emergencyManagement");

interface UpdateTriageInput {
    triageLevel?: string;
    chiefComplaint?: string;
    bay?: string;
    status?: "waiting" | "in-treatment" | "disposed";
}

async function _updateEmergencyCase(user: User, id: string, values: UpdateTriageInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = {
            mod_flag: true,
            modifiedBy: user._id,
            action_type: "updated",
        };
        if (values.triageLevel !== undefined) update.triageLevel = values.triageLevel.trim();
        if (values.chiefComplaint !== undefined) update.chiefComplaint = values.chiefComplaint.trim();
        if (values.bay !== undefined) update.bay = values.bay.trim();
        if (values.status !== undefined) update.status = values.status;

        const emergencyCase = await EmergencyCase.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        if (!emergencyCase) throw new Error("Emergency case not found");

        await History.create({
            actionType: "EMERGENCY_CASE_UPDATED",
            details: { itemId: emergencyCase._id },
            message: `${user.fullName} updated emergency case ${emergencyCase.caseNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: emergencyCase._id,
            entityType: "EMERGENCY_CASE",
        });

        revalidatePath(EMERGENCY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(emergencyCase));
    } catch (error) {
        console.log("unable to update emergency case", error);
        throw error;
    }
}
export const updateEmergencyCase = await withAuth(_updateEmergencyCase, "emergencyManagement");

/**
 * Assign (or reassign) the treatment bay/space. Moves a waiting case into
 * active treatment.
 */
async function _assignBay(user: User, id: string, bay: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!bay?.trim()) throw new Error("A bay is required");
        await connectToDB();

        const emergencyCase = await EmergencyCase.findById(id);
        if (!emergencyCase) throw new Error("Emergency case not found");
        if (emergencyCase.status === "disposed") throw new Error("This case has already been disposed.");

        emergencyCase.bay = bay.trim();
        if (emergencyCase.status === "waiting") emergencyCase.status = "in-treatment";
        emergencyCase.mod_flag = true;
        emergencyCase.modifiedBy = user._id as never;
        emergencyCase.action_type = "updated";
        await emergencyCase.save();

        await History.create({
            actionType: "EMERGENCY_BAY_ASSIGNED",
            details: { itemId: emergencyCase._id, bay: emergencyCase.bay },
            message: `${user.fullName} assigned bay "${emergencyCase.bay}" to emergency case ${emergencyCase.caseNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: emergencyCase._id,
            entityType: "EMERGENCY_CASE",
        });

        revalidatePath(EMERGENCY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(emergencyCase));
    } catch (error) {
        console.log("unable to assign bay", error);
        throw error;
    }
}
export const assignBay = await withAuth(_assignBay, "emergencyManagement");

/**
 * Set the final disposition (admit / discharge / refer / transfer) and close
 * the ER case. The chosen disposition routes the patient onward — e.g. an
 * "admit" disposition surfaces the case to the admissions worklist, "refer"
 * to referrals — while the ER board drops it from the active list.
 */
async function _setDisposition(
    user: User,
    id: string,
    disposition: "admit" | "discharge" | "refer" | "transfer",
    note?: string,
    path?: string,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        const allowed = ["admit", "discharge", "refer", "transfer"] as const;
        if (!allowed.includes(disposition)) throw new Error("Invalid disposition");
        await connectToDB();

        const emergencyCase = await EmergencyCase.findById(id);
        if (!emergencyCase) throw new Error("Emergency case not found");

        emergencyCase.disposition = disposition;
        emergencyCase.dispositionNote = note?.trim() || "";
        emergencyCase.status = "disposed";
        emergencyCase.disposedAt = new Date();
        emergencyCase.mod_flag = true;
        emergencyCase.modifiedBy = user._id as never;
        emergencyCase.action_type = "updated";
        await emergencyCase.save();

        await History.create({
            actionType: "EMERGENCY_DISPOSED",
            details: { itemId: emergencyCase._id, disposition },
            message: `${user.fullName} disposed emergency case ${emergencyCase.caseNumber} as "${disposition}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: emergencyCase._id,
            entityType: "EMERGENCY_CASE",
        });

        revalidatePath(EMERGENCY_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(emergencyCase));
    } catch (error) {
        console.log("unable to set disposition", error);
        throw error;
    }
}
export const setDisposition = await withAuth(_setDisposition, "emergencyManagement");

async function _deleteEmergencyCase(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const emergencyCase = await EmergencyCase.findById(id);
        if (!emergencyCase || !emergencyCase._id) throw new Error("Emergency case not found");

        await deleteDocument({
            actionType: "EMERGENCY_CASE_DELETED",
            documentId: emergencyCase._id.toString(),
            collectionName: "EmergencyCase",
            userId: `${user._id}`,
            trashMessage: `An emergency case (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted an emergency case on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(EMERGENCY_PATH);
        return { success: true, message: "Emergency case deleted successfully" };
    } catch (error) {
        console.log("error while deleting emergency case", error);
        throw error;
    }
}
export const deleteEmergencyCase = await withAuth(_deleteEmergencyCase, "emergencyManagement");

/**
 * ER board — active cases (waiting + in-treatment), ordered by triage severity
 * then arrival time via the pure board sorter.
 */
async function _getEmergencyBoard(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const cases = await EmergencyCase.find({ status: { $ne: "disposed" }, del_flag: false })
            .populate("patientId", "fullName patientId")
            .lean();
        const sorted = sortEmergencyBoard(cases as unknown as { triageLevel?: string; arrivedAt?: string | Date | null }[]);
        return JSON.parse(JSON.stringify(sorted || []));
    } catch (error) {
        console.error("Error fetching emergency board:", error);
        return [];
    }
}
export const getEmergencyBoard = await withAuth(_getEmergencyBoard);

/** Recently disposed cases — a short audit trail under the board. */
async function _getDisposedEmergencyCases(user: User, limit = 20) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const cases = await EmergencyCase.find({ status: "disposed", del_flag: false })
            .populate("patientId", "fullName patientId")
            .sort({ disposedAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(cases || []));
    } catch (error) {
        console.error("Error fetching disposed emergency cases:", error);
        return [];
    }
}
export const getDisposedEmergencyCases = await withAuth(_getDisposedEmergencyCases);
