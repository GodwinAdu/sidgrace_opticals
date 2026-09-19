"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import TreatmentPlan from "../models/treatment-plan.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

interface PlanItemInput {
    procedureId?: string | null;
    procedureName: string;
    tooth?: number | null;
    surface?: string;
    phase: number;
    cost: number;
    status?: "proposed" | "accepted" | "in-progress" | "completed" | "cancelled";
    note?: string;
}

interface PlanValues {
    patientId: string;
    title: string;
    items: PlanItemInput[];
    status?: "draft" | "proposed" | "accepted" | "in-progress" | "completed" | "cancelled";
    acceptedByPatient?: boolean;
}

function computeTotal(items: PlanItemInput[]) {
    return (items || []).reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
}

async function _createTreatmentPlan(user: User, values: PlanValues) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const totalCost = computeTotal(values.items);

        const plan = new TreatmentPlan({
            ...values,
            totalCost,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: "TREATMENT_PLAN_CREATED",
            details: { itemId: plan._id, deletedAt: new Date() },
            message: `${user.fullName} created treatment plan "${plan.title}" for patient ${values.patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: plan._id,
            entityType: "TREATMENT_PLAN",
        });

        await Promise.all([plan.save(), history.save()]);
        return JSON.parse(JSON.stringify(plan));
    } catch (error) {
        console.log("unable to create treatment plan", error);
        throw error;
    }
}
export const createTreatmentPlan = await withAuth(_createTreatmentPlan);

async function _getPlansByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const plans = await TreatmentPlan.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        if (!plans || plans.length === 0) return [];
        return JSON.parse(JSON.stringify(plans));
    } catch (error) {
        console.error("Error fetching treatment plans:", error);
        throw error;
    }
}
export const getPlansByPatient = await withAuth(_getPlansByPatient);

async function _getPlanById(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const plan = await TreatmentPlan.findById(id);
        return JSON.parse(JSON.stringify(plan));
    } catch (error) {
        console.log("unable to fetch treatment plan", error);
        throw error;
    }
}
export const getPlanById = await withAuth(_getPlanById);

async function _updateTreatmentPlan(user: User, id: string, values: Partial<PlanValues>, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = {
            ...values,
            mod_flag: true,
            modifiedBy: user._id,
            action_type: "updated",
        };
        if (values.items) update.totalCost = computeTotal(values.items);
        if (values.acceptedByPatient) update.acceptedAt = new Date();

        const updated = await TreatmentPlan.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        if (!updated) return null;

        await History.create({
            actionType: "TREATMENT_PLAN_UPDATED",
            details: { itemId: updated._id, deletedAt: new Date() },
            message: `${user.fullName} updated treatment plan "${updated.title}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: updated._id,
            entityType: "TREATMENT_PLAN",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(updated));
    } catch (error) {
        console.error("Error updating treatment plan:", error);
        throw error;
    }
}
export const updateTreatmentPlan = await withAuth(_updateTreatmentPlan);

async function _deleteTreatmentPlan(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const plan = await TreatmentPlan.findById(id);
        if (!plan || !plan._id) throw new Error("Treatment plan not found");

        await deleteDocument({
            actionType: "TREATMENT_PLAN_DELETED",
            documentId: plan._id.toString(),
            collectionName: "TreatmentPlan",
            userId: `${user._id}`,
            trashMessage: `Treatment plan "${plan.title}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted treatment plan "${plan.title}" on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Treatment plan deleted successfully" };
    } catch (error) {
        console.log("error while deleting treatment plan", error);
        throw error;
    }
}
export const deleteTreatmentPlan = await withAuth(_deleteTreatmentPlan);
