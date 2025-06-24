"use server"

import Appointment from "../models/appointment.models";
import { Patient } from "../models/patient.models";
import { connectToDB } from "../mongoose";

export async function patientAnalytics() {
    try {
        await connectToDB()
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Query patients
        const [totalPatients, newPatientsThisMonth, newPatientsLastMonth, totalAppointment, appointmentToday] = await Promise.all([
            Patient.countDocuments({}),
            Patient.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Patient.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            Appointment.countDocuments({ status: "waiting" }),
            Appointment.countDocuments({ createdAt: now })
        ]);

        // TODO: Replace with actual revenue calculation logic
        const totalRevenue = 0;
        const revenueToday = 0;

        const newPatientsChangeValue = newPatientsThisMonth - newPatientsLastMonth;
        const newPatientsChangePercent = newPatientsLastMonth === 0
            ? 100
            : ((newPatientsChangeValue / newPatientsLastMonth) * 100).toFixed(1);

        return [
            {
                title: "Total Patients",
                value: totalPatients.toLocaleString(),
                change: `+${newPatientsThisMonth} this month`,
            },
            {
                title: "New Patients",
                value: newPatientsThisMonth.toString(),
                change: `${newPatientsChangeValue >= 0 ? '+' : ''}${newPatientsChangePercent}% from last month`,
            },
            {
                title: "Appointments",
                value: totalAppointment.toLocaleString(),
                change: `+${appointmentToday} today`,
            },
            {
                title: "Monthly Revenue",
                value: totalRevenue.toLocaleString(),
                change: `+${revenueToday} today`,
            },
        ];
    } catch (error) {
        console.log("error happening while fetching patient analytics", error);
        throw error
    }
}