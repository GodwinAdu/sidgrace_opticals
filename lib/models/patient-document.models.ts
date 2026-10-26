import { model, models, Schema, Model } from "mongoose";

/**
 * Document management (DMS) module.
 *
 * A `PatientDocument` records a file attached to a patient — a scanned record,
 * a signed consent, an insurance/ID scan, etc. Files are stored via the shared
 * upload pipeline (`uploadFile`), so the database keeps only the retrievable
 * URL plus a type and an optional note (per Requirement 13). Signed consents
 * (`type: "consent"`) make up the retrievable consent archive.
 *
 * The allowed `type` values live in the pure helper lib/clinical/document so
 * they can be unit-tested and shared with the UI.
 */

const DOCUMENT_TYPES = [
    "consent",
    "scanned-record",
    "lab-report",
    "insurance",
    "identification",
    "referral-letter",
    "other",
];

const PatientDocumentSchema = new Schema<IPatientDocument>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        type: {
            type: String,
            enum: DOCUMENT_TYPES,
            default: "other",
        },
        title: { type: String, required: true, trim: true },
        url: { type: String, required: true },
        fileName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        note: { type: String, default: "" },
        createdBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        modifiedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        mod_flag: { type: Boolean, default: false },
        del_flag: { type: Boolean, default: false },
        action_type: {
            type: String,
            enum: ["created", "updated", "deleted", "restored"],
            default: "created",
        },
    },
    { timestamps: true }
);

// Per-patient reads list a patient's documents newest-first; the consent
// archive additionally filters by type.
PatientDocumentSchema.index({ patientId: 1, createdAt: -1 });
PatientDocumentSchema.index({ patientId: 1, type: 1, createdAt: -1 });

const PatientDocument: Model<IPatientDocument> =
    models.PatientDocument ?? model<IPatientDocument>("PatientDocument", PatientDocumentSchema);

export default PatientDocument;
