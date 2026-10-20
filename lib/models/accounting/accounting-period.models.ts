import { model, models, Schema, Model } from "mongoose";

/**
 * A fiscal accounting period. A posting date must fall inside an OPEN period
 * (or, in lenient mode, not inside any CLOSED period) for the entry to post.
 * Closing a period is a reopenable soft lock (R2.5, R7.2).
 *
 * `periodNo` runs 1..13 (12 calendar months plus an optional adjustment /
 * year-end period 13).
 */
const AccountingPeriodSchema = new Schema<IAccountingPeriod>(
    {
        fiscalYear: { type: Number, required: true },
        periodNo: { type: Number, required: true, min: 1, max: 13 },
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open",
        },
        closedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        closedAt: { type: Date, default: null },
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

// One period per (fiscalYear, periodNo); range lookups by date.
AccountingPeriodSchema.index({ fiscalYear: 1, periodNo: 1 }, { unique: true });
AccountingPeriodSchema.index({ start: 1, end: 1 });

const AccountingPeriod: Model<IAccountingPeriod> =
    models.AccountingPeriod ?? model<IAccountingPeriod>("AccountingPeriod", AccountingPeriodSchema);

export default AccountingPeriod;
