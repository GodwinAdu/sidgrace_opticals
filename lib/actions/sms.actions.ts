"use server";

import { Types } from "mongoose";
import { withAuth, type User } from "../helpers/auth";
import { connectToDB } from "../mongoose";
import Message from "../models/message.models";
import { getSmsGatewayStatus, kickSmsQueue, type SmsGatewayStatus } from "../helpers/sms";

export interface SmsHistoryItem {
    _id: string;
    recipientName: string | null;
    recipientPhone: string | null;
    message: string;
    source: string | null;
    status: "pending" | "sent" | "failed" | "cancelled";
    retryCount: number;
    lastError: string | null;
    gatewayStatus: string | null;
    batch: string | null;
    sentAt: string | null;
    nextAttemptAt: string | null;
    createdAt: string;
}

export interface SmsHistoryQuery {
    status?: "all" | "pending" | "sent" | "failed" | "cancelled";
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface SmsOverview {
    gateway: SmsGatewayStatus;
    today: { sent: number; failed: number; pending: number };
    queued: number;
}

const STATUSES = ["pending", "sent", "failed", "cancelled"];

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function _fetchSmsHistory(user: User, query: SmsHistoryQuery = {}) {
    if (!user) throw new Error("User not authenticated");
    await connectToDB();

    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(5, Math.floor(query.pageSize ?? 20)));
    const filter: Record<string, unknown> = { type: "SMS" };
    if (query.status && query.status !== "all" && STATUSES.includes(query.status)) filter.status = query.status;
    const search = query.search?.trim().slice(0, 100);
    if (search) {
        const rx = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ recipientName: rx }, { recipientPhone: rx }, { normalizedPhone: rx }, { message: rx }];
    }

    const [items, total] = await Promise.all([
        Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Message.countDocuments(filter),
    ]);

    return {
        items: (items as Record<string, any>[]).map((m): SmsHistoryItem => ({
            _id: String(m._id),
            recipientName: m.recipientName ?? null,
            recipientPhone: m.recipientPhone ?? null,
            message: m.message ?? "",
            source: m.source ?? null,
            status: m.status,
            retryCount: m.retryCount ?? 0,
            lastError: m.lastError ?? null,
            gatewayStatus: m.gatewayStatus ?? null,
            batch: m.batch ?? null,
            sentAt: m.sentAt ? new Date(m.sentAt).toISOString() : null,
            nextAttemptAt: m.nextAttemptAt ? new Date(m.nextAttemptAt).toISOString() : null,
            createdAt: new Date(m.createdAt).toISOString(),
        })),
        total,
        page,
        pageSize,
    };
}
export const fetchSmsHistory = await withAuth(_fetchSmsHistory, "messaging");

async function _fetchSmsOverview(user: User): Promise<SmsOverview> {
    if (!user) throw new Error("User not authenticated");
    await connectToDB();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [gateway, sent, failed, pendingToday, queued] = await Promise.all([
        getSmsGatewayStatus(),
        Message.countDocuments({ type: "SMS", status: "sent", sentAt: { $gte: startOfDay } }),
        Message.countDocuments({ type: "SMS", status: { $in: ["failed", "cancelled"] }, updatedAt: { $gte: startOfDay } }),
        Message.countDocuments({ type: "SMS", status: "pending", createdAt: { $gte: startOfDay } }),
        Message.countDocuments({ type: "SMS", status: "pending" }),
    ]);
    return { gateway, today: { sent, failed, pending: pendingToday }, queued };
}
export const fetchSmsOverview = await withAuth(_fetchSmsOverview, "messaging");

/** Puts a failed or cancelled SMS back in the queue (e.g. after fixing the number or topping up). */
async function _retrySms(user: User, id: string) {
    if (!user) throw new Error("User not authenticated");
    if (!Types.ObjectId.isValid(id)) return { success: false, message: "Invalid message id" };
    await connectToDB();
    const now = new Date();
    // Raw collection update: Mongoose treats createdAt as immutable and would drop it.
    // createdAt is reset so the backend's 24-hour expiry starts again from now.
    const res = await Message.collection.updateOne(
        { _id: new Types.ObjectId(id), type: "SMS", status: { $in: ["failed", "cancelled"] } },
        {
            $set: { status: "pending", retryCount: 0, nextAttemptAt: now, createdAt: now, updatedAt: now },
            $unset: { lastError: "" },
        }
    );
    if (!res.modifiedCount) return { success: false, message: "Only failed or cancelled messages can be retried" };
    await kickSmsQueue();
    return { success: true, message: "Message queued again" };
}
export const retrySms = await withAuth(_retrySms, "messaging");
