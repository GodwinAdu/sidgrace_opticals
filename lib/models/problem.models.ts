import { model, models, Schema, Model } from "mongoose";

/**
 * Structured problem list entry (longitudinal, patient-scoped).
 * Distinct from the free-text `chronicConditions` / `medicalHistory` on the
 * Patient document, which remain for back-compat.
 */
const ProblemSchema = new Schema<IProblem>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        condition: { type: String, required: true },
        icd10Code: { type: String, default: "" },
        status: {
            type: String,
            enum: ["active", "resolved"],
            default: "active",
        },
        onsetDate: { type: Date, default: null },
        resolvedDate: { type: Date, default: null },
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

ProblemSchema.index({ patientId: 1, createdAt: -1 });

const Problem: Model<IProblem> =
    models.Problem ?? model<IProblem>("Problem", ProblemSchema);

export default Problem;
