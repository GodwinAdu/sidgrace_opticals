"use server"

import { connectToDB } from "../mongoose";
import Invoice from "../models/invoice.models";
import Payment from "../models/payment.models";
import Appointment from "../models/appointment.models";
import { Patient } from "../models/patient.models";
import TreatmentPlan from "../models/treatment-plan.models";
import { User, withAuth } from "../helpers/auth";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function _getReportData(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const [
            invoiceAgg,
            paymentAgg,
            apptStatusAgg,
            planStatusAgg,
            totalPatients,
            newPatientsThisYear,
        ] = await Promise.all([
            // billed per month (this year)
            Invoice.aggregate([
                { $match: { createdAt: { $gte: yearStart }, del_flag: { $ne: true } } },
                { $group: { _id: { $month: "$createdAt" }, billed: { $sum: "$total" } } },
            ]),
            // collected per month (this year)
            Payment.aggregate([
                { $match: { createdAt: { $gte: yearStart }, del_flag: { $ne: true } } },
                { $group: { _id: { $month: "$createdAt" }, collected: { $sum: "$amount" } } },
            ]),
            // appointment status breakdown
            Appointment.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            // treatment plan status breakdown
            TreatmentPlan.aggregate([
                { $match: { del_flag: { $ne: true } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            Patient.countDocuments({}),
            Patient.countDocuments({ createdAt: { $gte: yearStart } }),
        ]);

        // Merge billed + collected into a 12-month series
        const revenueByMonth = MONTHS.map((m, i) => {
            const billed = invoiceAgg.find((x) => x._id === i + 1)?.billed || 0;
            const collected = paymentAgg.find((x) => x._id === i + 1)?.collected || 0;
            return { month: m, billed: Math.round(billed), collected: Math.round(collected) };
        });

        const appointmentStatus = apptStatusAgg.map((x) => ({ name: x._id || "unknown", value: x.count }));
        const planStatus = planStatusAgg.map((x) => ({ name: x._id || "unknown", value: x.count }));

        const totalBilled = invoiceAgg.reduce((s, x) => s + (x.billed || 0), 0);
        const totalCollected = paymentAgg.reduce((s, x) => s + (x.collected || 0), 0);
        const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0;

        const totalAppts = apptStatusAgg.reduce((s, x) => s + x.count, 0);
        const noShows = apptStatusAgg.find((x) => x._id === "no-show")?.count || 0;
        const noShowRate = totalAppts > 0 ? Math.round((noShows / totalAppts) * 1000) / 10 : 0;

        return JSON.parse(JSON.stringify({
            revenueByMonth,
            appointmentStatus,
            planStatus,
            kpis: {
                totalBilled: Math.round(totalBilled),
                totalCollected: Math.round(totalCollected),
                collectionRate,
                totalPatients,
                newPatientsThisYear,
                noShowRate,
            },
        }));
    } catch (error) {
        console.error("Error computing report data:", error);
        return {
            revenueByMonth: [],
            appointmentStatus: [],
            planStatus: [],
            kpis: { totalBilled: 0, totalCollected: 0, collectionRate: 0, totalPatients: 0, newPatientsThisYear: 0, noShowRate: 0 },
        };
    }
}
export const getReportData = await withAuth(_getReportData);
