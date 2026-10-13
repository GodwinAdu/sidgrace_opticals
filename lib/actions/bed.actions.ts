"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Bed from "../models/bed.models";
import Ward from "../models/ward.models";
import Admission from "../models/admission.models";
import { Patient } from "../models/patient.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface BedValues {
    label: string;
    wardId: string;
    status?: "vacant" | "occupied" | "maintenance";
}

async function _createBed(user: User, values: BedValues, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const bed = new Bed({
            label: values.label,
            wardId: values.wardId,
            status: values.status || "vacant",
            createdBy: user._id,
            action_type: "created",
        });
        await bed.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(bed));
    } catch (error: unknown) {
        // Duplicate label within a ward trips the unique index.
        if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
            throw new Error("A bed with that label already exists in this ward.");
        }
        console.error("Error creating bed:", error);
        throw error;
    }
}
export const createBed = await withAuth(_createBed, "wardManagement");

async function _getBedsByWard(user: User, wardId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const beds = await Bed.find({ wardId, del_flag: false }).sort({ label: 1 }).lean();
        return JSON.parse(JSON.stringify(beds || []));
    } catch (error) {
        console.error("Error fetching beds:", error);
        return [];
    }
}
export const getBedsByWard = await withAuth(_getBedsByWard);

/**
 * Full bed board: every ward with its beds, each bed annotated with the current
 * patient's name when occupied.
 */
async function _getBedBoard(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const [wards, beds] = await Promise.all([
            Ward.find({ del_flag: false }).sort({ name: 1 }).lean(),
            Bed.find({ del_flag: false }).sort({ label: 1 }).lean(),
        ]);

        // Resolve current patient for occupied beds via their admissions.
        const admissionIds = beds
            .filter((b) => b.status === "occupied" && b.currentAdmissionId)
            .map((b) => b.currentAdmissionId);
        const admissions = admissionIds.length
            ? await Admission.find({ _id: { $in: admissionIds } }).select("_id patientId").lean()
            : [];
        const patientIds = admissions.map((a) => a.patientId);
        const patients = patientIds.length
            ? await Patient.find({ _id: { $in: patientIds } }).select("_id fullName").lean()
            : [];
        const admissionToPatient = new Map(admissions.map((a) => [String(a._id), String(a.patientId)]));
        const patientName = new Map(patients.map((p) => [String(p._id), (p as { fullName?: string }).fullName || ""]));

        const board = wards.map((w) => ({
            ...w,
            beds: beds
                .filter((b) => String(b.wardId) === String(w._id))
                .map((b) => {
                    const pid = b.currentAdmissionId ? admissionToPatient.get(String(b.currentAdmissionId)) : null;
                    return { ...b, patientName: pid ? patientName.get(pid) || "" : "" };
                }),
        }));

        return JSON.parse(JSON.stringify(board));
    } catch (error) {
        console.error("Error building bed board:", error);
        return [];
    }
}
export const getBedBoard = await withAuth(_getBedBoard);

/** Vacant beds (optionally in one ward) — for the admission picker. */
async function _getVacantBeds(user: User, wardId?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { status: "vacant", del_flag: false };
        if (wardId) query.wardId = wardId;
        const beds = await Bed.find(query).sort({ label: 1 }).lean();
        return JSON.parse(JSON.stringify(beds || []));
    } catch (error) {
        console.error("Error fetching vacant beds:", error);
        return [];
    }
}
export const getVacantBeds = await withAuth(_getVacantBeds);

async function _updateBedStatus(user: User, id: string, status: "vacant" | "maintenance", path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const bed = await Bed.findById(id);
        if (!bed) throw new Error("Bed not found");
        if (bed.status === "occupied") throw new Error("Cannot change the status of an occupied bed.");

        bed.status = status;
        bed.mod_flag = true;
        bed.modifiedBy = user._id as never;
        await bed.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(bed));
    } catch (error) {
        console.error("Error updating bed status:", error);
        throw error;
    }
}
export const updateBedStatus = await withAuth(_updateBedStatus, "wardManagement");

async function _deleteBed(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const bed = await Bed.findById(id);
        if (!bed || !bed._id) throw new Error("Bed not found");
        if (bed.status === "occupied") throw new Error("Cannot delete an occupied bed.");

        await deleteDocument({
            actionType: "BED_DELETED",
            documentId: bed._id.toString(),
            collectionName: "Bed",
            userId: `${user._id}`,
            trashMessage: `Bed "${bed.label}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted bed "${bed.label}" on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.error("Error deleting bed:", error);
        throw error;
    }
}
export const deleteBed = await withAuth(_deleteBed, "wardManagement");
