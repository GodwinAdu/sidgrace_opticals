"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Asset from "../models/asset.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import {
    canTransitionAsset,
    isValidAssetStatus,
    type AssetStatus,
} from "../clinical/assets";

const ASSETS_PATH = "/dashboard/assets";

async function generateAssetTag(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`asset-${year}`);
    return `AST-${year}-${String(seq).padStart(5, "0")}`;
}

/* ══════════════════════════════════ ASSETS ══════════════════════════════════ */

interface CreateAssetInput {
    name: string;
    category?: string;
    serialNumber?: string;
    location?: string;
    status?: AssetStatus;
    scheduleIntervalDays?: number;
    lastServicedAt?: Date | string | null;
    note?: string;
}

/**
 * Register a biomedical asset (Requirement 11, criterion 1). Requires a name;
 * everything else is optional. A unique human-readable tag is minted from the
 * shared counter. An optional maintenance schedule (interval in days) seeds the
 * due/overdue computation that the register surfaces. Gated by `assetManagement`.
 */
async function _createAsset(user: User, values: CreateAssetInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.name || !values.name.trim()) throw new Error("An asset name is required");
        await connectToDB();

        const status: AssetStatus = isValidAssetStatus(values.status) ? values.status : "active";
        const interval = Math.max(0, Math.floor(Number(values.scheduleIntervalDays) || 0));

        const assetTag = await generateAssetTag();
        const asset = await Asset.create({
            assetTag,
            name: values.name.trim(),
            category: values.category?.trim() || "",
            serialNumber: values.serialNumber?.trim() || "",
            location: values.location?.trim() || "",
            status,
            scheduleIntervalDays: interval,
            lastServicedAt: values.lastServicedAt ? new Date(values.lastServicedAt) : null,
            note: values.note?.trim() || "",
            maintenanceRecords: [],
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "ASSET_CREATED",
            details: { itemId: asset._id, assetTag, location: asset.location },
            message: `${user.fullName} registered asset ${asset.name} (${assetTag}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: asset._id,
            entityType: "ASSET",
        });

        revalidatePath(ASSETS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(asset));
    } catch (error) {
        console.error("Error creating asset:", error);
        throw error;
    }
}
export const createAsset = await withAuth(_createAsset, "assetManagement");

async function _getAssets(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const assets = await Asset.find(query)
            .populate("maintenanceRecords.servicedBy", "fullName")
            .sort({ createdAt: -1 })
            .limit(300)
            .lean();
        return JSON.parse(JSON.stringify(assets || []));
    } catch (error) {
        console.error("Error fetching assets:", error);
        return [];
    }
}
export const getAssets = await withAuth(_getAssets);

interface UpdateAssetInput {
    name?: string;
    category?: string;
    serialNumber?: string;
    location?: string;
    scheduleIntervalDays?: number;
    note?: string;
}

/**
 * Edit an asset's register details (name, location, schedule interval, etc.).
 * The maintenance schedule interval drives the computed due/overdue status, so
 * changing it is a first-class edit. Status moves go through
 * `updateAssetStatus`; service is logged via `logMaintenance`. Gated by
 * `assetManagement`.
 */
async function _updateAsset(user: User, id: string, values: UpdateAssetInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An asset is required");
        await connectToDB();

        const asset = await Asset.findById(id);
        if (!asset) throw new Error("Asset not found");

        if (values.name !== undefined) {
            if (!values.name.trim()) throw new Error("An asset name cannot be empty");
            asset.name = values.name.trim();
        }
        if (values.category !== undefined) asset.category = values.category.trim();
        if (values.serialNumber !== undefined) asset.serialNumber = values.serialNumber.trim();
        if (values.location !== undefined) asset.location = values.location.trim();
        if (values.note !== undefined) asset.note = values.note.trim();
        if (values.scheduleIntervalDays !== undefined) {
            asset.scheduleIntervalDays = Math.max(0, Math.floor(Number(values.scheduleIntervalDays) || 0));
        }
        asset.mod_flag = true;
        asset.modifiedBy = user._id as never;
        asset.action_type = "updated";
        await asset.save();

        await History.create({
            actionType: "ASSET_UPDATED",
            details: { itemId: asset._id, assetTag: asset.assetTag },
            message: `${user.fullName} updated asset ${asset.name} (${asset.assetTag}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: asset._id,
            entityType: "ASSET",
        });

        revalidatePath(ASSETS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(asset));
    } catch (error) {
        console.error("Error updating asset:", error);
        throw error;
    }
}
export const updateAsset = await withAuth(_updateAsset, "assetManagement");

/**
 * Move an asset between operational states (active → maintenance → active /
 * retired). The move is validated against the allowed transitions in the pure
 * helper so an invalid status can never be persisted. Gated by `assetManagement`.
 */
async function _updateAssetStatus(user: User, id: string, status: AssetStatus, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An asset is required");
        if (!isValidAssetStatus(status)) throw new Error("Invalid asset status");
        await connectToDB();

        const asset = await Asset.findById(id);
        if (!asset) throw new Error("Asset not found");

        if (!canTransitionAsset(asset.status as AssetStatus, status)) {
            throw new Error(`Cannot move an asset from ${asset.status} to ${status}`);
        }

        asset.status = status;
        asset.mod_flag = true;
        asset.modifiedBy = user._id as never;
        asset.action_type = "updated";
        await asset.save();

        await History.create({
            actionType: "ASSET_STATUS_CHANGED",
            details: { itemId: asset._id, assetTag: asset.assetTag, status },
            message: `${user.fullName} marked asset ${asset.name} (${asset.assetTag}) as ${status} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: asset._id,
            entityType: "ASSET",
        });

        revalidatePath(ASSETS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(asset));
    } catch (error) {
        console.error("Error updating asset status:", error);
        throw error;
    }
}
export const updateAssetStatus = await withAuth(_updateAssetStatus, "assetManagement");

interface LogMaintenanceInput {
    type?: "preventive" | "corrective" | "calibration" | "inspection";
    description?: string;
    servicedAt?: Date | string | null;
    cost?: number;
    note?: string;
    // When true, the asset is returned to `active` after servicing.
    returnToActive?: boolean;
}

/**
 * Record a service against an asset (Requirement 11, criterion 2). The record
 * is appended to the asset's maintenance log (append-only history) and
 * `lastServicedAt` is advanced, which resets the computed next-due date so the
 * asset drops off the due/overdue list. Optionally returns an asset that was
 * under maintenance back to active. Gated by `assetManagement`.
 */
async function _logMaintenance(user: User, id: string, values: LogMaintenanceInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An asset is required");
        await connectToDB();

        const asset = await Asset.findById(id);
        if (!asset) throw new Error("Asset not found");

        const servicedAt = values.servicedAt ? new Date(values.servicedAt) : new Date();
        if (Number.isNaN(servicedAt.getTime())) throw new Error("Invalid service date");

        asset.maintenanceRecords.push({
            type: values.type || "preventive",
            description: values.description?.trim() || "",
            servicedAt,
            servicedBy: user._id as never,
            cost: Math.max(0, Number(values.cost) || 0),
            note: values.note?.trim() || "",
        } as never);
        asset.lastServicedAt = servicedAt;

        // Optionally bring a serviced asset back into use.
        if (values.returnToActive && asset.status === "maintenance") {
            asset.status = "active";
        }

        asset.mod_flag = true;
        asset.modifiedBy = user._id as never;
        asset.action_type = "updated";
        await asset.save();

        await History.create({
            actionType: "ASSET_MAINTENANCE_LOGGED",
            details: { itemId: asset._id, assetTag: asset.assetTag, type: values.type || "preventive" },
            message: `${user.fullName} logged maintenance for asset ${asset.name} (${asset.assetTag}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: asset._id,
            entityType: "ASSET",
        });

        revalidatePath(ASSETS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(asset));
    } catch (error) {
        console.error("Error logging maintenance:", error);
        throw error;
    }
}
export const logMaintenance = await withAuth(_logMaintenance, "assetManagement");

async function _deleteAsset(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const asset = await Asset.findById(id);
        if (!asset || !asset._id) throw new Error("Asset not found");

        await deleteDocument({
            actionType: "ASSET_DELETED",
            documentId: asset._id.toString(),
            collectionName: "Asset",
            userId: `${user._id}`,
            trashMessage: `Asset ${asset.name} (${asset.assetTag}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted asset ${asset.name} (${asset.assetTag}) on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(ASSETS_PATH);
        return { success: true, message: "Asset deleted successfully" };
    } catch (error) {
        console.error("Error deleting asset:", error);
        throw error;
    }
}
export const deleteAsset = await withAuth(_deleteAsset, "assetManagement");
