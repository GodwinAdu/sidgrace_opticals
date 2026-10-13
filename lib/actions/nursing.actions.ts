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
