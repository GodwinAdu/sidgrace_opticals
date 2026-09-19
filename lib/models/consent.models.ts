import { model, models, Schema, Model } from "mongoose";

const ConsentSchema = new Schema<IConsent>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        procedureName: { type: String, required: true },
        content: { type: String, required: true },
        signed: { type: Boolean, default: false },
        signatureName: { type: String, default: "" },
        signedAt: { type: Date, default: null },
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

ConsentSchema.index({ patientId: 1, createdAt: -1 });

const Consent: Model<IConsent> =
    models.Consent ?? model<IConsent>("Consent", ConsentSchema);

export default Consent;
