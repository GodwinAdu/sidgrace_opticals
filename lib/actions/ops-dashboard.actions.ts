"use server"

import { connectToDB } from "../mongoose";
import { withAuth, type User } from "../helpers/auth";
import Bed from "../models/bed.models";
import Ward from "../models/ward.models";
import Payment from "../models/payment.models";
import Attendance from "../models/attendance.models";

/** Bed occupancy overall and per ward. */
async function _getBedOccupancy(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const [wards, beds] = await Promise.all([
            Ward.find({ del_flag: false }).select("name").lean(),
            Bed.find({ del_flag: false }).select("wardId status").lean(),
        ]);

        const perWard = new Map<string, { ward: string; total: number; occupied: number }>();
        for (const w of wards) perWard.set(String(w._id), { ward: (w as { name?: string }).name || "Ward", total: 0, occupied: 0 });
        for (const b of beds) {
            const key = String(b.wardId);
            const row = perWard.get(key) || { ward: "Unknown", total: 0, occupied: 0 };
            row.total += 1;
            if (b.status === "occupied") row.occupied += 1;
            perWard.set(key, row);
        }

        const wardsOut = Array.from(perWard.values());
        const total = beds.length;
        const occupied = beds.filter((b) => b.status === "occupied").length;
        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

        return JSON.parse(JSON.stringify({ total, occupied, vacant: total - occupied, occupancyRate, wards: wardsOut }));
    } catch (error) {
        console.error("Error computing bed occupancy:", error);
        return { total: 0, occupied: 0, vacant: 0, occupancyRate: 0, wards: [] };
    }
}
export const getBedOccupancy = await withAuth(_getBedOccupancy);

/**
 * Revenue by payment method over the last `days` (default 30), from recorded
 * payments. Cash-basis — reflects money actually collected.
 */
async function _getRevenueByMethod(user: User, days = 30) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const since = new Date();
        since.setDate(since.getDate() - (Number(days) || 30));

        const rows = await Payment.aggregate([
            { $match: { del_flag: false, createdAt: { $gte: since } } },
            { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);

        const byMethod = rows.map((r) => ({ method: r._id || "other", total: r.total || 0, count: r.count || 0 }));
        const total = byMethod.reduce((s, r) => s + r.total, 0);
        return JSON.parse(JSON.stringify({ days: Number(days) || 30, total, byMethod }));
    } catch (error) {
        console.error("Error computing revenue by method:", error);
        return { days, total: 0, byMethod: [] };
    }
}
export const getRevenueByMethod = await withAuth(_getRevenueByMethod);

/**
 * Drug / product consumption over the last `days` from visit-dispensed products.
 * Aggregates quantity and value per product name.
 */
async function _getDrugConsumption(user: User, days = 30) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const since = new Date();
        since.setDate(since.getDate() - (Number(days) || 30));

        const rows = await Attendance.aggregate([
            { $match: { date: { $gte: since } } },
            { $unwind: "$billing.dispensedProducts" },
            {
                $group: {
                    _id: "$billing.dispensedProducts.name",
                    quantity: { $sum: "$billing.dispensedProducts.quantity" },
                    value: { $sum: "$billing.dispensedProducts.total" },
                },
            },
            { $sort: { quantity: -1 } },
            { $limit: 20 },
        ]);

        const items = rows.map((r) => ({ name: r._id || "Unknown", quantity: r.quantity || 0, value: r.value || 0 }));
        return JSON.parse(JSON.stringify({ days: Number(days) || 30, items }));
    } catch (error) {
        console.error("Error computing drug consumption:", error);
        return { days, items: [] };
    }
}
export const getDrugConsumption = await withAuth(_getDrugConsumption);
