"use server"

import { connectToDB } from "../mongoose";
import Appointment from "../models/appointment.models";
import { User, withAuth } from "../helpers/auth";

/**
 * Fetches all appointments for a given patient (most recent first).
 * Used by the patient portal / 360 view.
 */
async function _getAppointmentsByPatient(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const appointments = await Appointment.find({ patientId }).sort({ date: -1 });
        if (!appointments || appointments.length === 0) return [];
        return JSON.parse(JSON.stringify(appointments));
    } catch (error) {
        console.error("Error fetching patient appointments:", error);
        return [];
    }
}
export const getAppointmentsByPatient = await withAuth(_getAppointmentsByPatient);

/**
 * Recent patients (most recently registered) for the dashboard.
 */
async function _getRecentPatients(user: User, limit = 6) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const { Patient } = await import("../models/patient.models");
        const patients = await Patient.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("fullName patientId phone gender createdAt status")
            .lean();
        if (!patients || patients.length === 0) return [];
        return JSON.parse(JSON.stringify(patients));
    } catch (error) {
        console.error("Error fetching recent patients:", error);
        return [];
    }
}
export const getRecentPatients = await withAuth(_getRecentPatients);

/**
 * Recent/upcoming appointments for the dashboard.
 */
async function _getRecentAppointments(user: User, limit = 6) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const { Patient } = await import("../models/patient.models");
        const appointments = await Appointment.find({})
            .populate({ path: "patientId", model: Patient, select: "fullName patientId" })
            .sort({ date: -1 })
            .limit(limit)
            .lean();
        if (!appointments || appointments.length === 0) return [];

        const mapped = appointments.map((a) => {
            const p = a.patientId as unknown as { _id?: string; fullName?: string; patientId?: string } | null;
            return {
                _id: String(a._id),
                patientName: p && typeof p === "object" ? p.fullName || "Unknown" : "Unknown",
                patientId: p && typeof p === "object" ? (p._id ? String(p._id) : "") : "",
                date: a.date,
                timeSlot: a.timeSlot,
                appointmentType: a.appointmentType,
                status: a.status,
            };
        });
        return JSON.parse(JSON.stringify(mapped));
    } catch (error) {
        console.error("Error fetching recent appointments:", error);
        return [];
    }
}
export const getRecentAppointments = await withAuth(_getRecentAppointments);


/**
 * Unified per-patient visit-history timeline. Aggregates every dated clinical,
 * scheduling and financial event across BOTH the attendance/consulting system
 * and the dental clinical records — all keyed on patientId (ObjectId ref Patient).
 * Returns a single chronological list (newest first) the UI can render.
 */
async function _getPatientTimeline(user: User, patientId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        // Dynamic imports keep this action tree-shakeable and avoid circular deps.
        const [{ default: Attendance }, { default: ClinicalNote }, { default: PerioChart }, { default: Imaging }, { default: TreatmentPlan }, { default: Invoice }] =
            await Promise.all([
                import("../models/attendance.models"),
                import("../models/clinical-note.models"),
                import("../models/perio-chart.models"),
                import("../models/imaging.models"),
                import("../models/treatment-plan.models"),
                import("../models/invoice.models"),
            ]);

        const [attendances, appointments, notes, perios, images, plans, invoices] = await Promise.all([
            Attendance.find({ patientId }).sort({ date: -1 }).lean(),
            Appointment.find({ patientId }).sort({ date: -1 }).lean(),
            ClinicalNote.find({ patientId, del_flag: { $ne: true } }).sort({ createdAt: -1 }).lean(),
            PerioChart.find({ patientId, del_flag: { $ne: true } }).sort({ createdAt: -1 }).lean(),
            Imaging.find({ patientId, del_flag: { $ne: true } }).sort({ createdAt: -1 }).lean(),
            TreatmentPlan.find({ patientId, del_flag: { $ne: true } }).sort({ createdAt: -1 }).lean(),
            Invoice.find({ patientId, del_flag: { $ne: true } }).sort({ createdAt: -1 }).lean(),
        ]);

        type TimelineEvent = {
            id: string;
            type: "visit" | "appointment" | "note" | "perio" | "imaging" | "plan" | "invoice";
            date: string | Date;
            title: string;
            summary: string;
            status?: string;
            href?: string;
            appointmentId?: string | null;
        };

        const events: TimelineEvent[] = [];

        for (const a of attendances as unknown as Array<Record<string, unknown>>) {
            const dx = (a.diagnosis as { primary?: string } | undefined)?.primary;
            events.push({
                id: String(a._id),
                type: "visit",
                date: (a.date as Date) || (a.createdAt as Date),
                title: `Consultation visit${a.visitType ? ` (${a.visitType})` : ""}`,
                summary: dx ? `Dx: ${dx}` : (a.visitReason as string) || (a.doctorNote as string) || "Clinical encounter recorded",
                status: a.status as string,
                href: `/dashboard/attendance/${a._id}`,
            });
        }

        for (const ap of appointments as unknown as Array<Record<string, unknown>>) {
            events.push({
                id: String(ap._id),
                type: "appointment",
                date: (ap.date as Date) || (ap.createdAt as Date),
                title: `Appointment — ${(ap.appointmentType as string) || "visit"}`,
                summary: `${ap.timeSlot ? `${ap.timeSlot} • ` : ""}${(ap.reason as string) || (ap.notes as string) || ""}`.trim() || "Scheduled appointment",
                status: ap.status as string,
                href: `/dashboard/appointments/${ap._id}`,
                appointmentId: String(ap._id),
            });
        }

        for (const n of notes as unknown as Array<Record<string, unknown>>) {
            events.push({
                id: String(n._id),
                type: "note",
                date: (n.createdAt as Date),
                title: "Clinical note (SOAP)",
                summary: [n.assessment, n.plan].filter(Boolean).join(" — ") || (n.subjective as string) || "SOAP note recorded",
                href: `/dashboard/clinical/${patientId}`,
                appointmentId: n.appointmentId ? String(n.appointmentId) : null,
            });
        }

        for (const pc of perios as unknown as Array<Record<string, unknown>>) {
            const measurements = (pc.measurements as unknown[]) || [];
            events.push({
                id: String(pc._id),
                type: "perio",
                date: (pc.createdAt as Date),
                title: "Periodontal exam",
                summary: `${measurements.length} teeth charted${pc.note ? ` — ${pc.note}` : ""}`,
                href: `/dashboard/clinical/${patientId}`,
                appointmentId: pc.appointmentId ? String(pc.appointmentId) : null,
            });
        }

        for (const im of images as unknown as Array<Record<string, unknown>>) {
            events.push({
                id: String(im._id),
                type: "imaging",
                date: (im.takenAt as Date) || (im.createdAt as Date),
                title: `Imaging — ${(im.type as string) || "image"}`,
                summary: (im.title as string) || "Radiograph / photo attached",
                href: `/dashboard/clinical/${patientId}`,
                appointmentId: im.appointmentId ? String(im.appointmentId) : null,
            });
        }

        for (const tp of plans as unknown as Array<Record<string, unknown>>) {
            events.push({
                id: String(tp._id),
                type: "plan",
                date: (tp.createdAt as Date),
                title: `Treatment plan — ${(tp.title as string) || "plan"}`,
                summary: `${((tp.items as unknown[]) || []).length} item(s) • total ${Number(tp.totalCost || 0).toFixed(2)}`,
                status: tp.status as string,
                href: `/dashboard/treatment-plans/${patientId}`,
            });
        }

        for (const inv of invoices as unknown as Array<Record<string, unknown>>) {
            events.push({
                id: String(inv._id),
                type: "invoice",
                date: (inv.createdAt as Date),
                title: `Invoice ${(inv.invoiceNumber as string) || ""}`.trim(),
                summary: `Total ${Number(inv.total || 0).toFixed(2)} • Balance ${Number(inv.balance || 0).toFixed(2)}`,
                status: inv.status as string,
                href: `/dashboard/billing/invoices/${inv._id}`,
            });
        }

        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return JSON.parse(JSON.stringify(events));
    } catch (error) {
        console.error("Error building patient timeline:", error);
        return [];
    }
}
export const getPatientTimeline = await withAuth(_getPatientTimeline);


/**
 * Returns the dental clinical records (SOAP notes, perio exams, imaging) that
 * belong to a single visit. Scoped by the visit's calendar day, and also
 * includes any record explicitly linked to the given appointmentId.
 * Used by the attendance/consulting page so switching between previous visits
 * shows the clinical context recorded on that day.
 */
async function _getClinicalRecordsForVisit(
    user: User,
    patientId: string,
    visitDate: string,
    appointmentId?: string | null
) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const day = new Date(visitDate);
        const start = new Date(day); start.setHours(0, 0, 0, 0);
        const end = new Date(day); end.setHours(23, 59, 59, 999);

        const [{ default: ClinicalNote }, { default: PerioChart }, { default: Imaging }] = await Promise.all([
            import("../models/clinical-note.models"),
            import("../models/perio-chart.models"),
            import("../models/imaging.models"),
        ]);

        // A record belongs to this visit if it was created on the visit's day,
        // or is explicitly linked to the visit's appointment.
        const dayClause = (dateField: string) => {
            const or: Record<string, unknown>[] = [{ [dateField]: { $gte: start, $lte: end } }];
            if (appointmentId) or.push({ appointmentId });
            return { patientId, del_flag: { $ne: true }, $or: or };
        };

        const [notes, perios, images] = await Promise.all([
            ClinicalNote.find(dayClause("createdAt")).populate("authoredBy", "fullName").sort({ createdAt: -1 }).lean(),
            PerioChart.find(dayClause("createdAt")).sort({ createdAt: -1 }).lean(),
            Imaging.find(dayClause("takenAt")).sort({ createdAt: -1 }).lean(),
        ]);

        return JSON.parse(JSON.stringify({
            notes: notes || [],
            perios: perios || [],
            images: images || [],
        }));
    } catch (error) {
        console.error("Error fetching clinical records for visit:", error);
        return { notes: [], perios: [], images: [] };
    }
}
export const getClinicalRecordsForVisit = await withAuth(_getClinicalRecordsForVisit);
