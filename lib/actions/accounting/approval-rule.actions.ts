"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import ApprovalRule from "../../models/accounting/approval-rule.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";

const RULES_PATH = "/dashboard/account";

/* ═══════════════════════════════ APPROVAL RULES ═══════════════════════════════ */

interface CreateApprovalRuleInput {
    name: string;
    minAmount?: number;
    maxAmount?: number | null;
    approverRoles?: string[];
    steps?: StepInput[];
    isDefault?: boolean;
    isActive?: boolean;
}

/**
 * Normalize caller-supplied rule values into a clean, stored shape: a
 * non-negative `minAmount`, a `maxAmount` that is either a positive number or
 * null (open-ended "and above"), and a trimmed, non-empty ordered list of
 * approver roles.
 */
function normalizeRule(values: {
    minAmount?: number;
    maxAmount?: number | null;
    approverRoles?: string[];
}) {
    const minAmount = Number(values.minAmount);
    const maxRaw = values.maxAmount;
    const maxAmount =
        maxRaw === null || maxRaw === undefined || !Number.isFinite(Number(maxRaw))
            ? null
            : Number(maxRaw);
    const approverRoles = Array.isArray(values.approverRoles)
        ? values.approverRoles.map((r) => String(r).trim()).filter(Boolean)
        : [];
    return {
        minAmount: Number.isFinite(minAmount) && minAmount > 0 ? minAmount : 0,
        maxAmount,
        approverRoles,
    };
}

/** An approver slot as sent from the UI. */
interface StepApproverInput {
    kind: "staff" | "role";
    value: string;
    label?: string;
}

interface StepInput {
    approvers?: StepApproverInput[];
    requiredCount?: number;
}

/**
 * Normalise structured steps from the UI into clean stored steps: each step
 * keeps only valid approvers (a known kind + non-empty value) and a
 * requiredCount clamped into [1, approverCount]. Steps with no valid approver
 * are dropped. Returns [] when no usable steps are supplied.
 */
function normalizeSteps(steps: StepInput[] | undefined) {
    if (!Array.isArray(steps)) return [] as { approvers: StepApproverInput[]; requiredCount: number }[];
    const out: { approvers: StepApproverInput[]; requiredCount: number }[] = [];
    for (const s of steps) {
        const approvers = (s?.approvers ?? [])
            .filter((a) => a && (a.kind === "staff" || a.kind === "role") && String(a.value).trim())
            .map((a) => ({ kind: a.kind, value: String(a.value).trim(), label: (a.label || "").trim() }));
        if (approvers.length === 0) continue;
        let req = Math.floor(Number(s?.requiredCount));
        if (!Number.isFinite(req) || req < 1) req = 1;
        if (req > approvers.length) req = approvers.length;
        out.push({ approvers, requiredCount: req });
    }
    return out;
}

/**
 * Create an approval rule (R6.1). Validates the band (max, when set, must not be
 * below min) and that a chain of approver roles is supplied. Gated by
 * `accountingSettings`; audited.
 */
async function _createApprovalRule(user: User, values: CreateApprovalRuleInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.name || !values.name.trim()) throw new Error("A rule name is required");
        await connectToDB();

        const { minAmount, maxAmount, approverRoles } = normalizeRule(values);
        if (maxAmount !== null && maxAmount < minAmount) {
            throw new Error("The band's maximum amount cannot be below its minimum amount");
        }
        const steps = normalizeSteps(values.steps);
        if (steps.length === 0 && approverRoles.length === 0) {
            throw new Error("An approval rule needs at least one approval step (named staff or a role).");
        }

        const rule = await ApprovalRule.create({
            name: values.name.trim(),
            minAmount,
            maxAmount,
            approverRoles,
            steps,
            isDefault: !!values.isDefault,
            isActive: values.isActive === undefined ? true : !!values.isActive,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "APPROVAL_RULE_CREATED",
            details: { itemId: rule._id, name: rule.name, minAmount, maxAmount },
            message: `${user.fullName} created approval rule ${rule.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: rule._id,
            entityType: "APPROVAL_RULE",
        });

        revalidatePath(RULES_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(rule));
    } catch (error) {
        console.error("Error creating approval rule:", error);
        throw error;
    }
}
export const createApprovalRule = await withAuth(_createApprovalRule, "accountingSettings");

interface UpdateApprovalRuleInput {
    name?: string;
    minAmount?: number;
    maxAmount?: number | null;
    approverRoles?: string[];
    steps?: StepInput[];
    isDefault?: boolean;
    isActive?: boolean;
}

/**
 * Edit an approval rule (R6.1). Only supplied fields change. Changing a rule
 * never retroactively affects in-flight approvals — those carry a frozen chain
 * from their submit time (R6.4). Gated by `accountingSettings`; audited.
 */
async function _updateApprovalRule(user: User, id: string, values: UpdateApprovalRuleInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A rule is required");
        await connectToDB();

        const rule = await ApprovalRule.findById(id);
        if (!rule || rule.del_flag) throw new Error("Approval rule not found");

        if (values.name !== undefined) {
            if (!values.name.trim()) throw new Error("A rule name cannot be empty");
            rule.name = values.name.trim();
        }

        const nextMin = values.minAmount !== undefined ? values.minAmount : rule.minAmount;
        const nextMaxProvided = values.maxAmount !== undefined;
        const normalized = normalizeRule({
            minAmount: nextMin,
            maxAmount: nextMaxProvided ? values.maxAmount : rule.maxAmount,
            approverRoles: values.approverRoles !== undefined ? values.approverRoles : rule.approverRoles,
        });

        if (normalized.maxAmount !== null && normalized.maxAmount < normalized.minAmount) {
            throw new Error("The band's maximum amount cannot be below its minimum amount");
        }
        if (values.approverRoles !== undefined && normalized.approverRoles.length === 0) {
            throw new Error("An approval rule needs at least one approver role in its chain");
        }

        if (values.minAmount !== undefined) rule.minAmount = normalized.minAmount;
        if (nextMaxProvided) rule.maxAmount = normalized.maxAmount;
        if (values.approverRoles !== undefined) rule.approverRoles = normalized.approverRoles;
        if (values.steps !== undefined) {
            rule.steps = normalizeSteps(values.steps) as never;
            rule.markModified("steps");
        }
        if (values.isDefault !== undefined) rule.isDefault = !!values.isDefault;
        if (values.isActive !== undefined) rule.isActive = !!values.isActive;

        rule.mod_flag = true;
        rule.modifiedBy = user._id as never;
        rule.action_type = "updated";
        await rule.save();

        await History.create({
            actionType: "APPROVAL_RULE_UPDATED",
            details: { itemId: rule._id, name: rule.name },
            message: `${user.fullName} updated approval rule ${rule.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: rule._id,
            entityType: "APPROVAL_RULE",
        });

        revalidatePath(RULES_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(rule));
    } catch (error) {
        console.error("Error updating approval rule:", error);
        throw error;
    }
}
export const updateApprovalRule = await withAuth(_updateApprovalRule, "accountingSettings");

/**
 * Delete an approval rule (R6.1). Rules are configuration, not ledger activity,
 * so they can be removed; in-flight approvals already carry a frozen chain and
 * are unaffected (R6.4). Gated by `accountingSettings`; audited.
 */
async function _deleteApprovalRule(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A rule is required");
        await connectToDB();

        const rule = await ApprovalRule.findById(id);
        if (!rule) throw new Error("Approval rule not found");

        const name = rule.name;
        const deletedId = rule._id;
        await ApprovalRule.deleteOne({ _id: rule._id });

        await History.create({
            actionType: "APPROVAL_RULE_DELETED",
            details: { itemId: deletedId, name },
            message: `${user.fullName} deleted approval rule ${name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: deletedId,
            entityType: "APPROVAL_RULE",
        });

        revalidatePath(RULES_PATH);
        if (path) revalidatePath(path);
        return { success: true, message: "Approval rule deleted successfully" };
    } catch (error) {
        console.error("Error deleting approval rule:", error);
        throw error;
    }
}
export const deleteApprovalRule = await withAuth(_deleteApprovalRule, "accountingSettings");

/**
 * List approval rules ordered by threshold (minAmount asc) then name. An
 * optional `activeOnly` filter hides inactive rules. Read-only; gated by
 * `accountingManagement`.
 */
async function _listApprovalRules(user: User, activeOnly?: boolean) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (activeOnly) query.isActive = true;
        const rules = await ApprovalRule.find(query).sort({ minAmount: 1, name: 1 }).lean();
        return JSON.parse(JSON.stringify(rules || []));
    } catch (error) {
        console.error("Error listing approval rules:", error);
        return [];
    }
}
export const listApprovalRules = await withAuth(_listApprovalRules, "accountingManagement");

/**
 * Read a single approval rule. Read-only; gated by `accountingManagement`.
 */
async function _getApprovalRule(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A rule is required");
        await connectToDB();
        const rule = await ApprovalRule.findById(id).lean();
        if (!rule) return null;
        return JSON.parse(JSON.stringify(rule));
    } catch (error) {
        console.error("Error fetching approval rule:", error);
        return null;
    }
}
export const getApprovalRule = await withAuth(_getApprovalRule, "accountingManagement");
