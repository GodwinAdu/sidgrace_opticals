"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Imaging from "../models/imaging.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface ImagingValues {
    tooth?: number | null;
    type: string;
    title: string;
    fileUrl: string;
    note?: string;
    appointmentId?: string | null;
}

async function _createImaging(user: User, patientId: string, values: ImagingValues, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const image = new Imaging({
            patientId,
            ...values,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "IMAGING_CREATED",
            details: { itemId: image._id, deletedAt: new Date() },
            message: `${user.fullName} uploaded imaging "${image.title}" for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: image._id,
            entityType: "IMAGING",
        });

        await Promise.all([image.save(), history.save()]);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(image));
    } catch (error) {
        console.log("unable to create imaging", error);
        throw error;
    }
}
export const createImaging = await withAuth(_createImaging);

async function _getImagingByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const images = await Imaging.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!images || images.length === 0) return [];
        return JSON.parse(JSON.stringify(images));
    } catch (error) {
        console.error("Error fetching imaging:", error);
        throw error;
    }
}
export const getImagingByPatient = await withAuth(_getImagingByPatient);

async function _deleteImaging(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const image = await Imaging.findById(id);
        if (!image || !image._id) throw new Error("Imaging not found");

        await deleteDocument({
            actionType: "IMAGING_DELETED",
            documentId: image._id.toString(),
            collectionName: "Imaging",
            userId: `${user._id}`,
            trashMessage: `Imaging "${image.title}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted imaging "${image.title}" on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Imaging deleted successfully" };
    } catch (error) {
        console.log("error while deleting imaging", error);
        throw error;
    }
}
export const deleteImaging = await withAuth(_deleteImaging);
