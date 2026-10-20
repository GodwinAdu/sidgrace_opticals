import { model, models, Schema, Model } from "mongoose";

/**
 * Default-account mappings used by the posting bridge. Each value is a
 * ChartAccount `code` (stored as a string for stability — codes survive
 * re-seeds and id churn, whereas ObjectIds do not).
 */
const DefaultAccountsSchema = new Schema<IAccountingDefaultAccounts>(
    {
        cash: { type: String, default: "" },
        accountsReceivable: { type: String, default: "" },
        accountsPayable: { type: String, default: "" },
        revenue: { type: String, default: "" },
        expense: { type: String, default: "" },
        insuranceReceivable: { type: String, default: "" },
        inventory: { type: String, default: "" },
        payrollExpense: { type: String, default: "" },

        // Per-category overrides. Each is a plain string→code map whose keys are
        // the income/expense `category` labels the posting bridge passes (e.g.
        // "Consultation", "Procedure", "Payroll"). When a posting's category has
        // a mapping here the bridge posts to that ChartAccount code; otherwise it
        // falls back to the single `revenue`/`expense` default above, then to the
        // seeded system code. Stored as a Mixed map so clinics can add their own
        // categories without a schema change (additive, back-compatible).
        revenueByCategory: { type: Schema.Types.Mixed, default: () => ({}) },
        expenseByCategory: { type: Schema.Types.Mixed, default: () => ({}) },
    },
    { _id: false }
);

/**
 * Singleton accounting settings document. There is exactly one row, keyed
 * `key: "accounting"` (uniquely indexed), that the whole module reads from.
 *
 * It carries the policy knobs the ledger needs:
 *  - `periodValidation` — "strict" requires an open period for a posting date;
 *    "lenient" (default) only blocks dates inside an explicitly CLOSED period.
 *  - `basisDefault` — accrual or cash; stamped onto bridged journal entries.
 *  - `overBudgetMode` — whether an over-budget expense submission warns or is
 *    blocked (default "warn").
 *  - `defaultAccounts` — the ChartAccount codes the compatibility bridge posts
 *    against (cash, revenue, expense, A/R, A/P, …) (R7.3).
 *
 * Settings changes are audited by the action layer (R7.4).
 */
const AccountingSettingsSchema = new Schema<IAccountingSettings>(
    {
        key: { type: String, enum: ["accounting"], default: "accounting", unique: true },
        periodValidation: {
            type: String,
            enum: ["strict", "lenient"],
            default: "lenient",
        },
        basisDefault: {
            type: String,
            enum: ["accrual", "cash"],
            default: "accrual",
        },
        overBudgetMode: {
            type: String,
            enum: ["warn", "block"],
            default: "warn",
        },
        defaultAccounts: { type: DefaultAccountsSchema, default: () => ({}) },
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

const AccountingSettings: Model<IAccountingSettings> =
    models.AccountingSettings ??
    model<IAccountingSettings>("AccountingSettings", AccountingSettingsSchema);

export default AccountingSettings;
