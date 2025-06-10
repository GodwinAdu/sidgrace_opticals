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

    status: {
        type: String,
        enum: ["waiting", "ongoing", "completed", "cancelled"],
        default: "pending",
    },

    visitType: {
        type: String,
        enum: ["outpatient", "inpatient", "emergency",""],
        default: "outpatient",
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
