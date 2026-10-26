import { model, models, Schema, Model } from "mongoose";

/**
 * Blood bank & specimen tracking module.
 *
 * `BloodUnit` is a single unit of a blood component in the bank. It carries the
 * ABO/Rh group, component type, and an expiry date, and moves through the
 * lifecycle available → reserved → issued, with discarded reachable from any
 * live state (see the pure transition logic in lib/clinical/blood-bank). When a
 * unit is reserved or issued for a patient (a crossmatch) the patient id and
 * crossmatch result are stored on the unit. Group-compatibility and
 * expiry/issuable checks are pure helpers so they can be unit-tested without a
 * database.
 *
 * `Specimen` is a lab specimen linked to an existing `LabOrder`. It has a
 * tracked lifecycle (collected → in-transit → received → processed, with
 * rejected reachable before processing). Each transition appends an immutable
 * entry to the `events` trail so the chain of custody is auditable; the current
 * `status` mirrors the latest event. The patient id is denormalised from the
 * lab order for direct per-patient querying.
 */

/* ──────────────────────────────── Blood unit ────────────────────────────── */

const BloodUnitSchema = new Schema<IBloodUnit>(
    {
        unitNumber: { type: String, required: true, unique: true },
        bloodGroup: {
            type: String,
            enum: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
            required: true,
        },
        component: {
            type: String,
            enum: ["whole-blood", "red-cells", "plasma", "platelets", "cryoprecipitate"],
            default: "whole-blood",
        },
        volumeMl: { type: Number, default: null },
        collectedAt: { type: Date, default: null },
        expiry: { type: Date, required: true },
        status: {
            type: String,
            enum: ["available", "reserved", "issued", "discarded"],
            default: "available",
        },
        source: { type: String, default: "" }, // donor / supplier reference
        // Set when reserved/issued (crossmatched) for a patient.
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
        crossmatchedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        crossmatchResult: {
            type: String,
            enum: ["compatible", "incompatible", ""],
            default: "",
        },
        issuedAt: { type: Date, default: null },
        issuedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        discardReason: { type: String, default: "" },
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

// Inventory reads filter by group/component/status and sort by expiry (oldest
// first for FEFO issuing); per-patient reads find reserved/issued units.
BloodUnitSchema.index({ status: 1, bloodGroup: 1, expiry: 1 });
BloodUnitSchema.index({ patientId: 1 });

export const BloodUnit: Model<IBloodUnit> =
    models.BloodUnit ?? model<IBloodUnit>("BloodUnit", BloodUnitSchema);

/* ──────────────────────────────── Specimen ──────────────────────────────── */

const SpecimenEventSchema = new Schema<ISpecimenEvent>(
    {
        status: {
            type: String,
            enum: ["collected", "in-transit", "received", "processed", "rejected"],
            required: true,
        },
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        note: { type: String, default: "" },
    },
    { _id: false }
);

const SpecimenSchema = new Schema<ISpecimen>(
    {
        specimenNumber: { type: String, required: true, unique: true },
        labOrderId: { type: Schema.Types.ObjectId, ref: "LabOrder", required: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        specimenType: { type: String, default: "" }, // e.g. "blood", "urine"
        container: { type: String, default: "" },     // e.g. "EDTA tube"
        status: {
            type: String,
            enum: ["collected", "in-transit", "received", "processed", "rejected"],
            default: "collected",
        },
        collectedAt: { type: Date, default: null },
        events: { type: [SpecimenEventSchema], default: [] },
        note: { type: String, default: "" },
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

SpecimenSchema.index({ labOrderId: 1 });
SpecimenSchema.index({ patientId: 1, createdAt: -1 });
SpecimenSchema.index({ status: 1 });

export const Specimen: Model<ISpecimen> =
    models.Specimen ?? model<ISpecimen>("Specimen", SpecimenSchema);

export default BloodUnit;
