import { Schema, model, models } from "mongoose";

/**
 * Reusable, append-only attributed version subdocument for tracked clinical
 * fields (mirrors the pure `AttributedVersion` type in
 * `lib/clinical/attribution.ts`). Each element is an immutable snapshot of a
 * field value at one save, stamped with the authenticated author and server
 * time. `authoredByName` / `authoredByRole` are denormalised snapshots taken at
 * write time so inline display stays correct even if the staff member is later
 * renamed, deactivated, or deleted. Defined once and reused for every `*Versions`
 * array to avoid duplication. All fields default so existing documents remain
 * valid (additive, back-compatible â€” R6.1, R6.2, R6.3).
 */
const AttributedVersionSchema = new Schema({
    // The field value captured at this save (string or structured object).
    content: { type: Schema.Types.Mixed },
    // Authoritative staff id, taken from the authenticated user (never client-supplied).
    authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    // Denormalised author display name snapshot at write time.
    authoredByName: { type: String, default: "" },
    // Denormalised author role/title snapshot at write time.
    authoredByRole: { type: String, default: "" },
    // Server-generated timestamp for the write.
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const AttendanceSchema = new Schema({
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    eyeTest: {
        visualAcuity: { type: String },
        colorVision: { type: String },
        intraocularPressure: { type: String },
        remarks: { type: String },
    },
    vitals: {
        temperature: { type: Number },
        pulse: { type: Number },
        bloodPressure: { type: String },
        respiratoryRate: { type: Number },
        weight: { type: Number },
        height: { type: Number },
        bmi: { type: Number },
    },
    history: {
        presentingComplaints: { type: String },
        pastMedicalHistory: { type: String },
        familyHistory: { type: String },
        drugHistory: { type: String },
    },
    physicExam: {
        general: { type: String },
        cardiovascular: { type: String },
        respiratory: { type: String },
        gastrointestinal: { type: String },
        nervousSystem: { type: String },
    },
    diagnosis: {
        primary: { type: String },
        secondary: [{ type: String }],
        // Optional ICD-10 coding alongside the free-text diagnosis (back-compatible).
        icd10Code: { type: String },
        icd10Desc: { type: String },
    },
    scan: {
        type: Schema.Types.Mixed,
    },
    doctorNote: {
        type: String,
        default: null,
    },

    nurseNote: {
        type: String,
        default: null,
    },

    drugs: [{
        name: { type: String },
        dosage: { type: String },
        frequency: { type: String },
        duration: { type: String },
    }],

    labReport: {
        type: Schema.Types.Mixed,
    },

    plan: {
        treatment: { type: String },
        followUp: { type: String },
    },

    surgicalNote: {
        type: String,
    },

    procedures: [{
        name: { type: String },
        date: { type: Date },
        notes: { type: String },
    }],

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Attributed, append-only version history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Parallel to the scalar clinical fields above (doctorNote, nurseNote,
    // surgicalNote, history, physicExam, diagnosis, plan, eyeTest, vitals).
    // The scalars remain the materialised "latest value" for back-compat; these
    // arrays accumulate every attributed save (who + when), newest last.
    // Additive and defaulted so existing visits load and validate unchanged
    // (R2.1, R2.2, R2.5, R6.1, R6.2, R6.3).
    doctorNoteVersions: [AttributedVersionSchema],
    nurseNoteVersions: [AttributedVersionSchema],
    surgicalNoteVersions: [AttributedVersionSchema],
    historyVersions: [AttributedVersionSchema],
    physicExamVersions: [AttributedVersionSchema],
    diagnosisVersions: [AttributedVersionSchema],
    planVersions: [AttributedVersionSchema],
    eyeTestVersions: [AttributedVersionSchema],
    vitalsVersions: [AttributedVersionSchema],
    labReportVersions: [AttributedVersionSchema],
    scanVersions: [AttributedVersionSchema],

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Embedded nursing records (inpatient timeline) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Time-stamped nurse logs. Inpatient care is a running log, not a single
    // snapshot, so these are append-only arrays.
    nursingNotes: [{
        note: { type: String, default: "" },
        authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        // Denormalised author snapshots for consistent inline display (additive, R6.2).
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
    }],

    // Medication Administration Record â€” doses actually given to the patient.
    medicationAdmin: [{
        drugName: { type: String, default: "" },
        dose: { type: String, default: "" },
        route: { type: String, default: "" },
        givenBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        // Denormalised author snapshots for consistent inline display (additive, R6.2).
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        givenAt: { type: Date, default: Date.now },
        note: { type: String, default: "" },
    }],

    // Intake / output chart (fluids, etc.).
    intakeOutput: [{
        type: { type: String, enum: ["intake", "output"], default: "intake" },
        kind: { type: String, default: "" },
        amountMl: { type: Number, default: 0 },
        recordedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        // Denormalised author snapshots for consistent inline display (additive, R6.2).
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        recordedAt: { type: Date, default: Date.now },
    }],

    // Quick link to the active admission (source of truth is the Admission doc).
    admissionId: { type: Schema.Types.ObjectId, ref: "Admission", default: null },

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Embedded per-visit dental clinical records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // These capture the clinical work recorded during THIS visit, so each
    // attendance document is a self-contained snapshot of the encounter.

    // SOAP dental notes recorded this visit
    dentalNotes: [{
        teeth: { type: [Number], default: [] },
        subjective: { type: String, default: "" },
        objective: { type: String, default: "" },
        assessment: { type: String, default: "" },
        plan: { type: String, default: "" },
        authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        // Denormalised author snapshots for consistent inline display (additive, R6.2).
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        // link to the mirrored standalone ClinicalNote document (kept in sync)
        noteId: { type: Schema.Types.ObjectId, ref: "ClinicalNote", default: null },
        createdAt: { type: Date, default: Date.now },
    }],

    // Periodontal exam readings taken this visit
    perioExam: {
        measurements: [{
            tooth: { type: Number },
            pocketDepth: { type: [Number], default: [] },
            bleeding: { type: Boolean, default: false },
            recession: { type: Number, default: 0 },
            mobility: { type: Number, default: 0 },
        }],
        note: { type: String, default: "" },
        chartId: { type: Schema.Types.ObjectId, ref: "PerioChart", default: null },
        // Per-recording attribution so the exam can be stamped (additive, defaulted â€” R6.2).
        authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        recordedAt: { type: Date, default: null },
    },

    // Imaging captured this visit
    dentalImaging: [{
        tooth: { type: Number, default: null },
        type: {
            type: String,
            enum: ["radiograph", "intraoral-photo", "panoramic", "cbct", "other"],
            default: "radiograph",
        },
        title: { type: String, default: "" },
        fileUrl: { type: String, default: "" },
        note: { type: String, default: "" },
        imagingId: { type: Schema.Types.ObjectId, ref: "Imaging", default: null },
        // Per-entry attribution so imaging can be stamped (additive, defaulted â€” R6.2).
        authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        takenAt: { type: Date, default: Date.now },
    }],

    // Dental procedures performed this visit (aligned to the procedure catalog)
    dentalProcedures: [{
        procedureId: { type: Schema.Types.ObjectId, ref: "Procedure", default: null },
        procedureName: { type: String, default: "" },
        tooth: { type: Number, default: null },
        surface: { type: String, default: "" },
        cost: { type: Number, default: 0 },
        note: { type: String, default: "" },
        // Per-entry attribution so the performed procedure can be stamped (additive, defaulted â€” R6.2).
        authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        authoredByName: { type: String, default: "" },
        authoredByRole: { type: String, default: "" },
        performedAt: { type: Date, default: Date.now },
    }],

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Combined visit bill (cash-basis) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // All charges for this visit roll up here into one balance the patient
    // pays. Charges only build the bill; PAYMENTS post income to the ledger.
    billing: {
        // Linked professional invoice (source of truth for paid/balance once created).
        invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
        invoiceNumber: { type: String, default: "" },
        consultationFee: { type: Number, default: 0 },
        proceduresTotal: { type: Number, default: 0 },
        otherCharges: [{
            label: { type: String, default: "" },
            amount: { type: Number, default: 0 },
        }],
        // Inventory products / drugs dispensed to the patient this visit.
        dispensedProducts: [{
            productId: { type: Schema.Types.ObjectId, ref: "InventoryProduct", default: null },
            name: { type: String, default: "" },
            quantity: { type: Number, default: 1 },
            unitPrice: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        }],
        totalCharged: { type: Number, default: 0 },
        amountPaid: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        payments: [{
            amount: { type: Number, default: 0 },
            method: {
                type: String,
                enum: ["cash", "card", "mobile-money", "bank-transfer", "insurance", "other", ""],
                default: "cash",
            },
            transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", default: null },
            receivedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
            receivedAt: { type: Date, default: Date.now },
        }],
    },

    // â”€â”€ Cross-visit living records: referenced, NOT duplicated per visit â”€â”€
    // The whole-mouth chart is a single living record; the visit points to it.
    chartId: { type: Schema.Types.ObjectId, ref: "DentalChart", default: null },
    // Treatment plans / lab cases span multiple visits; the visit links them.
    linkedTreatmentPlans: [{ type: Schema.Types.ObjectId, ref: "TreatmentPlan" }],
    linkedLabCases: [{ type: Schema.Types.ObjectId, ref: "LabCase" }],

    status: {
        type: String,
        enum: ["waiting", "ongoing", "completed", "cancelled"],
        default: "waiting",
    },

    // Visit category captured at OPD check-in.
    visitType: {
        type: String,
        enum: ["new", "follow-up", "procedure", "emergency", "outpatient", "inpatient", ""],
        default: "new",
    },
    // Payment type for the visit (cash / insurance / nhis / etc.).
    paymentType: {
        type: String,
        default: "cash",
    },
    visitReason: {
        type: String,
    },
    followUpDate: {
        type: Date,
        default: null,
    },
    followUpInstructions: {
        type: String,
        default: null,
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
    },

}, { timestamps: true });

const Attendance = models.Attendance ?? model("Attendance", AttendanceSchema);
export default Attendance;

