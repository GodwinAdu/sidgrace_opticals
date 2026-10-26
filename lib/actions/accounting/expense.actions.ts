"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import Expense from "../../models/accounting/expense.models";
import ApprovalRule from "../../models/accounting/approval-rule.models";
import JournalEntry from "../../models/accounting/journal-entry.models";
import AccountingPeriod from "../../models/accounting/accounting-period.models";
import History from "../../models/history.models";
import Staff from "../../models/staff.models";
import { User, withAuth } from "../../helpers/auth";
import { nextSequence } from "../../models/counter.models";
import {
    resolveApprovalChain,
    nextPendingRole,
    isFullyApproved,
    resolveApprovalSteps,
    nextPendingStepIndex,
    canUserActOnStep,
    hasUserDecided,
    isStepSatisfied,
    isChainFullyApproved,
    type ApprovalRule as PureApprovalRule,
    type MultiApprovalRule,
    type ApprovalChainStep,
    type ChainStep,
    type ActingUser,
} from "../../accounting/approvals";
import { isBalanced, type JournalLineInput } from "../../accounting/ledger";
import { checkOverBudgetInternal, type BudgetPeriod } from "./budget.actions";

const EXPENSE_PATH = "/dashboard/account/expense-workflow";
const LEDGER_PATH = "/dashboard/account/account-list";

/**
 * Allocate the next human-readable expense number for the current year from the
 * shared counter: EXP-YYYY-00005. Assigned once at capture and never reused.
 */
async function generateExpenseNo(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`expense-${year}`);
    return `EXP-${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * Find the fiscal period whose [start, end] range covers a date, so posting can
 * be blocked when that period is closed (R5.6, mirrors the journal-entry path).
 */
async function findPeriodForDate(date: Date) {
    return AccountingPeriod.findOne({
        del_flag: false,
        start: { $lte: date },
        end: { $gte: date },
    });
}

/* ══════════════════════════════════ CAPTURE ══════════════════════════════════ */

interface CaptureExpenseInput {
    date?: Date | string;
    amount: number;
    expenseAccountId: string;
    creditAccountId: string;
    vendorId?: string | null;
    payee?: string;
    description?: string;
    attachmentUrl?: string;
}

/**
 * Capture a draft expense (R5.1). Validates the amount and the two posting
 * accounts (debit expense + credit cash/payable) up front, mints a stable
 * `expenseNo`, and leaves the expense in `draft` with an empty approval chain —
 * the chain is only frozen at submit time. Gated by `accountingManagement`;
 * audited.
 */
async function _capture(user: User, values: CaptureExpenseInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const amount = Number(values?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("An expense needs a positive amount");
        }
        if (!values?.expenseAccountId) throw new Error("An expense account (debit side) is required");
        if (!values?.creditAccountId) throw new Error("A credit account (cash or payable) is required");

        const date = values.date ? new Date(values.date) : new Date();
        if (Number.isNaN(date.getTime())) throw new Error("Invalid expense date");

        const expenseNo = await generateExpenseNo();
        const expense = await Expense.create({
            expenseNo,
            date,
            amount,
            expenseAccountId: values.expenseAccountId,
            creditAccountId: values.creditAccountId,
            vendorId: values.vendorId || null,
            payee: values.payee?.trim() || "",
            description: values.description?.trim() || "",
            attachmentUrl: values.attachmentUrl?.trim() || "",
            status: "draft",
            approvalChain: [],
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "EXPENSE_CAPTURED",
            details: { itemId: expense._id, expenseNo, amount },
            message: `${user.fullName} captured expense ${expenseNo} for ${amount} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: expense._id,
            entityType: "EXPENSE",
        });

        revalidatePath(EXPENSE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(expense));
    } catch (error) {
        console.error("Error capturing expense:", error);
        throw error;
    }
}
export const capture = await withAuth(_capture, "accountingManagement");

/* ══════════════════════════════════ SUBMIT ══════════════════════════════════ */

/**
 * Submit a draft expense for approval (R5.2). The approval chain is RESOLVED and
 * FROZEN here from the active rules for the expense amount using the pure
 * `resolveApprovalChain` engine, then stored on the expense as ordered,
 * un-decided steps — so later rule changes never affect this in-flight approval
 * (R6.4). The status becomes `submitted`. When no rule (and no default) applies,
 * the chain is empty and the submission is rejected rather than silently
 * allowing an unapproved post (R6.3). Gated by `accountingManagement`; audited.
 */
async function _submit(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An expense is required");
        await connectToDB();

        const expense = await Expense.findById(id);
        if (!expense || expense.del_flag) throw new Error("Expense not found");
        if (expense.status !== "draft" && expense.status !== "rejected") {
            throw new Error("Only a draft or rejected expense can be submitted for approval");
        }

        // ── Over-budget hook (R12.3, R12.4) ───────────────────────────────────
        // Derive the fiscal period from the expense date and ask whether posting
        // this amount to the expense account would push it over its budget. The
        // mode comes from AccountingSettings.overBudgetMode (default "warn"):
        //   - "block": over budget → refuse the submission.
        //   - "warn":  over budget → allow, but return a warning.
        // A missing budget is a no-op (not over budget), so budget-free expenses
        // submit exactly as before and the existing behaviour is unchanged.
        const warnings: string[] = [];
        const expenseDate = expense.date ? new Date(expense.date) : new Date();
        const budgetPeriod: BudgetPeriod = {
            fiscalYear: expenseDate.getFullYear(),
            periodNo: expenseDate.getMonth() + 1,
        };
        const overBudget = await checkOverBudgetInternal(
            String(expense.expenseAccountId),
            budgetPeriod,
            Number(expense.amount) || 0,
        );
        if (overBudget.overBudget) {
            const message =
                `This expense pushes the account over its budget for the period ` +
                `(budget ${overBudget.budget}, actual ${overBudget.actual}, projected ${overBudget.projected}).`;
            if (overBudget.mode === "block") {
                throw new Error(
                    `${message} The over-budget policy is set to block, so this expense cannot be submitted.`,
                );
            }
            warnings.push(message);
        }

        // Resolve + freeze the STRUCTURED steps from the ACTIVE rules for this
        // amount. resolveApprovalSteps handles both new step-based rules (named
        // staff / roles + quorum) and legacy role-only rules (each role becomes a
        // 1-of-1 step), so old rules keep working unchanged (R6.4).
        const rules = (await ApprovalRule.find({ del_flag: false, isActive: true }).lean()) as unknown as MultiApprovalRule[];
        const resolvedSteps = resolveApprovalSteps(expense.amount, rules);
        if (!resolvedSteps || resolvedSteps.length === 0) {
            throw new Error(
                "No approval rule (or default) applies to this expense amount — configure an approval rule before submitting.",
            );
        }

        // Resolve display labels for any named-staff approvers so the inbox/chain
        // can show names without extra lookups. Roles use their own name.
        const staffIds = Array.from(
            new Set(
                resolvedSteps.flatMap((s) =>
                    s.approvers.filter((a) => a.kind === "staff").map((a) => String(a.value)),
                ),
            ),
        );
        const staffDocs = staffIds.length
            ? await Staff.find({ _id: { $in: staffIds } }).select("fullName").lean()
            : [];
        const nameById = new Map(staffDocs.map((s) => [String(s._id), s.fullName]));

        expense.approvalChain = resolvedSteps.map((step) => ({
            approvers: step.approvers.map((a) => ({
                kind: a.kind,
                value: a.value,
                label: a.kind === "staff" ? nameById.get(String(a.value)) || a.label || "" : a.label || a.value,
            })),
            requiredCount: step.requiredCount,
            decisions: [],
            // Leave legacy single-role fields empty for new chains.
            role: "",
            approverId: null,
            decision: null,
            reason: "",
            decidedAt: null,
        })) as never;
        expense.status = "submitted";
        expense.mod_flag = true;
        expense.modifiedBy = user._id as never;
        expense.action_type = "updated";
        await expense.save();

        await History.create({
            actionType: "EXPENSE_SUBMITTED",
            details: {
                itemId: expense._id,
                expenseNo: expense.expenseNo,
                steps: resolvedSteps.map((s) => ({
                    approvers: s.approvers.map((a) => a.label || a.value),
                    requiredCount: s.requiredCount,
                })),
            },
            message: `${user.fullName} submitted expense ${expense.expenseNo} for approval on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: expense._id,
            entityType: "EXPENSE",
        });

        revalidatePath(EXPENSE_PATH);
        if (path) revalidatePath(path);
        // Preserve the existing shape (the serialized expense) and attach any
        // over-budget warnings alongside it so warn-mode callers can surface
        // them without the submission being blocked.
        const result = JSON.parse(JSON.stringify(expense));
        result.warnings = warnings;
        return result;
    } catch (error) {
        console.error("Error submitting expense:", error);
        throw error;
    }
}
export const submit = await withAuth(_submit, "accountingManagement");

/* ═════════════════════════════ APPROVE / REJECT ═════════════════════════════ */

/**
 * The acting user's role name. The approval chain stores role NAMES (the same
 * strings used in `ApprovalRule.approverRoles`), and `user.role` is the role
 * name on the authenticated staff record, so the two compare directly.
 */
function actingRole(user: User): string {
    return String((user as { role?: string })?.role || "");
}

/** A step is "new style" when it carries an explicit approver list. */
function isNewStyleStep(step: Record<string, unknown>): boolean {
    const approvers = step?.approvers as unknown[] | undefined;
    return Array.isArray(approvers) && approvers.length > 0;
}

type DecisionKind = "approved" | "rejected";

interface DecisionOutcome {
    stepLabel: string;
    fullyApproved: boolean;
    rejected: boolean;
}

/**
 * Record one approver decision against the first unsatisfied step of the frozen
 * chain, enforcing gating server-side. Handles new quorum/named-staff steps AND
 * legacy single-role steps so old frozen chains keep working.
 */
function recordDecision(
    expense: { approvalChain?: unknown[] },
    user: User,
    kind: DecisionKind,
    reason: string,
): DecisionOutcome {
    const rawChain = (expense.approvalChain || []) as Record<string, unknown>[];
    if (rawChain.length === 0) throw new Error("This expense has no approval chain");

    const staffId = String((user as { _id?: unknown })._id || "");
    const role = actingRole(user);
    const acting: ActingUser = { staffId, role };

    let targetIndex = -1;
    for (let i = 0; i < rawChain.length; i++) {
        const step = rawChain[i];
        const satisfied = isNewStyleStep(step)
            ? isStepSatisfied(step as unknown as ChainStep)
            : Boolean((step as { decision?: unknown }).decision);
        if (!satisfied) { targetIndex = i; break; }
    }
    if (targetIndex < 0) throw new Error("This expense has no pending approval step");

    const step = rawChain[targetIndex];

    if (isNewStyleStep(step)) {
        const typed = step as unknown as ChainStep;
        if (!canUserActOnStep(typed, acting)) {
            throw new Error(
                "You are not an approver for the current step of this expense.",
            );
        }
        if (hasUserDecided(typed, acting)) {
            throw new Error("You have already recorded a decision on this step.");
        }
        if (!Array.isArray(typed.decisions)) typed.decisions = [];
        typed.decisions.push({
            approverId: staffId,
            approverName: String((user as { fullName?: string }).fullName || ""),
            decision: kind,
            reason: kind === "rejected" ? reason : "",
            decidedAt: new Date(),
        });
    } else {
        const stepRole = String((step as { role?: string }).role || "");
        if (!stepRole || role !== stepRole) {
            throw new Error(
                "You are not the next required approver for this expense.",
            );
        }
        (step as Record<string, unknown>).approverId = (user as { _id?: unknown })._id;
        (step as Record<string, unknown>).decision = kind;
        (step as Record<string, unknown>).reason = kind === "rejected" ? reason : "";
        (step as Record<string, unknown>).decidedAt = new Date();
    }

    const rejected = rawChain.some((s) =>
        isNewStyleStep(s)
            ? ((s as unknown as ChainStep).decisions || []).some((d) => d.decision === "rejected")
            : (s as { decision?: string }).decision === "rejected",
    );
    const fullyApproved =
        !rejected &&
        rawChain.every((s) =>
            isNewStyleStep(s)
                ? isStepSatisfied(s as unknown as ChainStep)
                : (s as { decision?: string }).decision === "approved",
        );

    const stepLabel = isNewStyleStep(step)
        ? (step as unknown as ChainStep).approvers.map((a) => a.label || a.value).join(", ")
        : String((step as { role?: string }).role || "");

    return { stepLabel, fullyApproved, rejected };
}

/**
 * Approve the current step of a submitted expense (R5.3, R5.5). The server
 * ENFORCES that the acting user's role is the NEXT pending role in the frozen
 * chain (via the pure `nextPendingRole`) — a user whose role is not next, or who
 * tries to approve out of order, is denied regardless of UI. The decision is
 * recorded on that step; once every step is approved (`isFullyApproved`) the
 * expense becomes `approved` and is eligible to post. Also requires the
 * `accountingApprove` permission (enforced by `withAuth`). Audited.
 */
async function _approve(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An expense is required");
        await connectToDB();

        const expense = await Expense.findById(id);
        if (!expense || expense.del_flag) throw new Error("Expense not found");
        if (expense.status !== "submitted") {
            throw new Error("Only a submitted expense awaiting approval can be approved");
        }

        const outcome = recordDecision(expense as unknown as { approvalChain?: unknown[] }, user, "approved", "");
        expense.markModified("approvalChain");
        const pending = outcome.stepLabel;
        const fullyApproved = outcome.fullyApproved;
        if (fullyApproved) expense.status = "approved";

        expense.mod_flag = true;
        expense.modifiedBy = user._id as never;
        expense.action_type = "updated";
        await expense.save();

        await History.create({
            actionType: "EXPENSE_APPROVED",
            details: {
                itemId: expense._id,
                expenseNo: expense.expenseNo,
                role: pending,
                fullyApproved,
            },
            message: `${user.fullName} approved expense ${expense.expenseNo} as ${pending} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: expense._id,
            entityType: "EXPENSE",
        });

        revalidatePath(EXPENSE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(expense));
    } catch (error) {
        console.error("Error approving expense:", error);
        throw error;
    }
}
export const approve = await withAuth(_approve, "accountingApprove");

/**
 * Reject the current step of a submitted expense (R5.4). Like approval, the
 * server ENFORCES that the acting user's role is the next pending role in the
 * frozen chain. A rejection records the reason on the step and sets the expense
 * status to `rejected`, returning it to the submitter; a rejected expense does
 * NOT post. Requires `accountingApprove` (enforced by `withAuth`). Audited.
 */
async function _reject(user: User, id: string, reason?: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An expense is required");
        await connectToDB();

        const expense = await Expense.findById(id);
        if (!expense || expense.del_flag) throw new Error("Expense not found");
        if (expense.status !== "submitted") {
            throw new Error("Only a submitted expense awaiting approval can be rejected");
        }

        const rejReason = reason?.trim() || "";
        const outcome = recordDecision(expense as unknown as { approvalChain?: unknown[] }, user, "rejected", rejReason);
        expense.markModified("approvalChain");
        const pending = outcome.stepLabel;

        expense.status = "rejected";
        expense.mod_flag = true;
        expense.modifiedBy = user._id as never;
        expense.action_type = "updated";
        await expense.save();

        await History.create({
            actionType: "EXPENSE_REJECTED",
            details: {
                itemId: expense._id,
                expenseNo: expense.expenseNo,
                role: pending,
                reason: rejReason,
            },
            message: `${user.fullName} rejected expense ${expense.expenseNo} as ${pending} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: expense._id,
            entityType: "EXPENSE",
        });

        revalidatePath(EXPENSE_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(expense));
    } catch (error) {
        console.error("Error rejecting expense:", error);
        throw error;
    }
}
export const reject = await withAuth(_reject, "accountingApprove");

/* ══════════════════════════════════ POST ══════════════════════════════════ */

/**
 * Post an approved expense to the ledger (R5.3, R5.6, R11.5). This is only
 * permitted when the expense is fully `approved`. It builds a balanced journal
 * entry — debit `expenseAccountId`, credit `creditAccountId` (a vendor payable
 * or cash account) for the expense amount — validates balance with the pure
 * `isBalanced` guard, and blocks the post when the expense date falls inside a
 * CLOSED period (a reopenable soft lock). On success the journal entry is
 * created already `posted`, the expense status becomes `posted`, and
 * `journalEntryId` is linked. The entry carries the expense's `vendorId` so
 * vendor spend is reportable (R11.2). Gated by `accountingPost`; audited.
 */
async function _post(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An expense is required");
        await connectToDB();

        const expense = await Expense.findById(id);
        if (!expense || expense.del_flag) throw new Error("Expense not found");
        if (expense.status === "posted") throw new Error("This expense is already posted");
        if (expense.status !== "approved") {
            throw new Error("Only a fully approved expense can be posted to the ledger");
        }

        const amount = Number(expense.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("The expense amount must be positive to post");
        }

        // Block posting into a closed period (R5.6).
        const period = await findPeriodForDate(expense.date);
        if (period && period.status === "closed") {
            throw new Error(
                "The expense date falls in a closed accounting period. Reopen the period before posting.",
            );
        }

        // Build the balanced lines: debit expense, credit cash/payable.
        const lines = [
            { accountId: expense.expenseAccountId, debit: amount, credit: 0, memo: expense.payee || "" },
            { accountId: expense.creditAccountId, debit: 0, credit: amount, memo: expense.payee || "" },
        ];
        if (!isBalanced(lines as unknown as JournalLineInput[])) {
            throw new Error(
                "Expense posting is not balanced: debit expense must equal credit cash/payable (> 0).",
            );
        }

        const year = new Date().getFullYear();
        const seq = await nextSequence(`journal-${year}`);
        const entryNo = `JE-${year}-${String(seq).padStart(5, "0")}`;

        const entry = await JournalEntry.create({
            entryNo,
            date: expense.date,
            memo: expense.description || `Expense ${expense.expenseNo}`,
            status: "posted",
            basis: "accrual",
            source: "expense",
            sourceId: expense._id,
            vendorId: expense.vendorId || null,
            lines,
            postedBy: user._id,
            postedAt: new Date(),
            createdBy: user._id,
            action_type: "created",
        });

        expense.status = "posted";
        expense.journalEntryId = entry._id as never;
        expense.mod_flag = true;
        expense.modifiedBy = user._id as never;
        expense.action_type = "updated";
        await expense.save();

        await History.create({
            actionType: "EXPENSE_POSTED",
            details: {
                itemId: expense._id,
                expenseNo: expense.expenseNo,
                journalEntryId: entry._id,
                entryNo,
                amount,
            },
            message: `${user.fullName} posted expense ${expense.expenseNo} as journal entry ${entryNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: expense._id,
            entityType: "EXPENSE",
        });

        revalidatePath(EXPENSE_PATH);
        revalidatePath(LEDGER_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(expense));
    } catch (error) {
        console.error("Error posting expense:", error);
        throw error;
    }
}
export const post = await withAuth(_post, "accountingPost");

/* ══════════════════════════════════ READS ══════════════════════════════════ */

interface ListExpenseInput {
    status?: IExpense["status"] | "all";
    vendorId?: string;
    from?: Date | string;
    to?: Date | string;
    limit?: number;
}

/**
 * List expenses newest-first, optionally filtered by status, vendor, and a date
 * range. Read-only; gated by `accountingManagement`.
 */
async function _list(user: User, filter?: ListExpenseInput) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const query: Record<string, unknown> = { del_flag: false };
        if (filter?.status && filter.status !== "all") query.status = filter.status;
        if (filter?.vendorId) query.vendorId = filter.vendorId;
        if (filter?.from || filter?.to) {
            const range: Record<string, Date> = {};
            if (filter.from) range.$gte = new Date(filter.from);
            if (filter.to) range.$lte = new Date(filter.to);
            query.date = range;
        }

        const limit = Math.min(Math.max(Number(filter?.limit) || 200, 1), 500);
        const expenses = await Expense.find(query)
            .populate("expenseAccountId", "code name type")
            .populate("creditAccountId", "code name type")
            .populate("vendorId", "name")
            .sort({ date: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(expenses || []));
    } catch (error) {
        console.error("Error listing expenses:", error);
        return [];
    }
}
export const list = await withAuth(_list, "accountingManagement");

/**
 * Read a single expense with its accounts, vendor, and journal entry populated.
 * Read-only; gated by `accountingManagement`.
 */
async function _get(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An expense is required");
        await connectToDB();

        const expense = await Expense.findById(id)
            .populate("expenseAccountId", "code name type")
            .populate("creditAccountId", "code name type")
            .populate("vendorId", "name payableAccountId")
            .populate("journalEntryId", "entryNo status date")
            .lean();
        if (!expense) return null;
        return JSON.parse(JSON.stringify(expense));
    } catch (error) {
        console.error("Error fetching expense:", error);
        return null;
    }
}
export const get = await withAuth(_get, "accountingManagement");
