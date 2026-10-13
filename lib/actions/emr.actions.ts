"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Problem from "../models/problem.models";
import Allergy from "../models/allergy.models";
import Immunization from "../models/immunization.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { deleteDocument } from "./trash.actions";

/* ═══════════════════════════════════════════════════════════════
 *  PROBLEM LIST
 * ═══════════════════════════════════════════════════════════════ */

interface ProblemInput {
    condition: string;
    icd10Code?: string;
    status?: "active" | "resolved";
    onsetDate?: string | Date | null;
    resolvedDate?: string | Date | null;
    note?: string;
}

async function _createProblem(user: User, patientId: string, values: ProblemInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.condition?.trim()) throw new Error("A condition is required");
        await connectToDB();

        const problem = await Problem.create({
            patientId,
            condition: values.condition.trim(),
            icd10Code: values.icd10Code || "",
            status: values.status || "active",
            onsetDate: values.onsetDate ? new Date(values.onsetDate) : null,
            resolvedDate: values.resolvedDate ? new Date(values.resolvedDate) : null,
            note: values.note || "",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "PROBLEM_CREATED",
            details: { itemId: problem._id },
            message: `${user.fullName} added problem "${problem.condition}" for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: problem._id,
            entityType: "PROBLEM",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(problem));
    } catch (error) {
        console.log("unable to create problem", error);
        throw error;
    }
}
export const createProblem = await withAuth(_createProblem, "clinicalManagement");

async function _updateProblem(user: User, id: string, values: ProblemInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = {
            mod_flag: true,
            modifiedBy: user._id,
            action_type: "updated",
        };
        if (values.condition !== undefined) update.condition = values.condition.trim();
        if (values.icd10Code !== undefined) update.icd10Code = values.icd10Code;
        if (values.status !== undefined) update.status = values.status;
        if (values.note !== undefined) update.note = values.note;
        if (values.onsetDate !== undefined) update.onsetDate = values.onsetDate ? new Date(values.onsetDate) : null;
        if (values.resolvedDate !== undefined) update.resolvedDate = values.resolvedDate ? new Date(values.resolvedDate) : null;

        const problem = await Problem.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        if (!problem) throw new Error("Problem not found");

        await History.create({
            actionType: "PROBLEM_UPDATED",
            details: { itemId: problem._id },
            message: `${user.fullName} updated problem "${problem.condition}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: problem._id,
            entityType: "PROBLEM",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(problem));
    } catch (error) {
        console.log("unable to update problem", error);
        throw error;
    }
}
export const updateProblem = await withAuth(_updateProblem, "clinicalManagement");

async function _deleteProblem(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const problem = await Problem.findById(id);
        if (!problem || !problem._id) throw new Error("Problem not found");

        await deleteDocument({
            actionType: "PROBLEM_DELETED",
            documentId: problem._id.toString(),
            collectionName: "Problem",
            userId: `${user._id}`,
            trashMessage: `A problem (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a problem on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Problem deleted successfully" };
    } catch (error) {
        console.log("error while deleting problem", error);
        throw error;
    }
}
export const deleteProblem = await withAuth(_deleteProblem, "clinicalManagement");

async function _getProblemsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const problems = await Problem.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(problems || []));
    } catch (error) {
        console.error("Error fetching problems:", error);
        throw error;
    }
}
export const getProblemsByPatient = await withAuth(_getProblemsByPatient);

/* ═══════════════════════════════════════════════════════════════
 *  ALLERGY LIST
 * ═══════════════════════════════════════════════════════════════ */

interface AllergyInput {
    substance: string;
    reaction?: string;
    severity?: "mild" | "moderate" | "severe" | "unknown";
    status?: "active" | "inactive";
    note?: string;
}

async function _createAllergy(user: User, patientId: string, values: AllergyInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.substance?.trim()) throw new Error("A substance is required");
        await connectToDB();

        const allergy = await Allergy.create({
            patientId,
            substance: values.substance.trim(),
            reaction: values.reaction || "",
            severity: values.severity || "unknown",
            status: values.status || "active",
            note: values.note || "",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "ALLERGY_CREATED",
            details: { itemId: allergy._id },
            message: `${user.fullName} added allergy "${allergy.substance}" (${allergy.severity}) for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: allergy._id,
            entityType: "ALLERGY",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(allergy));
    } catch (error) {
        console.log("unable to create allergy", error);
        throw error;
    }
}
export const createAllergy = await withAuth(_createAllergy, "clinicalManagement");

async function _updateAllergy(user: User, id: string, values: AllergyInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = {
            mod_flag: true,
            modifiedBy: user._id,
            action_type: "updated",
        };
        if (values.substance !== undefined) update.substance = values.substance.trim();
        if (values.reaction !== undefined) update.reaction = values.reaction;
        if (values.severity !== undefined) update.severity = values.severity;
        if (values.status !== undefined) update.status = values.status;
        if (values.note !== undefined) update.note = values.note;

        const allergy = await Allergy.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        if (!allergy) throw new Error("Allergy not found");

        await History.create({
            actionType: "ALLERGY_UPDATED",
            details: { itemId: allergy._id },
            message: `${user.fullName} updated allergy "${allergy.substance}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: allergy._id,
            entityType: "ALLERGY",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(allergy));
    } catch (error) {
        console.log("unable to update allergy", error);
        throw error;
    }
}
export const updateAllergy = await withAuth(_updateAllergy, "clinicalManagement");

async function _deleteAllergy(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const allergy = await Allergy.findById(id);
        if (!allergy || !allergy._id) throw new Error("Allergy not found");

        await deleteDocument({
            actionType: "ALLERGY_DELETED",
            documentId: allergy._id.toString(),
            collectionName: "Allergy",
            userId: `${user._id}`,
            trashMessage: `An allergy (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted an allergy on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Allergy deleted successfully" };
    } catch (error) {
        console.log("error while deleting allergy", error);
        throw error;
    }
}
export const deleteAllergy = await withAuth(_deleteAllergy, "clinicalManagement");

async function _getAllergiesByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const allergies = await Allergy.find({ patientId, del_flag: false }).sort({ createdAt: -1 });
        return JSON.parse(JSON.stringify(allergies || []));
    } catch (error) {
        console.error("Error fetching allergies:", error);
        throw error;
    }
}
export const getAllergiesByPatient = await withAuth(_getAllergiesByPatient);

/* ═══════════════════════════════════════════════════════════════
 *  IMMUNIZATION RECORD
 * ═══════════════════════════════════════════════════════════════ */

interface ImmunizationInput {
    vaccine: string;
    dose?: string;
    administeredDate?: string | Date | null;
    route?: string;
    site?: string;
    batchNumber?: string;
    note?: string;
}

async function _createImmunization(user: User, patientId: string, values: ImmunizationInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.vaccine?.trim()) throw new Error("A vaccine is required");
        await connectToDB();

        const immunization = await Immunization.create({
            patientId,
            vaccine: values.vaccine.trim(),
            dose: values.dose || "",
            administeredDate: values.administeredDate ? new Date(values.administeredDate) : null,
            route: values.route || "",
            site: values.site || "",
            batchNumber: values.batchNumber || "",
            note: values.note || "",
            recordedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "IMMUNIZATION_CREATED",
            details: { itemId: immunization._id },
            message: `${user.fullName} recorded immunization "${immunization.vaccine}" for patient ${patientId} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: immunization._id,
            entityType: "IMMUNIZATION",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(immunization));
    } catch (error) {
        console.log("unable to create immunization", error);
        throw error;
    }
}
export const createImmunization = await withAuth(_createImmunization, "clinicalManagement");

async function _updateImmunization(user: User, id: string, values: ImmunizationInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const update: Record<string, unknown> = {
            mod_flag: true,
            modifiedBy: user._id,
            action_type: "updated",
        };
        if (values.vaccine !== undefined) update.vaccine = values.vaccine.trim();
        if (values.dose !== undefined) update.dose = values.dose;
        if (values.route !== undefined) update.route = values.route;
        if (values.site !== undefined) update.site = values.site;
        if (values.batchNumber !== undefined) update.batchNumber = values.batchNumber;
        if (values.note !== undefined) update.note = values.note;
        if (values.administeredDate !== undefined) update.administeredDate = values.administeredDate ? new Date(values.administeredDate) : null;

        const immunization = await Immunization.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        if (!immunization) throw new Error("Immunization not found");

        await History.create({
            actionType: "IMMUNIZATION_UPDATED",
            details: { itemId: immunization._id },
            message: `${user.fullName} updated immunization "${immunization.vaccine}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: immunization._id,
            entityType: "IMMUNIZATION",
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(immunization));
    } catch (error) {
        console.log("unable to update immunization", error);
        throw error;
    }
}
export const updateImmunization = await withAuth(_updateImmunization, "clinicalManagement");

async function _deleteImmunization(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const immunization = await Immunization.findById(id);
        if (!immunization || !immunization._id) throw new Error("Immunization not found");

        await deleteDocument({
            actionType: "IMMUNIZATION_DELETED",
            documentId: immunization._id.toString(),
            collectionName: "Immunization",
            userId: `${user._id}`,
            trashMessage: `An immunization (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted an immunization on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Immunization deleted successfully" };
    } catch (error) {
        console.log("error while deleting immunization", error);
        throw error;
    }
}
export const deleteImmunization = await withAuth(_deleteImmunization, "clinicalManagement");

async function _getImmunizationsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const immunizations = await Immunization.find({ patientId, del_flag: false }).sort({ administeredDate: -1, createdAt: -1 });
        return JSON.parse(JSON.stringify(immunizations || []));
    } catch (error) {
        console.error("Error fetching immunizations:", error);
        throw error;
    }
}
export const getImmunizationsByPatient = await withAuth(_getImmunizationsByPatient);

/* ═══════════════════════════════════════════════════════════════
 *  COMBINED EMR (one round-trip for the panel / banner)
 * ═══════════════════════════════════════════════════════════════ */

async function _getEmrByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const [problems, allergies, immunizations] = await Promise.all([
            Problem.find({ patientId, del_flag: false }).sort({ createdAt: -1 }),
            Allergy.find({ patientId, del_flag: false }).sort({ createdAt: -1 }),
            Immunization.find({ patientId, del_flag: false }).sort({ administeredDate: -1, createdAt: -1 }),
        ]);
        return JSON.parse(JSON.stringify({
            problems: problems || [],
            allergies: allergies || [],
            immunizations: immunizations || [],
        }));
    } catch (error) {
        console.error("Error fetching EMR:", error);
        throw error;
    }
}
export const getEmrByPatient = await withAuth(_getEmrByPatient);
