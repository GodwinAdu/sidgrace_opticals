"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Ward from "../models/ward.models";
import Bed from "../models/bed.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface WardValues {
    name: string;
    type?: string;
    dailyRate?: number;
    isActive?: boolean;
}

async function _createWard(user: User, values: WardValues, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const ward = new Ward({
            name: values.name,
            type: values.type || "general",
            dailyRate: Number(values.dailyRate) || 0,
            isActive: values.isActive ?? true,
            createdBy: user._id,
            action_type: "created",
        });

        await Promise.all([
            ward.save(),
            History.create({
                actionType: "WARD_CREATED",
                details: { itemId: ward._id, deletedAt: new Date() },
                message: `${user.fullName} created ward "${values.name}" on ${new Date().toLocaleString()}.`,
                performedBy: user._id,
                entityId: ward._id,
                entityType: "WARD",
            }),
        ]);

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(ward));
    } catch (error) {
        console.error("Error creating ward:", error);
        throw error;
    }
}
export const createWard = await withAuth(_createWard, "wardManagement");

/** All wards with their bed counts and current occupancy. */
async function _getAllWards(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const wards = await Ward.find({ del_flag: false }).sort({ name: 1 }).lean();
        if (!wards || wards.length === 0) return [];

        // Occupancy per ward in one pass.
        const beds = await Bed.find({ del_flag: false }).select("wardId status").lean();
        const totals = new Map<string, { total: number; occupied: number }>();
        for (const b of beds) {
            const key = String(b.wardId);
            const t = totals.get(key) || { total: 0, occupied: 0 };
            t.total += 1;
            if (b.status === "occupied") t.occupied += 1;
            totals.set(key, t);
        }

        const withOccupancy = wards.map((w) => {
            const t = totals.get(String(w._id)) || { total: 0, occupied: 0 };
            return { ...w, bedCount: t.total, occupiedCount: t.occupied };
        });

        return JSON.parse(JSON.stringify(withOccupancy));
    } catch (error) {
        console.error("Error fetching wards:", error);
        throw error;
    }
}
export const getAllWards = await withAuth(_getAllWards);

async function _updateWard(user: User, id: string, values: WardValues, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = {
            ...values,
            dailyRate: values.dailyRate !== undefined ? Number(values.dailyRate) || 0 : undefined,
            mod_flag: true,
            modifiedBy: user._id,
            action_type: "updated",
        };
        const updated = await Ward.findByIdAndUpdate(id, { $set: update }, { new: true });
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating ward:", error);
        throw error;
    }
}
export const updateWard = await withAuth(_updateWard, "wardManagement");

async function _deleteWard(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const ward = await Ward.findById(id);
        if (!ward || !ward._id) throw new Error("Ward not found");

        // Block deletion while any bed in the ward is occupied.
        const occupied = await Bed.countDocuments({ wardId: id, status: "occupied", del_flag: false });
        if (occupied > 0) {
            throw new Error("Cannot delete a ward with occupied beds. Discharge or transfer patients first.");
        }

        await deleteDocument({
            actionType: "WARD_DELETED",
            documentId: ward._id.toString(),
            collectionName: "Ward",
            userId: `${user._id}`,
            trashMessage: `Ward "${ward.name}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted ward "${ward.name}" on ${new Date().toLocaleString()}.`,
        });
        return { success: true };
    } catch (error) {
        console.error("Error deleting ward:", error);
        throw error;
    }
}
export const deleteWard = await withAuth(_deleteWard, "wardManagement");
