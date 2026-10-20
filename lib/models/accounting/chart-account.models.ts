import { model, models, Schema, Model } from "mongoose";
import { normalBalanceForType, type AccountType } from "@/lib/accounting/coa";

/**
 * Chart of Accounts entry. Each account carries a sortable/hierarchical `code`,
 * an accounting `type`, and a derived `normalBalance` side. The normal balance
 * is NOT client-supplied — it is always derived from `type` on save via the
 * pure `normalBalanceForType` engine, so the two can never drift (R1.1).
 *
 * Guards (enforced in the action layer): a child's `type` must equal its
 * parent's type, and an account with posted ledger activity is deactivated
 * rather than hard-deleted (R1.2).
 */
const ChartAccountSchema = new Schema<IChartAccount>(
    {
        // Unique, sortable code (e.g. "1000"); hierarchical by convention.
        code: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ["asset", "liability", "equity", "revenue", "expense"],
            required: true,
        },
        // Reporting group, e.g. "current-asset", "cogs".
        subtype: { type: String, default: "" },
        // Parent account; a child's type must match the parent's type.
        parentId: { type: Schema.Types.ObjectId, ref: "ChartAccount", default: null },
        // Derived from `type` on save — never trust a client-supplied value.
        normalBalance: {
            type: String,
            enum: ["debit", "credit"],
            default: "debit",
        },
        // Flags cash/bank accounts for cash-flow + cash-basis reporting.
        isCashAccount: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        // Seeded accounts the posting bridge relies on; not deletable.
        isSystem: { type: Boolean, default: false },
        description: { type: String, default: "" },
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

/**
 * Always derive `normalBalance` from `type` using the pure engine so the stored
 * side matches the account type regardless of what the caller passed. Runs on
 * every save/create (R1.1).
 */
ChartAccountSchema.pre("validate", function () {
    if (this.type) {
        this.normalBalance = normalBalanceForType(this.type as AccountType);
    }
});

ChartAccountSchema.index({ type: 1, code: 1 });

const ChartAccount: Model<IChartAccount> =
    models.ChartAccount ?? model<IChartAccount>("ChartAccount", ChartAccountSchema);

export default ChartAccount;
