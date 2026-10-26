"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import PatientDocument from "../models/patient-document.models";
import { Patient } from "../models/patient.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";
import { normalizeDocumentType } from "../clinical/document";

/**
 * Document management (DMS) + consent archive.
 *
 * Files are stored via the shared upload pipeline (`uploadFile`) — callers
 * upload the file first, then persist the returned URL here. The database
 * keeps only the URL, a type, and an optional note (Requirement 13). Writes
 * are gated by `clinicalManagement` (reused from the EMR module) and audited
 * via `History`.
 */

interface CreatePatientDocumentInput {
    patientId: string;
    type?: string;
    title: string;
    url: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    note?: string;
    attendanceId?: string | null;
}

async function _createPatientDocument(user: User, values: CreatePatientDocumentInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.patientId) throw new Error("A patient is required");
        const title = (values?.title || "").trim();
        if (!title) throw new Error("A document title is required");
        const url = (values?.url || "").trim();
        if (!url) throw new Error("A document URL is required (upload the file first)");
        await connectToDB();

        const patient = await Patient.findById(values.patientId).select("fullName patientId");
        if (!patient) throw new Error("Patient not found");

        const type = normalizeDocumentType(values.type);

        const document = await PatientDocument.create({
            patientId: patient._id,
            attendanceId: values.attendanceId || null,
            type,
            title,
            url,
            fileName: values.fileName?.trim() || "",
            mimeType: values.mimeType?.trim() || "",
            size: typeof values.size === "number" ? values.size : 0,
            note: values.note?.trim() || "",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "PATIENT_DOCUMENT_CREATED",
            details: { itemId: document._id, type, patientId: patient._id },
            message: `${user.fullName} uploaded document "${title}" (${type}) for ${patient.fullName} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: document._id,
            entityType: "PATIENT_DOCUMENT",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(document));
    } catch (error) {
        console.error("Error creating patient document:", error);
        throw error;
    }
}
export const createPatientDocument = await withAuth(_createPatientDocument, "clinicalManagement");

async function _getPatientDocuments(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!patientId) return [];
        await connectToDB();
        const documents = await PatientDocument.find({ patientId, del_flag: false })
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(documents || []));
    } catch (error) {
        console.error("Error fetching patient documents:", error);
        return [];
    }
}
export const getPatientDocuments = await withAuth(_getPatientDocuments);

async function _deletePatientDocument(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const document = await PatientDocument.findById(id);
        if (!document || !document._id) throw new Error("Document not found");

        await deleteDocument({
            actionType: "PATIENT_DOCUMENT_DELETED",
            documentId: document._id.toString(),
            collectionName: "PatientDocument",
            userId: `${user._id}`,
            trashMessage: `Document "${document.title}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted document "${document.title}" on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Document deleted successfully" };
    } catch (error) {
        console.error("Error deleting patient document:", error);
        throw error;
    }
}
export const deletePatientDocument = await withAuth(_deletePatientDocument, "clinicalManagement");
