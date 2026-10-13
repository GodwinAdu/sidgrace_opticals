import { model, models, Schema, Model } from "mongoose";

/**
 * Maternity / obstetrics module.
 *
 * `AncRecord` is one antenatal-care (pregnancy) episode for a mother, carrying
 * the LMP/EDD, obstetric history, and an append-style list of ANC `visits`
 * (gestational age + key observations recorded over the pregnancy). Gestational
 * age is derived from the LMP by the pure helpers in lib/clinical/maternity.
 *
 * `DeliveryRecord` captures the delivery itself — mode, outcome, and the
 * `babies` born — and links the mother to each newborn. A newborn may be
 * registered as its own Patient (reusing the shared patient-creation path); the
 * resulting patient id is stored on the baby so the mother→newborn link is kept.
 */

/* ─────────────────────────────── ANC visit ──────────────────────────────── */

const AncVisitSchema = new Schema(
    {
        visitDate: { type: Date, required: true, default: Date.now },
        // Gestational age (completed weeks) at this visit — derived from LMP but
        // snapshotted here for the historical record.
        gestationalWeeks: { type: Number, default: null },
        weightKg: { type: Number, default: null },
        bloodPressure: { type: String, default: "" }, // e.g. "120/80"
        fundalHeightCm: { type: Number, default: null },
        fetalHeartRate: { type: Number, default: null },
        notes: { type: String, default: "" },
        recordedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    },
    { timestamps: true, _id: true }
);

const AncRecordSchema = new Schema<IAncRecord>(
    {
        episodeNumber: { type: String, required: true, unique: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        // Last menstrual period — the anchor for gestational age / EDD.
        lmp: { type: Date, default: null },
        // Estimated due date (Naegele's rule from LMP); stored for quick listing.
        edd: { type: Date, default: null },
        gravida: { type: Number, default: null }, // total pregnancies
        para: { type: Number, default: null }, // prior viable births
        bloodGroup: { type: String, default: "" },
        riskFactors: { type: String, default: "" },
        visits: { type: [AncVisitSchema], default: [] },
        status: {
            type: String,
            enum: ["active", "delivered", "closed"],
            default: "active",
        },
        recordedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

AncRecordSchema.index({ patientId: 1, createdAt: -1 });
AncRecordSchema.index({ status: 1, edd: 1 });

export const AncRecord: Model<IAncRecord> =
    models.AncRecord ?? model<IAncRecord>("AncRecord", AncRecordSchema);

/* ────────────────────────────── Newborn baby ────────────────────────────── */

const NewbornSchema = new Schema(
    {
        sex: { type: String, enum: ["male", "female", "unknown"], default: "unknown" },
        birthWeightGrams: { type: Number, default: null },
        apgarScore: { type: Number, default: null },
        status: {
            type: String,
            enum: ["alive", "stillbirth", "deceased"],
            default: "alive",
        },
        notes: { type: String, default: "" },
        // Set when the newborn has been registered as its own Patient.
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
    },
    { timestamps: true, _id: true }
);

/* ────────────────────────────── Delivery ────────────────────────────────── */

const DeliveryRecordSchema = new Schema<IDeliveryRecord>(
    {
        deliveryNumber: { type: String, required: true, unique: true },
        // The mother.
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        ancRecordId: { type: Schema.Types.ObjectId, ref: "AncRecord", default: null },
        deliveredAt: { type: Date, required: true, default: Date.now },
        mode: {
            type: String,
            enum: ["vaginal", "assisted-vaginal", "caesarean", "vbac", "other"],
            default: "vaginal",
        },
        outcome: {
            type: String,
            enum: ["live-birth", "stillbirth", "miscarriage", "neonatal-death", "other"],
            default: "live-birth",
        },
        attendants: [{ type: Schema.Types.ObjectId, ref: "Staff" }],
        notes: { type: String, default: "" },
        babies: { type: [NewbornSchema], default: [] },
        recordedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

DeliveryRecordSchema.index({ patientId: 1, createdAt: -1 });
DeliveryRecordSchema.index({ deliveredAt: -1 });

export const DeliveryRecord: Model<IDeliveryRecord> =
    models.DeliveryRecord ?? model<IDeliveryRecord>("DeliveryRecord", DeliveryRecordSchema);

export default AncRecord;
