import { model, models, Schema, Model } from "mongoose";

/**
 * Structured allergy entry (longitudinal, patient-scoped).
 * Distinct from the free-text `allergies` string array on the Patient
 * document, which remains for back-compat. These structured records drive the
 * attendance safety banner and (later) drug decision support.
 */
const AllergySchema = new Schema<IAllergy>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        substance: { type: String, required: true },
        reaction: { type: String, default: "" },
        severity: {
            type: String,
            enum: ["mild", "moderate", "severe", "unknown"],
            default: "unknown",
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
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

AllergySchema.index({ patientId: 1, createdAt: -1 });

const Allergy: Model<IAllergy> =
    models.Allergy ?? model<IAllergy>("Allergy", AllergySchema);

export default Allergy;
