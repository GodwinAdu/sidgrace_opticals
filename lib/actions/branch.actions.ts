"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Branch from "../models/branch.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface BranchValues {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

async function _createBranch(user: User, values: BranchValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const existing = await Branch.findOne({ name: values.name });
        if (existing) throw new Error("A branch with this name already exists");

        const branch = new Branch({ ...values, createdBy: user._id, action_type: "created" });

        const history = new History({
            actionType: "BRANCH_CREATED",
            details: { itemId: branch._id, deletedAt: new Date() },
            message: `${user.fullName} created branch "${values.name}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: branch._id,
            entityType: "BRANCH",
        });

        await Promise.all([branch.save(), history.save()]);
        return JSON.parse(JSON.stringify(branch));
    } catch (error) {
        console.log("unable to create branch", error);
        throw error;
    }
}
export const createBranch = await withAuth(_createBranch);

async function _getAllBranches(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const branches = await Branch.find({ del_flag: false }).sort({ createdAt: -1 });
        if (!branches || branches.length === 0) return [];
        return JSON.parse(JSON.stringify(branches));
    } catch (error) {
        console.error("Error fetching branches:", error);
        throw error;
    }
}
export const getAllBranches = await withAuth(_getAllBranches);

async function _deleteBranch(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const branch = await Branch.findById(id);
        if (!branch || !branch._id) throw new Error("Branch not found");
        await deleteDocument({
            actionType: "BRANCH_DELETED",
            documentId: branch._id.toString(),
            collectionName: "Branch",
            userId: `${user._id}`,
            trashMessage: `Branch "${branch.name}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted branch "${branch.name}" on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while deleting branch", error);
        throw error;
    }
}
export const deleteBranch = await withAuth(_deleteBranch);
