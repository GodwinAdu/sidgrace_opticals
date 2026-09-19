import { model, models, Schema, Model } from "mongoose";

const TreatmentPlanItemSchema = new Schema(
    {
        procedureId: { type: Schema.Types.ObjectId, ref: "Procedure", default: null },
        procedureName: { type: String, required: true },
        tooth: { type: Number, default: null },
        surface: { type: String, default: "" },
        phase: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["proposed", "accepted", "in-progress", "completed", "cancelled"],
            default: "proposed",
        },
        note: { type: String, default: "" },
    },
    { _id: false }
);

const TreatmentPlanSchema = new Schema<ITreatmentPlan>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        title: { type: String, required: true, trim: true },
        items: { type: [TreatmentPlanItemSchema], default: [] },
        totalCost: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["draft", "proposed", "accepted", "in-progress", "completed", "cancelled"],
            default: "draft",
        },
        acceptedByPatient: { type: Boolean, default: false },
        acceptedAt: { type: Date, default: null },
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

TreatmentPlanSchema.index({ patientId: 1, createdAt: -1 });

const TreatmentPlan: Model<ITreatmentPlan> =
    models.TreatmentPlan ?? model<ITreatmentPlan>("TreatmentPlan", TreatmentPlanSchema);

export default TreatmentPlan;
