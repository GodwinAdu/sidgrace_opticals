import { model, models, Schema, Model } from "mongoose";

const InsuranceSchema = new Schema<IInsurance>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        insurer: { type: String, required: true, trim: true },
        policyNumber: { type: String, required: true, trim: true },
        coveragePercent: { type: Number, default: 0, min: 0, max: 100 },
        validUntil: { type: Date, default: null },
        notes: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
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

InsuranceSchema.index({ patientId: 1 });

const Insurance: Model<IInsurance> =
    models.Insurance ?? model<IInsurance>("Insurance", InsuranceSchema);

export default Insurance;
