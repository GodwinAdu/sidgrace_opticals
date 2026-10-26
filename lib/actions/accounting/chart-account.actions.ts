"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import ChartAccount from "../../models/accounting/chart-account.models";
import JournalEntry from "../../models/accounting/journal-entry.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";
import {
    DEFAULT_CHART,
    validateParentType,
    validateCodeType,
    type AccountType,
} from "../../accounting/coa";

const CHART_PATH = "/dashboard/account/account-list";

type ChartAccountDoc = IChartAccount & { _id: unknown };

/* ══════════════════════════════ CHART OF ACCOUNTS ══════════════════════════════ */

interface CreateChartAccountInput {
    code: string;
    name: string;
    type: AccountType;
    subtype?: string;
    parentId?: string | null;
    isCashAccount?: boolean;
    description?: string;
}

/**
 * Create a Chart of Accounts entry (R1.1). The code must be unique and, when a
 * parent is supplied, the child's type must equal the parent's type (R1.5). The
 * `normalBalance` is NOT accepted from the caller — the model derives it from
 * `type` on validate, so the stored side can never drift. Gated by
 * `accountingSettings`; every create is audited.
 */
async function _createChartAccount(user: User, values: CreateChartAccountInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.code || !values.code.trim()) throw new Error("An account code is required");
        if (!values?.name || !values.name.trim()) throw new Error("An account name is required");
        if (!values?.type) throw new Error("An account type is required");
        await connectToDB();

        const code = values.code.trim();

        // Reject duplicate codes up front with a clear message.
        const existing = await ChartAccount.findOne({ code });
        if (existing) throw new Error(`An account with code ${code} already exists`);

        // Enforce the parent/child type rule (R1.5).
        let parentId: string | null = null;
        if (values.parentId) {
            const parent = await ChartAccount.findById(values.parentId);
            if (!parent) throw new Error("Parent account not found");
            if (!validateParentType(values.type, parent.type as AccountType)) {
                throw new Error(
                    `A ${values.type} account cannot be nested under a ${parent.type} parent — a child's type must match its parent's type`
                );
            }
            parentId = String(parent._id);
        }

        // Guard report accuracy: a code's leading digit must agree with its type
        // (1=asset, 2=liability, 3=equity, 4=revenue, 5/6=expense). Statements
        // route accounts purely by their type, so a mismatched code is almost
        // a miscategorised account that would land in the wrong report. Unknown
        // prefixes are allowed (custom numbering), so this only blocks genuine
        // 1-6 conflicts.
        const codeTypeCheck = validateCodeType(code, values.type);
        if (!codeTypeCheck.ok) {
            throw new Error(codeTypeCheck.message);
        }

        const account = await ChartAccount.create({
            code,
            name: values.name.trim(),
            type: values.type,
            subtype: values.subtype?.trim() || "",
            parentId,
            isCashAccount: !!values.isCashAccount,
            isActive: true,
            isSystem: false,
            description: values.description?.trim() || "",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "CHART_ACCOUNT_CREATED",
            details: { itemId: account._id, code: account.code, type: account.type },
            message: `${user.fullName} created account ${account.code} — ${account.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: account._id,
            entityType: "CHART_ACCOUNT",
        });

        revalidatePath(CHART_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(account));
    } catch (error) {
        console.error("Error creating chart account:", error);
        throw error;
    }
}
export const createChartAccount = await withAuth(_createChartAccount, "accountingSettings");

interface UpdateChartAccountInput {
    name?: string;
    subtype?: string;
    parentId?: string | null;
    isCashAccount?: boolean;
    description?: string;
}

/**
 * Edit a Chart of Accounts entry's descriptive fields and parent. The account
 * `type` and `code` are intentionally not editable here — changing a posted
 * account's type/code would silently reclassify historical ledger activity. If
 * a parent is (re)assigned, the type-match rule is re-enforced (R1.5). Gated by
 * `accountingSettings`; audited.
 */
async function _updateChartAccount(user: User, id: string, values: UpdateChartAccountInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An account is required");
        await connectToDB();

        const account = await ChartAccount.findById(id);
        if (!account) throw new Error("Account not found");

        if (values.name !== undefined) {
            if (!values.name.trim()) throw new Error("An account name cannot be empty");
            account.name = values.name.trim();
        }
        if (values.subtype !== undefined) account.subtype = values.subtype.trim();
        if (values.isCashAccount !== undefined) account.isCashAccount = !!values.isCashAccount;
        if (values.description !== undefined) account.description = values.description.trim();

        if (values.parentId !== undefined) {
            if (!values.parentId) {
                account.parentId = null;
            } else {
                if (String(values.parentId) === String(account._id)) {
                    throw new Error("An account cannot be its own parent");
                }
                const parent = await ChartAccount.findById(values.parentId);
                if (!parent) throw new Error("Parent account not found");
                if (!validateParentType(account.type as AccountType, parent.type as AccountType)) {
                    throw new Error(
                        `A ${account.type} account cannot be nested under a ${parent.type} parent — a child's type must match its parent's type`
                    );
                }
                account.parentId = parent._id as never;
            }
        }

        account.mod_flag = true;
        account.modifiedBy = user._id as never;
        account.action_type = "updated";
        await account.save();

        await History.create({
            actionType: "CHART_ACCOUNT_UPDATED",
            details: { itemId: account._id, code: account.code },
            message: `${user.fullName} updated account ${account.code} — ${account.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: account._id,
            entityType: "CHART_ACCOUNT",
        });

        revalidatePath(CHART_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(account));
    } catch (error) {
        console.error("Error updating chart account:", error);
        throw error;
    }
}
export const updateChartAccount = await withAuth(_updateChartAccount, "accountingSettings");

/**
 * Deactivate an account (R1.2). This is the safe alternative to deletion: the
 * account keeps all of its history and ledger linkage but is hidden from pickers
 * and new postings. Reactivation flips `isActive` back on. Gated by
 * `accountingSettings`; audited.
 */
async function _setChartAccountActive(user: User, id: string, isActive: boolean, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An account is required");
        await connectToDB();

        const account = await ChartAccount.findById(id);
        if (!account) throw new Error("Account not found");

        account.isActive = !!isActive;
        account.mod_flag = true;
        account.modifiedBy = user._id as never;
        account.action_type = "updated";
        await account.save();

        await History.create({
            actionType: "CHART_ACCOUNT_DEACTIVATED",
            details: { itemId: account._id, code: account.code, isActive: account.isActive },
            message: `${user.fullName} ${isActive ? "activated" : "deactivated"} account ${account.code} — ${account.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: account._id,
            entityType: "CHART_ACCOUNT",
        });

        revalidatePath(CHART_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(account));
    } catch (error) {
        console.error("Error changing chart account active state:", error);
        throw error;
    }
}
export const setChartAccountActive = await withAuth(_setChartAccountActive, "accountingSettings");

/** Convenience wrapper: deactivate an account (R1.2). Gated `accountingSettings`. */
async function _deactivateChartAccount(user: User, id: string, path?: string) {
    return _setChartAccountActive(user, id, false, path);
}
export const deactivateChartAccount = await withAuth(_deactivateChartAccount, "accountingSettings");

/**
 * True when an account is referenced by any posted or reversed journal entry
 * line. Posted activity means the account is part of the permanent ledger and
 * must never be hard-deleted (R1.2) — only deactivated. Drafts don't count: an
 * unposted draft can still be reassigned before it ever hits the ledger.
 */
async function hasPostedActivity(accountId: string): Promise<boolean> {
    const count = await JournalEntry.countDocuments({
        status: { $in: ["posted", "reversed"] },
        "lines.accountId": accountId,
    });
    return count > 0;
}

/**
 * Hard-delete an account, guarded (R1.2). Deletion is blocked when:
 *  - the account is a seeded system account the posting bridge relies on, or
 *  - the account has any posted/reversed ledger activity.
 * In both cases the caller is instructed to deactivate instead. Gated by
 * `accountingSettings`; audited.
 */
async function _deleteChartAccount(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("An account is required");
        await connectToDB();

        const account = await ChartAccount.findById(id);
        if (!account) throw new Error("Account not found");

        if (account.isSystem) {
            throw new Error(
                `${account.code} — ${account.name} is a system account required by the posting bridge and cannot be deleted. Deactivate it instead.`
            );
        }

        if (await hasPostedActivity(String(account._id))) {
            throw new Error(
                `${account.code} — ${account.name} has posted ledger activity and cannot be deleted. Deactivate it instead.`
            );
        }

        // No posted activity and not a system account — safe to remove.
        const code = account.code;
        const name = account.name;
        const deletedId = account._id;
        await ChartAccount.deleteOne({ _id: account._id });

        await History.create({
            actionType: "CHART_ACCOUNT_DELETED",
            details: { itemId: deletedId, code },
            message: `${user.fullName} deleted account ${code} — ${name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: deletedId,
            entityType: "CHART_ACCOUNT",
        });

        revalidatePath(CHART_PATH);
        if (path) revalidatePath(path);
        return { success: true, message: "Account deleted successfully" };
    } catch (error) {
        console.error("Error deleting chart account:", error);
        throw error;
    }
}
export const deleteChartAccount = await withAuth(_deleteChartAccount, "accountingSettings");

/**
 * List accounts ordered by type then code (R1.3). An optional `activeOnly`
 * filter hides deactivated accounts for pickers. Read-only; gated by
 * `accountingManagement`.
 */
async function _listChartAccounts(user: User, activeOnly?: boolean) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = {};
        if (activeOnly) query.isActive = true;
        const accounts = await ChartAccount.find(query)
            .sort({ type: 1, code: 1 })
            .lean();
        return JSON.parse(JSON.stringify(accounts || []));
    } catch (error) {
        console.error("Error listing chart accounts:", error);
        return [];
    }
}
export const listChartAccounts = await withAuth(_listChartAccounts, "accountingManagement");

interface ChartAccountNode extends Record<string, unknown> {
    _id: string;
    code: string;
    name: string;
    type: string;
    parentId?: string | null;
    children: ChartAccountNode[];
}

/**
 * Read the chart as a hierarchy: accounts grouped under their parents, each
 * level ordered by type then code (R1.3). Top-level nodes are those without a
 * parent (or whose parent is missing); every other account is attached beneath
 * its parent. Read-only; gated by `accountingManagement`.
 */
async function _getChartAccountHierarchy(user: User, activeOnly?: boolean) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = {};
        if (activeOnly) query.isActive = true;
        const accounts = (await ChartAccount.find(query)
            .sort({ type: 1, code: 1 })
            .lean()) as unknown as ChartAccountDoc[];

        // Build nodes keyed by id, preserving the type/code sort order.
        const nodes = new Map<string, ChartAccountNode>();
        for (const acc of accounts) {
            const id = String(acc._id);
            nodes.set(id, {
                ...(JSON.parse(JSON.stringify(acc)) as Record<string, unknown>),
                _id: id,
                code: acc.code,
                name: acc.name,
                type: acc.type as string,
                parentId: acc.parentId ? String(acc.parentId) : null,
                children: [],
            });
        }

        const roots: ChartAccountNode[] = [];
        for (const node of nodes.values()) {
            const parentId = node.parentId;
            const parent = parentId ? nodes.get(parentId) : undefined;
            if (parent) parent.children.push(node);
            else roots.push(node);
        }

        return JSON.parse(JSON.stringify(roots));
    } catch (error) {
        console.error("Error building chart account hierarchy:", error);
        return [];
    }
}
export const getChartAccountHierarchy = await withAuth(_getChartAccountHierarchy, "accountingManagement");

/* ══════════════════════════════════ SEED ══════════════════════════════════ */

/**
 * Idempotently seed the default clinic/professional Chart of Accounts (R1.4).
 * Each entry in `DEFAULT_CHART` is upserted by its unique `code`, so re-running
 * the seed never creates duplicates — it only inserts the accounts that are
 * missing and leaves existing ones untouched. `normalBalance` is derived by the
 * model on validate, so it is never written here. Gated by `accountingSettings`;
 * a single audit record summarizes the run.
 */
async function _seedDefaultChart(user: User, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        let inserted = 0;
        for (const seed of DEFAULT_CHART) {
            // $setOnInsert so re-runs are no-ops for accounts that already exist
            // (idempotent upsert by unique code — R1.4).
            const res = await ChartAccount.updateOne(
                { code: seed.code },
                {
                    $setOnInsert: {
                        code: seed.code,
                        name: seed.name,
                        type: seed.type,
                        subtype: seed.subtype || "",
                        isCashAccount: !!seed.isCash,
                        isSystem: !!seed.isSystem,
                        isActive: true,
                        parentId: null,
                        createdBy: user._id,
                        action_type: "created",
                    },
                },
                { upsert: true }
            );
            if (res.upsertedCount && res.upsertedCount > 0) inserted += 1;
        }

        // The model's pre-validate hook derives normalBalance; updateOne upserts
        // skip that hook, so backfill the derived side for any freshly inserted
        // (or legacy) rows that lack it. Done via the pure engine indirectly by
        // re-saving through the model keeps a single source of truth.
        if (inserted > 0) {
            const seeded = await ChartAccount.find({
                code: { $in: DEFAULT_CHART.map((s) => s.code) },
            });
            for (const doc of seeded) {
                // Triggers the pre-validate derivation of normalBalance.
                await doc.save();
            }
        }

        await History.create({
            actionType: "CHART_ACCOUNT_SEEDED",
            details: { inserted, total: DEFAULT_CHART.length },
            message: `${user.fullName} seeded the default chart of accounts (${inserted} new, ${DEFAULT_CHART.length} total) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityType: "CHART_ACCOUNT",
        });

        revalidatePath(CHART_PATH);
        if (path) revalidatePath(path);
        return { success: true, inserted, total: DEFAULT_CHART.length };
    } catch (error) {
        console.error("Error seeding default chart of accounts:", error);
        throw error;
    }
}
export const seedDefaultChart = await withAuth(_seedDefaultChart, "accountingSettings");
