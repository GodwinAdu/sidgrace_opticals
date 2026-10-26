"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { BloodUnit, Specimen } from "../models/blood-bank.models";
import LabOrder from "../models/lab-order.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import {
    BLOOD_GROUPS,
    canTransitionSpecimen,
    canTransitionUnit,
    isCompatible,
    isIssuable,
    type BloodComponent,
    type BloodGroup,
    type BloodUnitStatus,
    type SpecimenStatus,
} from "../clinical/blood-bank";

const BLOOD_BANK_PATH = "/dashboard/blood-bank";

async function generateUnitNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`blood-unit-${year}`);
    return `BU-${year}-${String(seq).padStart(5, "0")}`;
}

async function generateSpecimenNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`specimen-${year}`);
    return `SPEC-${year}-${String(seq).padStart(5, "0")}`;
}

/* ═══════════════════════════════ BLOOD UNITS ════════════════════════════════ */

interface RegisterBloodUnitInput {
    bloodGroup: string;
    component?: BloodComponent;
    volumeMl?: number | null;
    collectedAt?: string | Date | null;
    expiry: string | Date;
    source?: string;
}

/**
 * Register a new blood unit in the bank. The group must be a valid ABO/Rh group
 * and the expiry must be a usable date; a newly-registered unit starts
 * `available`. Gated by `bloodBankManagement`.
 */
async function _registerBloodUnit(user: User, values: RegisterBloodUnitInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        const group = (values?.bloodGroup || "").trim().toUpperCase();
        if (!(BLOOD_GROUPS as string[]).includes(group)) throw new Error("A valid blood group is required");
        const expiry = values?.expiry ? new Date(values.expiry) : null;
        if (!expiry || Number.isNaN(expiry.getTime())) throw new Error("A valid expiry date is required");
        await connectToDB();

        const collectedAt = values.collectedAt ? new Date(values.collectedAt) : null;
        const unitNumber = await generateUnitNumber();
        const unit = await BloodUnit.create({
            unitNumber,
            bloodGroup: group as BloodGroup,
            component: values.component || "whole-blood",
            volumeMl: values.volumeMl ?? null,
            collectedAt: collectedAt && !Number.isNaN(collectedAt.getTime()) ? collectedAt : null,
            expiry,
            status: "available",
            source: values.source?.trim() || "",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "BLOOD_UNIT_CREATED",
            details: { itemId: unit._id, bloodGroup: group, component: unit.component },
            message: `${user.fullName} registered blood unit ${unitNumber} (${group} ${unit.component}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: unit._id,
            entityType: "BLOOD_UNIT",
        });

        revalidatePath(BLOOD_BANK_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(unit));
    } catch (error) {
        console.error("Error registering blood unit:", error);
        throw error;
    }
}
export const registerBloodUnit = await withAuth(_registerBloodUnit, "bloodBankManagement");

async function _getBloodUnits(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const units = await BloodUnit.find(query)
            .populate("patientId", "fullName patientId bloodGroup")
            .sort({ expiry: 1, createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(units || []));
    } catch (error) {
        console.error("Error fetching blood units:", error);
        return [];
    }
}
export const getBloodUnits = await withAuth(_getBloodUnits);

interface IssueBloodUnitInput {
    patientId: string;
    // The recipient's blood group, used for the compatibility crossmatch.
    recipientGroup?: string;
    // "reserved" holds the unit; "issued" releases it to the patient.
    target?: "reserved" | "issued";
}

/**
 * Crossmatch and reserve/issue a blood unit to a patient. The unit must be
 * issuable (available and not expired) and — when the recipient's group is
 * supplied — ABO/Rh compatible with it. A compatibility failure blocks the
 * issue (patient-safety); the resulting status transition is validated against
 * the allowed unit transitions. Gated by `bloodBankManagement`.
 */
async function _issueBloodUnit(user: User, unitId: string, values: IssueBloodUnitInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!unitId) throw new Error("A blood unit is required");
        if (!values?.patientId) throw new Error("A recipient patient is required");
        await connectToDB();

        const unit = await BloodUnit.findById(unitId);
        if (!unit) throw new Error("Blood unit not found");

        const target: BloodUnitStatus = values.target === "issued" ? "issued" : "reserved";

        if (!isIssuable(unit.status as BloodUnitStatus, unit.expiry)) {
            throw new Error("This unit is not available (reserved, issued, discarded, or expired)");
        }
        if (!canTransitionUnit(unit.status as BloodUnitStatus, target)) {
            throw new Error(`Cannot ${target} a unit that is ${unit.status}`);
        }

        // Red-cell compatibility crossmatch (only when a recipient group is known).
        const recipientGroup = (values.recipientGroup || "").trim();
        let crossmatchResult: "compatible" | "incompatible" | "" = "";
        if (recipientGroup) {
            const ok = isCompatible(unit.bloodGroup, recipientGroup);
            crossmatchResult = ok ? "compatible" : "incompatible";
            if (!ok) {
                throw new Error(
                    `Incompatible: ${unit.bloodGroup} unit cannot be given to a ${recipientGroup} recipient`,
                );
            }
        }

        unit.status = target;
        unit.patientId = values.patientId as never;
        unit.crossmatchedBy = user._id as never;
        unit.crossmatchResult = crossmatchResult;
        if (target === "issued") {
            unit.issuedAt = new Date();
            unit.issuedBy = user._id as never;
        }
        unit.mod_flag = true;
        unit.modifiedBy = user._id as never;
        unit.action_type = "updated";
        await unit.save();

        await History.create({
            actionType: target === "issued" ? "BLOOD_UNIT_ISSUED" : "BLOOD_UNIT_RESERVED",
            details: { itemId: unit._id, patientId: values.patientId, crossmatchResult },
            message: `${user.fullName} ${target} blood unit ${unit.unitNumber} to a patient on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: unit._id,
            entityType: "BLOOD_UNIT",
        });

        revalidatePath(BLOOD_BANK_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(unit));
    } catch (error) {
        console.error("Error issuing blood unit:", error);
        throw error;
    }
}
export const issueBloodUnit = await withAuth(_issueBloodUnit, "bloodBankManagement");

/** Discard a unit (expired, damaged, or returned). Terminal transition. */
async function _discardBloodUnit(user: User, unitId: string, reason: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!unitId) throw new Error("A blood unit is required");
        await connectToDB();

        const unit = await BloodUnit.findById(unitId);
        if (!unit) throw new Error("Blood unit not found");
        if (!canTransitionUnit(unit.status as BloodUnitStatus, "discarded")) {
            throw new Error(`Cannot discard a unit that is already ${unit.status}`);
        }

        unit.status = "discarded";
        unit.discardReason = reason?.trim() || "";
        unit.mod_flag = true;
        unit.modifiedBy = user._id as never;
        unit.action_type = "updated";
        await unit.save();

        await History.create({
            actionType: "BLOOD_UNIT_DISCARDED",
            details: { itemId: unit._id, reason: unit.discardReason },
            message: `${user.fullName} discarded blood unit ${unit.unitNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: unit._id,
            entityType: "BLOOD_UNIT",
        });

        revalidatePath(BLOOD_BANK_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(unit));
    } catch (error) {
        console.error("Error discarding blood unit:", error);
        throw error;
    }
}
export const discardBloodUnit = await withAuth(_discardBloodUnit, "bloodBankManagement");

async function _deleteBloodUnit(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const unit = await BloodUnit.findById(id);
        if (!unit || !unit._id) throw new Error("Blood unit not found");

        await deleteDocument({
            actionType: "BLOOD_UNIT_DELETED",
            documentId: unit._id.toString(),
            collectionName: "BloodUnit",
            userId: `${user._id}`,
            trashMessage: `Blood unit ${unit.unitNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted blood unit ${unit.unitNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(BLOOD_BANK_PATH);
        return { success: true, message: "Blood unit deleted successfully" };
    } catch (error) {
        console.error("Error deleting blood unit:", error);
        throw error;
    }
}
export const deleteBloodUnit = await withAuth(_deleteBloodUnit, "bloodBankManagement");

/* ═══════════════════════════════ SPECIMENS ══════════════════════════════════ */

interface CreateSpecimenInput {
    labOrderId: string;
    specimenType?: string;
    container?: string;
    collectedAt?: string | Date | null;
    note?: string;
}

/**
 * Register a specimen against an existing lab order and start its lifecycle at
 * `collected`. The patient id is denormalised from the lab order so specimens
 * can be queried per-patient. Specimen operations reuse the existing
 * `labManagement` flag.
 */
async function _createSpecimen(user: User, values: CreateSpecimenInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.labOrderId) throw new Error("A lab order is required");
        await connectToDB();

        const order = await LabOrder.findById(values.labOrderId).select("patientId orderNumber");
        if (!order) throw new Error("Lab order not found");

        const collectedAt = values.collectedAt ? new Date(values.collectedAt) : new Date();
        const collectedValid = !Number.isNaN(collectedAt.getTime()) ? collectedAt : new Date();

        const specimenNumber = await generateSpecimenNumber();
        const specimen = await Specimen.create({
            specimenNumber,
            labOrderId: order._id,
            patientId: order.patientId,
            specimenType: values.specimenType?.trim() || "",
            container: values.container?.trim() || "",
            status: "collected",
            collectedAt: collectedValid,
            events: [{ status: "collected", at: collectedValid, by: user._id, note: values.note?.trim() || "" }],
            note: values.note?.trim() || "",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "SPECIMEN_CREATED",
            details: { itemId: specimen._id, labOrderId: order._id },
            message: `${user.fullName} collected specimen ${specimenNumber} for order ${order.orderNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: specimen._id,
            entityType: "SPECIMEN",
        });

        revalidatePath(BLOOD_BANK_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(specimen));
    } catch (error) {
        console.error("Error creating specimen:", error);
        throw error;
    }
}
export const createSpecimen = await withAuth(_createSpecimen, "labManagement");

async function _getSpecimens(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const specimens = await Specimen.find(query)
            .populate("patientId", "fullName patientId")
            .populate("labOrderId", "orderNumber category")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(specimens || []));
    } catch (error) {
        console.error("Error fetching specimens:", error);
        return [];
    }
}
export const getSpecimens = await withAuth(_getSpecimens);

/**
 * Advance a specimen's lifecycle (collected → in-transit → received →
 * processed, with rejected reachable before processing). The transition is
 * validated against the allowed lifecycle; each change appends an immutable
 * event to the trail and mirrors onto the current `status`. Reuses
 * `labManagement`.
 */
async function _updateSpecimenStatus(user: User, id: string, status: SpecimenStatus, note: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A specimen is required");
        await connectToDB();

        const specimen = await Specimen.findById(id);
        if (!specimen) throw new Error("Specimen not found");

        if (!canTransitionSpecimen(specimen.status as SpecimenStatus, status)) {
            throw new Error(`Cannot move a specimen from ${specimen.status} to ${status}`);
        }

        const now = new Date();
        specimen.status = status;
        specimen.events.push({ status, at: now, by: user._id as never, note: note?.trim() || "" } as never);
        specimen.mod_flag = true;
        specimen.modifiedBy = user._id as never;
        specimen.action_type = "updated";
        await specimen.save();

        await History.create({
            actionType: "SPECIMEN_STATUS_CHANGED",
            details: { itemId: specimen._id, status },
            message: `${user.fullName} marked specimen ${specimen.specimenNumber} as ${status} on ${now.toLocaleString()}.`,
            performedBy: user._id,
            entityId: specimen._id,
            entityType: "SPECIMEN",
        });

        revalidatePath(BLOOD_BANK_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(specimen));
    } catch (error) {
        console.error("Error updating specimen status:", error);
        throw error;
    }
}
export const updateSpecimenStatus = await withAuth(_updateSpecimenStatus, "labManagement");

async function _deleteSpecimen(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const specimen = await Specimen.findById(id);
        if (!specimen || !specimen._id) throw new Error("Specimen not found");

        await deleteDocument({
            actionType: "SPECIMEN_DELETED",
            documentId: specimen._id.toString(),
            collectionName: "Specimen",
            userId: `${user._id}`,
            trashMessage: `Specimen ${specimen.specimenNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted specimen ${specimen.specimenNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(BLOOD_BANK_PATH);
        return { success: true, message: "Specimen deleted successfully" };
    } catch (error) {
        console.error("Error deleting specimen:", error);
        throw error;
    }
}
export const deleteSpecimen = await withAuth(_deleteSpecimen, "labManagement");

/** Lab orders available to attach a specimen to (recent, not deleted). */
async function _getLabOrdersForSpecimen(user: User, limit = 100) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const orders = await LabOrder.find({ del_flag: false })
            .populate("patientId", "fullName patientId")
            .select("orderNumber category patientId status")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(orders || []));
    } catch (error) {
        console.error("Error fetching lab orders for specimen:", error);
        return [];
    }
}
export const getLabOrdersForSpecimen = await withAuth(_getLabOrdersForSpecimen);
