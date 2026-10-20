import { model, models, Schema, Model } from "mongoose";
import { isBalanced, type JournalLineInput } from "@/lib/accounting/ledger";

/**
 * A single embedded journal line. Exactly one of `debit` / `credit` is strictly
 * positive and the other is zero (one-sided). Both default to 0 so partially
 * built drafts remain valid documents; the balancing invariant is enforced on
 * the parent entry at validate time.
 */
const JournalLineSchema = new Schema(
    {
        accountId: { type: Schema.Types.ObjectId, ref: "ChartAccount", required: true },
        debit: { type: Number, default: 0, min: 0 },
        credit: { type: Number, default: 0, min: 0 },
        memo: { type: String, default: "" },
    },
    { _id: false }
);

/**
 * A double-entry journal entry with embedded balanced lines.
 *
 * Lifecycle: draft → posted → reversed. Corrections to a posted entry are made
 * by posting a reversing entry (debits/credits swapped) that links back via
 * `reversalOf`, while the original records `reversedBy` (R2.3, R2.6).
 *
 * Invariants (sum(debit) === sum(credit) > 0, >= 2 lines, every line one-sided)
 * are enforced here at the schema/validate layer by reusing the pure
 * `isBalanced` engine — the same guard the posting action and tests use, so the
 * behaviour can never drift (R2.1). Drafts are exempt because they may still be
 * mid-construction; balance is required the moment an entry is posted/reversed.
 */
const JournalEntrySchema = new Schema<IJournalEntry>(
    {
        // nextSequence("journal-YYYY") assigned by the action layer.
        entryNo: { type: String, required: true, unique: true, trim: true },
        // Posting date, validated against accounting periods at post time.
        date: { type: Date, required: true, default: Date.now },
        memo: { type: String, default: "" },
        status: {
            type: String,
            enum: ["draft", "posted", "reversed"],
            default: "draft",
        },
        // Which basis this entry belongs to.
        basis: {
            type: String,
            enum: ["accrual", "cash"],
            default: "accrual",
        },
        // Where the entry originated.
        source: {
            type: String,
            enum: [
                "manual",
                "payment",
                "invoice",
                "purchase",
                "insurance",
                "payroll",
                "expense",
                "bridge",
            ],
            default: "manual",
        },
        sourceId: { type: Schema.Types.ObjectId, default: null },
        // Set when the entry relates to a vendor (A/P, spend reports).
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
        // Set on a reversing entry → points at the original it reverses.
        reversalOf: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },
        // Set on the original once reversed → points at the reversing entry.
        reversedBy: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },
        lines: { type: [JournalLineSchema], default: [] },
        postedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        postedAt: { type: Date, default: null },
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
 * Enforce the balancing invariant for any entry that is not a draft. Reuses the
 * pure `isBalanced` guard so the schema, the posting action, and the unit tests
 * all agree on what "balanced" means (R2.1). Drafts may be unbalanced while they
 * are being built; the action layer re-checks at post time.
 */
JournalEntrySchema.pre("validate", function () {
    if (this.status && this.status !== "draft") {
        const lines = (this.lines || []) as unknown as JournalLineInput[];
        if (!isBalanced(lines)) {
            throw new Error(
                "Journal entry must be balanced: total debits must equal total credits (> 0), with at least two one-sided lines."
            );
        }
    }
});

JournalEntrySchema.index({ status: 1, date: -1 });
JournalEntrySchema.index({ source: 1, sourceId: 1 });
JournalEntrySchema.index({ vendorId: 1 });

const JournalEntry: Model<IJournalEntry> =
    models.JournalEntry ?? model<IJournalEntry>("JournalEntry", JournalEntrySchema);

export default JournalEntry;
