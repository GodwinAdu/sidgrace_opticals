import { model, models, Schema, Model } from "mongoose";

/**
 * A configurable expense-approval rule (R6.1). Each rule maps an amount band to
 * an ordered chain of approver roles required in sequence. `maxAmount` of null
 * means the band is open-ended at the top ("and above"). `isDefault` flags the
 * fallback rule applied when no band contains an amount (R6.3).
 *
 * The pure `resolveApprovalChain` engine (lib/accounting/approvals.ts) consumes
 * these rules to produce the deterministic chain that is FROZEN onto an expense
 * at submit time, so later rule changes never affect in-flight approvals (R6.4).
 */
const ApprovalRuleSchema = new Schema<IApprovalRule>(
    {
        name: { type: String, required: true, trim: true },
        // Lower bound of the band (inclusive).
        minAmount: { type: Number, default: 0, min: 0 },
        // Upper bound of the band (inclusive); null = open-ended ("and above").
        maxAmount: { type: Number, default: null },
        // Ordered chain of role names required in sequence.
        approverRoles: { type: [String], default: [] },
        // NEW: structured ordered steps. Each step lists approvers (a named
        // staff member or a role) and a quorum (requiredCount) of them that must
        // approve before the step passes. When present, steps wins over
        // approverRoles.
        steps: {
            type: [
                new Schema(
                    {
                        approvers: {
                            type: [
                                new Schema(
                                    {
                                        kind: { type: String, enum: ["staff", "role"], required: true },
                                        value: { type: String, required: true, trim: true },
                                        label: { type: String, default: "" },
                                    },
                                    { _id: false },
                                ),
                            ],
                            default: [],
                        },
                        requiredCount: { type: Number, default: 1, min: 1 },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        // Fallback rule used when no band matches an amount.
        isDefault: { type: Boolean, default: false },
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

ApprovalRuleSchema.index({ isActive: 1, minAmount: 1 });
ApprovalRuleSchema.index({ isDefault: 1 });

const ApprovalRule: Model<IApprovalRule> =
    models.ApprovalRule ?? model<IApprovalRule>("ApprovalRule", ApprovalRuleSchema);

export default ApprovalRule;
