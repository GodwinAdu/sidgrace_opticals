"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { withAuth, type User } from "../helpers/auth";
import ClinicSettings from "../models/clinic-settings.models";

async function getOrCreateSettings() {
    let settings = await ClinicSettings.findOne({ key: "clinic" });
    if (!settings) {
        settings = await ClinicSettings.create({ key: "clinic" });
    }
    return settings;
}

async function _getClinicSettings(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const settings = await getOrCreateSettings();
        return JSON.parse(JSON.stringify(settings));
    } catch (error) {
        console.error("Error fetching clinic settings:", error);
        return { defaultConsultationFee: 0, currency: "" };
    }
}
export const getClinicSettings = await withAuth(_getClinicSettings);

async function _setDefaultConsultationFee(user: User, amount: number, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const settings = await getOrCreateSettings();
        settings.defaultConsultationFee = Number(amount) || 0;
        settings.modifiedBy = user._id;
        await settings.save();
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(settings));
    } catch (error) {
        console.error("Error setting default consultation fee:", error);
        throw error;
    }
}
export const setDefaultConsultationFee = await withAuth(_setDefaultConsultationFee);

interface ClinicSettingsInput {
    defaultConsultationFee?: number;
    currency?: string;
    clinicName?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    clinicLogoUrl?: string;
    eposEnabled?: boolean;
    eposPrinterUrl?: string;
    eposDeviceId?: string;
    eposOpenDrawer?: boolean;
}

async function _updateClinicSettings(user: User, values: ClinicSettingsInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const settings = await getOrCreateSettings();
        if (values.defaultConsultationFee !== undefined) {
            settings.defaultConsultationFee = Number(values.defaultConsultationFee) || 0;
        }
        if (values.currency !== undefined) settings.currency = values.currency;
        if (values.clinicName !== undefined) settings.clinicName = values.clinicName;
        if (values.clinicAddress !== undefined) settings.clinicAddress = values.clinicAddress;
        if (values.clinicPhone !== undefined) settings.clinicPhone = values.clinicPhone;
        if (values.clinicEmail !== undefined) settings.clinicEmail = values.clinicEmail;
        if (values.clinicLogoUrl !== undefined) settings.clinicLogoUrl = values.clinicLogoUrl;
        if (values.eposEnabled !== undefined) settings.eposEnabled = !!values.eposEnabled;
        if (values.eposPrinterUrl !== undefined) settings.eposPrinterUrl = String(values.eposPrinterUrl).trim();
        if (values.eposDeviceId !== undefined) settings.eposDeviceId = String(values.eposDeviceId).trim() || "local_printer";
        if (values.eposOpenDrawer !== undefined) settings.eposOpenDrawer = !!values.eposOpenDrawer;
        settings.modifiedBy = user._id;
        await settings.save();
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(settings));
    } catch (error) {
        console.error("Error updating clinic settings:", error);
        throw error;
    }
}
export const updateClinicSettings = await withAuth(_updateClinicSettings, "accountManagement");
