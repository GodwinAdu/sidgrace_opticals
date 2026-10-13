"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Procedure from "../models/procedure.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface ProcedureValues {
    code: string;
    name: string;
    category: string;
    description?: string;
    defaultDuration: number;
    price: number;
    isActive?: boolean;
}

async function _createProcedure(user: User, values: ProcedureValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const existing = await Procedure.findOne({ code: values.code });
        if (existing) throw new Error("A procedure with this code already exists");

        const procedure = new Procedure({
            ...values,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "PROCEDURE_CREATED",
            details: { itemId: procedure._id, deletedAt: new Date() },
            message: `${user.fullName} created procedure "${procedure.name}" (${procedure.code}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: procedure._id,
            entityType: "PROCEDURE",
        });

        await Promise.all([procedure.save(), history.save()]);
        return JSON.parse(JSON.stringify(procedure));
    } catch (error) {
        console.log("unable to create procedure", error);
        throw error;
    }
}
export const createProcedure = await withAuth(_createProcedure, "procedureManagement");

async function _getAllProcedures(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const procedures = await Procedure.find({ del_flag: false })
            .populate("createdBy", "fullName")
            .sort({ createdAt: -1 })
            .exec();
        if (!procedures || procedures.length === 0) return [];
        return JSON.parse(JSON.stringify(procedures));
    } catch (error) {
        console.error("Error fetching procedures:", error);
        throw error;
    }
}
export const getAllProcedures = await withAuth(_getAllProcedures);

async function _getProcedureById(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const procedure = await Procedure.findById(id);
        return JSON.parse(JSON.stringify(procedure));
    } catch (error) {
        console.log("unable to fetch procedure", error);
        throw error;
    }
}
export const getProcedureById = await withAuth(_getProcedureById);

async function _updateProcedure(user: User, id: string, values: Partial<ProcedureValues>, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const updated = await Procedure.findByIdAndUpdate(
            id,
            { $set: { ...values, mod_flag: true, modifiedBy: user._id, action_type: "updated" } },
            { new: true, runValidators: true }
        );
        if (!updated) return null;
        revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating procedure:", error);
        throw error;
    }
}
export const updateProcedure = await withAuth(_updateProcedure, "procedureManagement");

async function _deleteProcedure(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const procedure = await Procedure.findById(id);
        if (!procedure || !procedure._id) throw new Error("Procedure not found");

        await deleteDocument({
            actionType: "PROCEDURE_DELETED",
            documentId: procedure._id.toString(),
            collectionName: "Procedure",
            userId: `${user._id}`,
            trashMessage: `"${procedure.name}" (${procedure.code}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted procedure "${procedure.name}" on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Procedure deleted successfully" };
    } catch (error) {
        console.log("error while deleting procedure", error);
        throw error;
    }
}
export const deleteProcedure = await withAuth(_deleteProcedure, "procedureManagement");
