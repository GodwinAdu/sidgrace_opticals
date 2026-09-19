import { model, models, Schema, Model } from "mongoose";

const PaymentSchema = new Schema<IPayment>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
        amount: { type: Number, required: true, min: 0 },
        method: {
            type: String,
            enum: ["cash", "card", "mobile-money", "bank-transfer", "insurance", "other"],
            default: "cash",
        },
        reference: { type: String, default: "" },
        note: { type: String, default: "" },
        receivedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

PaymentSchema.index({ patientId: 1, createdAt: -1 });
PaymentSchema.index({ invoiceId: 1 });

const Payment: Model<IPayment> =
    models.Payment ?? model<IPayment>("Payment", PaymentSchema);

export default Payment;
