"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import LabOrder from "../models/lab-order.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";

interface TestInput {
    name: string;
    result?: string;
    unit?: string;
    referenceRange?: string;
    flag?: "normal" | "high" | "low" | "abnormal" | "";
}
interface LabOrderInput {
    patientId: string;
    attendanceId?: string | null;
    category?: "lab" | "radiology";
    tests: TestInput[];
    note?: string;
}

async function generateOrderNumber(category: "lab" | "radiology"): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = category === "radiology" ? "RAD" : "LAB";
    const seq = await nextSequence(`${category}-order-${year}`);
    return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

async function _createLabOrder(user: User, values: LabOrderInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values.tests || values.tests.length === 0) throw new Error("Add at least one test");
        await connectToDB();

        const category = values.category || "lab";
        const orderNumber = await generateOrderNumber(category);
        const order = await LabOrder.create({
            orderNumber,
            patientId: values.patientId,
            attendanceId: values.attendanceId || null,
            category,
            tests: values.tests.map((t) => ({ name: t.name, result: t.result || "", unit: t.unit || "", referenceRange: t.referenceRange || "", flag: t.flag || "" })),
            status: "ordered",
            note: values.note || "",
            orderedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "LAB_ORDER_CREATED",
            details: { itemId: order._id, deletedAt: new Date() },
            message: `${user.fullName} ordered ${category} (${orderNumber}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: order._id,
            entityType: "LAB_ORDER",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/lab");
        return JSON.parse(JSON.stringify(order));
    } catch (error) {
        console.error("Error creating lab order:", error);
        throw error;
    }
}
export const createLabOrder = await withAuth(_createLabOrder, "labManagement");

async function _getLabOrders(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const orders = await LabOrder.find(query)
            .populate("patientId", "fullName patientId")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return JSON.parse(JSON.stringify(orders || []));
    } catch (error) {
        console.error("Error fetching lab orders:", error);
        return [];
    }
}
export const getLabOrders = await withAuth(_getLabOrders);

async function _getLabOrdersByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const orders = await LabOrder.find({ patientId, del_flag: false }).sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(orders || []));
    } catch (error) {
        console.error("Error fetching patient lab orders:", error);
        return [];
    }
}
export const getLabOrdersByPatient = await withAuth(_getLabOrdersByPatient);

/** Advance status: ordered → collected → resulted. */
async function _updateLabOrderStatus(user: User, id: string, status: "collected" | "resulted" | "cancelled", path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const order = await LabOrder.findById(id);
        if (!order) throw new Error("Lab order not found");

        order.status = status;
        if (status === "collected") { order.collectedBy = user._id as never; order.collectedAt = new Date(); }
        if (status === "resulted") { order.resultedBy = user._id as never; order.resultedAt = new Date(); }
        order.mod_flag = true;
        order.modifiedBy = user._id as never;
        await order.save();

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/lab");
        return JSON.parse(JSON.stringify(order));
    } catch (error) {
        console.error("Error updating lab order status:", error);
        throw error;
    }
}
export const updateLabOrderStatus = await withAuth(_updateLabOrderStatus, "labManagement");

/** Enter results for the tests and mark the order resulted. */
async function _enterLabResults(user: User, id: string, tests: TestInput[], resultNote: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const order = await LabOrder.findById(id);
        if (!order) throw new Error("Lab order not found");

        order.tests = (tests || []).map((t) => ({ name: t.name, result: t.result || "", unit: t.unit || "", referenceRange: t.referenceRange || "", flag: t.flag || "" })) as never;
        order.resultNote = resultNote || "";
        order.status = "resulted";
        order.resultedBy = user._id as never;
        order.resultedAt = new Date();
        order.mod_flag = true;
        order.modifiedBy = user._id as never;
        await order.save();

        await History.create({
            actionType: "LAB_ORDER_RESULTED",
            details: { itemId: order._id, deletedAt: new Date() },
            message: `${user.fullName} entered results for ${order.orderNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: order._id,
            entityType: "LAB_ORDER",
        });

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/lab");
        return JSON.parse(JSON.stringify(order));
    } catch (error) {
        console.error("Error entering lab results:", error);
        throw error;
    }
}
export const enterLabResults = await withAuth(_enterLabResults, "labManagement");
