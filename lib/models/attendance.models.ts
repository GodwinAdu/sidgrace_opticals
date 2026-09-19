import { Schema, model, models } from "mongoose";

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

    // ─────────────── Embedded per-visit dental clinical records ───────────────
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
        performedAt: { type: Date, default: Date.now },
    }],

    // ─────────────── Combined visit bill (cash-basis) ───────────────
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

    // ── Cross-visit living records: referenced, NOT duplicated per visit ──
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
