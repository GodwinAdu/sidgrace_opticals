import { model, models, Schema, Model } from "mongoose";

const TransactionSchema = new Schema<ITransaction>(
    {
        type: { type: String, enum: ["income", "expense"], required: true },
        category: { type: String, required: true, trim: true, default: "General" },
        amount: { type: Number, required: true, min: 0 },
        accountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
        accountName: { type: String, default: "" },
        date: { type: Date, default: Date.now },
        description: { type: String, default: "" },
        method: { type: String, default: "" },
        source: { type: String, enum: ["manual", "payment", "invoice", "purchase", "attendance"], default: "manual" },
        sourceId: { type: Schema.Types.ObjectId, default: null },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
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

TransactionSchema.index({ type: 1, date: -1 });
TransactionSchema.index({ category: 1 });

const Transaction: Model<ITransaction> =
    models.Transaction ?? model<ITransaction>("Transaction", TransactionSchema);

/**
 * The Account schema declares refs to models named "Income" and "Expense".
 * We register those names against the same schema so any populate() of
 * Account.deposits / Account.expenses resolves instead of throwing
 * MissingSchemaError. All three names share the "transactions" collection.
 */
if (!models.Income) model<ITransaction>("Income", TransactionSchema, "transactions");
if (!models.Expense) model<ITransaction>("Expense", TransactionSchema, "transactions");

export default Transaction;
