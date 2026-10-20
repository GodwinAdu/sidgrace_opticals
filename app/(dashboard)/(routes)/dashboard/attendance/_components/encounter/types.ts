/**
 * Shared encounter-workspace types.
 *
 * These describe the working `Attendance` document shape the rebuilt workspace
 * reads and writes, mirroring the embedded Mongoose schema (as populated by
 * `getAttendanceById`: `patientId` populated). The shape is carried verbatim
 * from the legacy `ConsultingPage.tsx` monolith so the migration is a 1:1
 * composition change, not a data-contract change (Req 6.4).
 *
 * Kept in its own module (not inside the provider) so the tab registry, shell,
 * and footer can share one definition rather than re-declaring it.
 */

import type { BillingSlice } from "@/lib/clinical/encounter";

/** The working visit document edited inside the workspace. */
export interface AttendanceData {
    patientId: {
        _id?: string;
        patientId?: string;
        fullName?: string;
        gender?: string;
        dob?: string;
        phone?: string;
        email?: string;
        bloodType?: string;
        allergies?: string[];
        chronicConditions?: string[];
    } & Record<string, unknown>;
    eyeTest: {
        visualAcuity: string;
        colorVision: string;
        intraocularPressure: string;
        remarks: string;
    };
    vitals: {
        temperature: number | null;
        pulse: number | null;
        bloodPressure: string;
        respiratoryRate: number | null;
        weight: number | null;
        height: number | null;
        bmi: number | null;
    };
    history: {
        presentingComplaints: string;
        pastMedicalHistory: string;
        familyHistory: string;
        drugHistory: string;
    };
    physicExam: {
        general: string;
        cardiovascular: string;
        respiratory: string;
        gastrointestinal: string;
        nervousSystem: string;
    };
    diagnosis: {
        primary: string;
        secondary: string[];
    };
    scan: any;
    doctorNote: string | null;
    nurseNote: string | null;
    drugs: {
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
    }[];
    labReport: any;
    plan: {
        treatment: string;
        followUp: string;
    };
    surgicalNote: string;
    procedures: {
        name: string;
        date: string;
        notes: string;
    }[];
    // Embedded per-visit dental clinical records
    dentalNotes?: {
        _id?: string;
        teeth?: number[];
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        noteId?: string;
        createdAt?: string;
    }[];
    perioExam?: {
        measurements?: { tooth: number; pocketDepth?: number[]; bleeding?: boolean; recession?: number; mobility?: number }[];
        note?: string;
        chartId?: string;
        recordedAt?: string | null;
    };
    dentalImaging?: {
        _id?: string;
        tooth?: number | null;
        type?: string;
        title?: string;
        fileUrl?: string;
        note?: string;
        imagingId?: string;
        takenAt?: string;
    }[];
    dentalProcedures?: {
        procedureId?: string | null;
        procedureName?: string;
        tooth?: number | null;
        surface?: string;
        cost?: number;
        note?: string;
        performedAt?: string;
    }[];
    chartId?: string | null;
    linkedTreatmentPlans?: string[];
    linkedLabCases?: string[];
    nursingNotes?: { note?: string; createdAt?: string }[];
    medicationAdmin?: { drugName?: string; dose?: string; route?: string; note?: string; givenAt?: string }[];
    intakeOutput?: { type?: string; kind?: string; amountMl?: number; recordedAt?: string }[];
    carePlan?: { _id?: string; problem?: string; goal?: string; interventions?: string; evaluation?: string; status?: "active" | "resolved"; authoredByName?: string; updatedByName?: string; createdAt?: string; updatedAt?: string }[];
    billing?: {
        invoiceId?: string | null;
        invoiceNumber?: string;
        consultationFee?: number;
        proceduresTotal?: number;
        productsTotal?: number;
        otherCharges?: { label?: string; amount?: number }[];
        dispensedProducts?: { productId?: string; name?: string; quantity?: number; unitPrice?: number; total?: number }[];
        totalCharged?: number;
        amountPaid?: number;
        balance?: number;
    };
    status: "waiting" | "pending" | "ongoing" | "completed" | "cancelled";
    visitType: "outpatient" | "inpatient" | "emergency";
    paymentType?: string;
    _id?: string;
    date?: Date;
    appointmentId?: string;
}

/** A prior visit entry shown by the previous-visit picker. */
export interface PreviousVisit {
    _id: string;
    date: Date;
    status: "waiting" | "pending" | "ongoing" | "completed" | "cancelled";
    visitType: "outpatient" | "inpatient" | "emergency";
    /** Primary diagnosis / reason hint so visits are distinguishable in the picker. */
    diagnosis?: { primary?: string; secondary?: string[] } | null;
}

/** Active-admission context shown in the header for inpatients. */
export interface AdmissionContext {
    _id?: string;
    admittedAt?: string;
    wardId?: { name?: string } | string;
    bedId?: { label?: string } | string;
}

/**
 * A billing patch may be either the raw embedded `billing` object from the
 * attendance document or the roll-up slice the pure layer understands. We keep
 * it loose and reconcile in the reducer.
 */
export type BillingPatch = BillingSlice & {
    invoiceId?: string | null;
    invoiceNumber?: string;
    dispensedProducts?: { productId?: string; name?: string; quantity?: number; unitPrice?: number; total?: number }[];
};
