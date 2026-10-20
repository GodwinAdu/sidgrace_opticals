import { model, models, Schema, Model } from "mongoose";

/**
 * A budget target for one account in one fiscal period (R12.1).
 *
 * `periodNo` is 1..13 for a single period (the same 12 calendar months plus the
 * optional adjustment period 13 used by `AccountingPeriod`), or `null` for a
 * whole-year budget. An optional `departmentId` scopes the budget to a cost
 * center. The unique index on (fiscalYear, periodNo, accountId, departmentId)
 * guarantees a single budget per account+period+department so budget-vs-actual
 * and the over-budget check read one deterministic target.
 *
 * Budget-vs-actual compares `amount` against the actual derived from posted
 * journal entries for the period (R12.2); a missing budget is not an error —
 * the report shows actual-only and the over-budget check is a no-op (R12.4).
 */
const BudgetSchema = new Schema<IBudget>(
    {
        fiscalYear: { type: Number, required: true },
        // null = whole-year budget; otherwise 1..13 (mirrors AccountingPeriod).
        periodNo: { type: Number, min: 1, max: 13, default: null },
        accountId: { type: Schema.Types.ObjectId, ref: "ChartAccount", required: true },
        // Optional cost center / department scope.
        departmentId: { type: Schema.Types.ObjectId, ref: "Department", default: null },
        amount: { type: Number, required: true, min: 0 },
        note: { type: String, default: "" },
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

// One budget per (fiscalYear, periodNo, accountId, departmentId). periodNo null
// (whole-year) and departmentId null (clinic-wide) are distinct, stable keys.
BudgetSchema.index(
    { fiscalYear: 1, periodNo: 1, accountId: 1, departmentId: 1 },
    { unique: true }
);

const Budget: Model<IBudget> =
    models.Budget ?? model<IBudget>("Budget", BudgetSchema);

export default Budget;
