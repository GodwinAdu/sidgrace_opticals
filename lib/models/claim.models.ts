import { model, models, Schema, Model } from "mongoose";

const ClaimSchema = new Schema<IClaim>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        insuranceId: { type: Schema.Types.ObjectId, ref: "Insurance", default: null },
        invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
        claimNumber: { type: String, required: true, unique: true },
        amountClaimed: { type: Number, default: 0 },
        amountApproved: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["draft", "submitted", "pre-authorized", "approved", "partially-approved", "rejected", "paid"],
            default: "draft",
        },
        submittedAt: { type: Date, default: null },
        notes: { type: String, default: "" },
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

ClaimSchema.index({ patientId: 1, createdAt: -1 });

const Claim: Model<IClaim> =
    models.Claim ?? model<IClaim>("Claim", ClaimSchema);

export default Claim;
