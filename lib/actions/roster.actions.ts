"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Roster from "../models/roster.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface RosterValues {
    staffId: string;
    date: string;
    shiftStart: string;
    shiftEnd: string;
    room?: string;
    note?: string;
}

async function _createRoster(user: User, values: RosterValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const roster = new Roster({
            ...values,
            date: new Date(values.date),
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "ROSTER_CREATED",
            details: { itemId: roster._id, deletedAt: new Date() },
            message: `${user.fullName} scheduled a shift on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: roster._id,
            entityType: "ROSTER",
        });

        await Promise.all([roster.save(), history.save()]);
        return JSON.parse(JSON.stringify(roster));
    } catch (error) {
        console.log("unable to create roster", error);
        throw error;
    }
}
export const createRoster = await withAuth(_createRoster);

async function _getAllRosters(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const rosters = await Roster.find({ del_flag: false })
            .populate("staffId", "fullName role")
            .sort({ date: 1, shiftStart: 1 });
        if (!rosters || rosters.length === 0) return [];
        return JSON.parse(JSON.stringify(rosters));
    } catch (error) {
        console.error("Error fetching rosters:", error);
        throw error;
    }
}
export const getAllRosters = await withAuth(_getAllRosters);

async function _deleteRoster(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const roster = await Roster.findById(id);
        if (!roster || !roster._id) throw new Error("Roster not found");
        await deleteDocument({
            actionType: "ROSTER_DELETED",
            documentId: roster._id.toString(),
            collectionName: "Roster",
            userId: `${user._id}`,
            trashMessage: `A roster shift (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a roster shift on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.log("error while deleting roster", error);
        throw error;
    }
}
export const deleteRoster = await withAuth(_deleteRoster);
