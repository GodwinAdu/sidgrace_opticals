import { Schema, model, models, Model } from "mongoose";

/**
 * Singleton-ish clinic settings document. We keep one settings doc and
 * read/update it. Holds clinic-wide defaults such as the standard
 * consultation fee that pre-fills the visit billing field.
 */
const ClinicSettingsSchema = new Schema(
    {
        key: { type: String, default: "clinic", unique: true },
        defaultConsultationFee: { type: Number, default: 0 },
        currency: { type: String, default: "" },
        modifiedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    },
    { timestamps: true }
);

const ClinicSettings: Model<Record<string, unknown>> =
    (models.ClinicSettings as Model<Record<string, unknown>>) ??
    model("ClinicSettings", ClinicSettingsSchema);

export default ClinicSettings;
