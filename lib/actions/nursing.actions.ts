"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Attendance from "../models/attendance.models";
import { User, withAuth } from "../helpers/auth";
import { makeVersion } from "../clinical/attribution";
import { writeVisitAuditEntry } from "../helpers/clinical-audit";

/**
 * Derive the denormalised `authoredByName` / `authoredByRole` snapshots from the
 * authenticated `user`, reusing the exact precedence encoded by the pure
 * `makeVersion` helper (name = fullName; role = specialization || role). Keeping
 * this on top of `makeVersion` means the self-persisting adders and the
 * attributed section save stamp identical attribution for the same user.
 */
function authorSnapshot(user: User) {
    const version = makeVersion(null, user as never, new Date());
    return { authoredByName: version.authoredByName, authoredByRole: version.authoredByRole };
}

/* ─────────────── NURSING NOTES ─────────────── */
async function _addNursingNote(user: User, attendanceId: string, note: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!note || !note.trim()) throw new Error("Note cannot be empty");
        await connectToDB();

        const visit = await Attendance.findById(attendanceId);
        if (!visit) throw new Error("Visit not found");

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.nursingNotes = visit.nursingNotes || [];
        visit.nursingNotes.push({ note: note.trim(), authoredBy: user._id, authoredByName, authoredByRole, createdAt: new Date() } as never);
        visit.markModified("nursingNotes");
        await visit.save();

        // Best-effort audit AFTER the clinical save so a failed audit never
        // blocks the clinical write (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "nursingNotes" },
            message: `${authoredByName || "A staff member"} recorded a nursing note.`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.nursingNotes));
    } catch (error) {
        console.error("Error adding nursing note:", error);
        throw error;
    }
}
export const addNursingNote = await withAuth(_addNursingNote, "attNursing");

/* ─────────────── MEDICATION ADMINISTRATION (MAR) ─────────────── */
interface MarInput {
    drugName: string;
    dose?: string;
    route?: string;
    note?: string;
}
async function _addMedicationAdmin(user: User, attendanceId: string, entry: MarInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!entry?.drugName?.trim()) throw new Error("Drug name is required");
        await connectToDB();

        const visit = await Attendance.findById(attendanceId);
        if (!visit) throw new Error("Visit not found");

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.medicationAdmin = visit.medicationAdmin || [];
        visit.medicationAdmin.push({
            drugName: entry.drugName.trim(),
            dose: entry.dose || "",
            route: entry.route || "",
            note: entry.note || "",
            givenBy: user._id,
            authoredByName,
            authoredByRole,
            givenAt: new Date(),
        } as never);
        visit.markModified("medicationAdmin");
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "medicationAdmin", drugName: entry.drugName.trim() },
            message: `${authoredByName || "A staff member"} administered ${entry.drugName.trim()}.`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.medicationAdmin));
    } catch (error) {
        console.error("Error adding medication administration:", error);
        throw error;
    }
}
export const addMedicationAdmin = await withAuth(_addMedicationAdmin, "attNursing");

/* ─────────────── INTAKE / OUTPUT ─────────────── */
interface IoInput {
    type: "intake" | "output";
    kind?: string;
    amountMl?: number;
}
async function _addIntakeOutput(user: User, attendanceId: string, entry: IoInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        const amount = Number(entry?.amountMl) || 0;
        if (amount <= 0) throw new Error("Enter an amount greater than zero");
        await connectToDB();

        const visit = await Attendance.findById(attendanceId);
        if (!visit) throw new Error("Visit not found");

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.intakeOutput = visit.intakeOutput || [];
        visit.intakeOutput.push({
            type: entry.type === "output" ? "output" : "intake",
            kind: entry.kind || "",
            amountMl: amount,
            recordedBy: user._id,
            authoredByName,
            authoredByRole,
            recordedAt: new Date(),
        } as never);
        visit.markModified("intakeOutput");
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "intakeOutput", type: entry.type === "output" ? "output" : "intake", amountMl: amount },
            message: `${authoredByName || "A staff member"} recorded a fluid ${entry.type === "output" ? "output" : "intake"} of ${amount} ml.`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.intakeOutput));
    } catch (error) {
        console.error("Error adding intake/output:", error);
        throw error;
    }
}
export const addIntakeOutput = await withAuth(_addIntakeOutput, "attNursing");

/* ─────────────── NURSING CARE PLAN (nursing-process items) ─────────────── */
interface CarePlanInput {
    problem: string;
    goal?: string;
    interventions?: string;
    evaluation?: string;
    status?: "active" | "resolved";
}

/**
 * Open a new care-plan item (problem / nursing diagnosis → goal → interventions
 * → evaluation). Append-only create; items are updated via
 * `updateCarePlanItem`. Gated by `attNursing`; attributed + audited.
 */
async function _addCarePlanItem(user: User, attendanceId: string, entry: CarePlanInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!entry?.problem?.trim()) throw new Error("A problem / nursing diagnosis is required");
        await connectToDB();

        const visit = await Attendance.findById(attendanceId);
        if (!visit) throw new Error("Visit not found");

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        const now = new Date();
        visit.carePlan = visit.carePlan || [];
        visit.carePlan.push({
            problem: entry.problem.trim(),
            goal: entry.goal?.trim() || "",
            interventions: entry.interventions?.trim() || "",
            evaluation: entry.evaluation?.trim() || "",
            status: entry.status === "resolved" ? "resolved" : "active",
            authoredBy: user._id,
            authoredByName,
            authoredByRole,
            updatedByName: authoredByName,
            createdAt: now,
            updatedAt: now,
        } as never);
        visit.markModified("carePlan");
        await visit.save();

        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "carePlan", problem: entry.problem.trim() },
            message: `${authoredByName || "A staff member"} opened a care-plan item: ${entry.problem.trim()}.`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.carePlan));
    } catch (error) {
        console.error("Error adding care-plan item:", error);
        throw error;
    }
}
export const addCarePlanItem = await withAuth(_addCarePlanItem, "attNursing");

interface CarePlanUpdate {
    goal?: string;
    interventions?: string;
    evaluation?: string;
    status?: "active" | "resolved";
}

/**
 * Update an existing care-plan item (progress its evaluation and/or status, or
 * revise the goal/interventions). The problem statement itself is immutable once
 * opened — revise care via evaluation/status so the record stays faithful.
 * Gated by `attNursing`; records the last updater + time; audited.
 */
async function _updateCarePlanItem(
    user: User,
    attendanceId: string,
    itemId: string,
    update: CarePlanUpdate,
    path?: string,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!itemId) throw new Error("A care-plan item is required");
        await connectToDB();

        const visit = await Attendance.findById(attendanceId);
        if (!visit) throw new Error("Visit not found");

        const list = (visit.carePlan || []) as unknown as Array<Record<string, unknown> & { _id?: unknown }>;
        const item = list.find((c) => String(c._id) === String(itemId));
        if (!item) throw new Error("Care-plan item not found");

        if (update.goal !== undefined) item.goal = update.goal.trim();
        if (update.interventions !== undefined) item.interventions = update.interventions.trim();
        if (update.evaluation !== undefined) item.evaluation = update.evaluation.trim();
        if (update.status !== undefined) item.status = update.status === "resolved" ? "resolved" : "active";

        const { authoredByName } = authorSnapshot(user);
        item.updatedByName = authoredByName;
        item.updatedAt = new Date();

        visit.markModified("carePlan");
        await visit.save();

        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "carePlan", itemId: String(itemId), status: item.status },
            message: `${authoredByName || "A staff member"} updated a care-plan item.`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.carePlan));
    } catch (error) {
        console.error("Error updating care-plan item:", error);
        throw error;
    }
}
export const updateCarePlanItem = await withAuth(_updateCarePlanItem, "attNursing");
