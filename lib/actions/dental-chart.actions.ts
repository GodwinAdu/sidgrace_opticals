"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import DentalChart from "../models/dental-chart.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";

interface ToothConditionInput {
    tooth: number;
    surface?: string;
    condition: string;
    note?: string;
}

interface SaveChartValues {
    numberingSystem?: "FDI" | "Universal";
    conditions: ToothConditionInput[];
    generalNotes?: string;
}

/**
 * Returns the patient's dental chart, creating an empty one if none exists.
 */
async function _getChartByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        let chart = await DentalChart.findOne({ patientId, del_flag: false });

        if (!chart) {
            chart = await DentalChart.create({
                patientId,
                conditions: [],
                createdBy: user._id,
                action_type: "created",
            });
            await History.create({
                actionType: "DENTAL_CHART_CREATED",
                details: { itemId: chart._id, deletedAt: new Date() },
                message: `${user.fullName} initialized a dental chart for patient ${patientId} on ${new Date().toLocaleString()}.`,
                performedBy: user._id,
                entityId: chart._id,
                entityType: "DENTAL_CHART",
            });
        }

        return JSON.parse(JSON.stringify(chart));
    } catch (error) {
        console.log("unable to get dental chart", error);
        throw error;
    }
}
export const getChartByPatient = await withAuth(_getChartByPatient);

/**
 * Upserts the full set of tooth conditions for a patient's chart.
 */
async function _saveChart(user: User, patientId: string, values: SaveChartValues, path: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const conditions = (values.conditions || []).map((c) => ({
            tooth: c.tooth,
            surface: c.surface || "whole",
            condition: c.condition,
            note: c.note || "",
            recordedAt: new Date(),
        }));

        const chart = await DentalChart.findOneAndUpdate(
            { patientId },
            {
                $set: {
                    conditions,
                    numberingSystem: values.numberingSystem || "Universal",
                    generalNotes: values.generalNotes || "",
                    mod_flag: true,
                    modifiedBy: user._id,
                    action_type: "updated",
                },
                $setOnInsert: { patientId, createdBy: user._id },
            },
            { new: true, upsert: true, runValidators: true }
        );

        await History.create({
            actionType: "DENTAL_CHART_UPDATED",
            details: { itemId: chart._id, deletedAt: new Date() },
            message: `${user.fullName} updated the dental chart for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: chart._id,
            entityType: "DENTAL_CHART",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(chart));
    } catch (error) {
        console.log("unable to save dental chart", error);
        throw error;
    }
}
export const saveChart = await withAuth(_saveChart);
