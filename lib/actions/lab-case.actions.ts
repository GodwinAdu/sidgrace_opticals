"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import LabCase from "../models/lab-case.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface LabCaseValues {
    patientId: string;
    labName: string;
    caseType: string;
    tooth?: number | null;
    expectedDate?: string | null;
    cost?: number;
    note?: string;
}

async function _createLabCase(user: User, values: LabCaseValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const labCase = new LabCase({
            ...values,
            expectedDate: values.expectedDate ? new Date(values.expectedDate) : null,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "LAB_CASE_CREATED",
            details: { itemId: labCase._id, deletedAt: new Date() },
            message: `${user.fullName} sent a "${values.caseType}" case to ${values.labName} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: labCase._id,
            entityType: "LAB_CASE",
        });

        await Promise.all([labCase.save(), history.save()]);
        return JSON.parse(JSON.stringify(labCase));
    } catch (error) {
        console.log("unable to create lab case", error);
        throw error;
    }
}
export const createLabCase = await withAuth(_createLabCase);

async function _getAllLabCases(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const cases = await LabCase.find({ del_flag: false })
            .populate("patientId", "fullName patientId")
            .sort({ sentDate: -1 });
        if (!cases || cases.length === 0) return [];
        return JSON.parse(JSON.stringify(cases));
    } catch (error) {
        console.error("Error fetching lab cases:", error);
        throw error;
    }
}
export const getAllLabCases = await withAuth(_getAllLabCases);

async function _getLabCasesByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const cases = await LabCase.find({ patientId, del_flag: false })
            .populate("patientId", "fullName patientId")
            .sort({ sentDate: -1 });
        if (!cases || cases.length === 0) return [];
        return JSON.parse(JSON.stringify(cases));
    } catch (error) {
        console.error("Error fetching patient lab cases:", error);
        return [];
    }
}
export const getLabCasesByPatient = await withAuth(_getLabCasesByPatient);

async function _updateLabCaseStatus(user: User, id: string, status: string, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const update: Record<string, unknown> = { status, mod_flag: true, modifiedBy: user._id, action_type: "updated" };
        if (status === "received" || status === "fitted") update.receivedDate = new Date();
        const updated = await LabCase.findByIdAndUpdate(id, { $set: update }, { new: true });
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating lab case:", error);
        throw error;
    }
}
export const updateLabCaseStatus = await withAuth(_updateLabCaseStatus);

async function _deleteLabCase(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const labCase = await LabCase.findById(id);
        if (!labCase || !labCase._id) throw new Error("Lab case not found");
        await deleteDocument({
            actionType: "LAB_CASE_DELETED",
            documentId: labCase._id.toString(),
            collectionName: "LabCase",
            userId: `${user._id}`,
            trashMessage: `A lab case (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a lab case on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while deleting lab case", error);
        throw error;
    }
}
export const deleteLabCase = await withAuth(_deleteLabCase);
