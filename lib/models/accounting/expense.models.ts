import { model, models, Schema, Model } from "mongoose";

/**
 * One step of an expense's frozen approval chain. The chain is resolved from the
 * active approval rules at submit time (via the pure `resolveApprovalChain`
 * engine) and stored here so later rule changes never affect an in-flight
 * approval (R6.4). A step is "pending" until it carries a `decision`.
 */
const StepApproverSchema = new Schema(
    {
        kind: { type: String, enum: ["staff", "role"], required: true },
        // staffId (as string) when kind="staff"; role name when kind="role".
        value: { type: String, required: true },
        label: { type: String, default: "" },
    },
    { _id: false },
);

const StepDecisionSchema = new Schema(
    {
        approverId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        approverName: { type: String, default: "" },
        decision: { type: String, enum: ["approved", "rejected"], required: true },
        reason: { type: String, default: "" },
        decidedAt: { type: Date, default: Date.now },
    },
    { _id: false },
);

const ApprovalChainStepSchema = new Schema(
    {
        // LEGACY single-role fields (kept so old frozen chains still read). New
        // chains leave these empty and use approvers/requiredCount/decisions.
        role: { type: String, default: "" },
        approverId: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        decision: { type: String, enum: ["approved", "rejected"], default: null },
        reason: { type: String, default: "" },
        decidedAt: { type: Date, default: null },
        // NEW: a step may require a quorum of named-staff/role approvers.
        approvers: { type: [StepApproverSchema], default: [] },
        requiredCount: { type: Number, default: 1, min: 1 },
        decisions: { type: [StepDecisionSchema], default: [] },
    },
    { _id: false }
);

/**
 * An expense with a capture → submit → approve/reject → post lifecycle (R5.1).
 *
 * On capture it is a `draft`. On submit the approval chain is frozen from the
 * active rules for its amount and status becomes `submitted` (R5.2). Each
 * required approver (the next pending role) records a decision; once every step
 * is approved the expense is `approved` and eligible to post (R5.3). A rejection
 * returns it to the submitter with a reason and it does not post (R5.4). Posting
 * builds a balanced journal entry — debit `expenseAccountId`, credit
 * `creditAccountId` (vendor payable or cash) — and links `journalEntryId`
 * (R5.3, R11.5).
 */
const ExpenseSchema = new Schema<IExpense>(
    {
        // nextSequence("expense-YYYY") assigned by the action layer.
        expenseNo: { type: String, required: true, unique: true, trim: true },
        date: { type: Date, required: true, default: Date.now },
        amount: { type: Number, required: true, min: 0 },
        // Debit side — the expense account being charged.
        expenseAccountId: { type: Schema.Types.ObjectId, ref: "ChartAccount", required: true },
        // Credit side — cash or a vendor/A-P payable account.
        creditAccountId: { type: Schema.Types.ObjectId, ref: "ChartAccount", required: true },
        // Optional vendor; drives payable routing + vendor-spend reporting.
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
        payee: { type: String, default: "" },
        description: { type: String, default: "" },
        attachmentUrl: { type: String, default: "" },
        status: {
            type: String,
            enum: ["draft", "submitted", "approved", "rejected", "posted"],
            default: "draft",
        },
        // Frozen from the active rules at submit time (R6.4).
        approvalChain: { type: [ApprovalChainStepSchema], default: [] },
        // Set once posted.
        journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },
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

ExpenseSchema.index({ status: 1, date: -1 });
ExpenseSchema.index({ vendorId: 1 });
ExpenseSchema.index({ "approvalChain.role": 1 });

const Expense: Model<IExpense> =
    models.Expense ?? model<IExpense>("Expense", ExpenseSchema);

export default Expense;
