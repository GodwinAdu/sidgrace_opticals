"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import JournalEntry from "../../models/accounting/journal-entry.models";
import AccountingPeriod from "../../models/accounting/accounting-period.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";
import { nextSequence } from "../../models/counter.models";
import { isBalanced, type JournalLineInput } from "../../accounting/ledger";

const JOURNAL_PATH = "/dashboard/account/journal-entries";
const LEDGER_PATH = "/dashboard/account/account-list";

/**
 * Allocate the next human-readable entry number for the current year from the
 * shared counter: JE-YYYY-00001. Assigned once at draft creation and never
 * reused, so an entry carries a stable identifier through its whole lifecycle.
 */
async function generateEntryNo(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`journal-${year}`);
    return `JE-${year}-${String(seq).padStart(5, "0")}`;
}

interface JournalLineValues {
    accountId: string;
    debit?: number;
    credit?: number;
    memo?: string;
}

/**
 * Coerce caller-supplied lines into clean, one-sided numeric lines. Each line
 * keeps exactly one positive side; junk/negatives collapse to 0 so the pure
 * `isBalanced` guard and the schema see the same normalized shape.
 */
function normalizeLines(lines: JournalLineValues[] | undefined) {
    return (lines || [])
        .filter((l) => l && l.accountId)
        .map((l) => {
            const debit = Number(l.debit);
            const credit = Number(l.credit);
            return {
                accountId: l.accountId,
                debit: Number.isFinite(debit) && debit > 0 ? debit : 0,
                credit: Number.isFinite(credit) && credit > 0 ? credit : 0,
                memo: l.memo?.trim() || "",
            };
        });
}

/**
 * Find the fiscal period whose [start, end] range covers a given date. Returns
 * null when no period is configured for the date (callers decide how lenient to
 * be about unconfigured dates).
 */
async function findPeriodForDate(date: Date) {
    return AccountingPeriod.findOne({
        del_flag: false,
        start: { $lte: date },
        end: { $gte: date },
    });
}

/* ═══════════════════════════════ JOURNAL ENTRIES ═══════════════════════════════ */

interface CreateDraftInput {
    date?: Date | string;
    memo?: string;
    basis?: "accrual" | "cash";
    source?: IJournalEntry["source"];
    sourceId?: string | null;
    vendorId?: string | null;
    lines?: JournalLineValues[];
}

/**
 * Create a draft journal entry (R2.1). Drafts may be unbalanced or incomplete
 * while they are being built; balance is only enforced at post time. A stable
 * `entryNo` is minted here so the entry is identifiable from the moment it
 * exists. Gated by `accountingManagement`.
 */
async function _createDraft(user: User, values: CreateDraftInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const date = values.date ? new Date(values.date) : new Date();
        if (Number.isNaN(date.getTime())) throw new Error("Invalid posting date");

        const entryNo = await generateEntryNo();
        const entry = await JournalEntry.create({
            entryNo,
            date,
            memo: values.memo?.trim() || "",
            status: "draft",
            basis: values.basis === "cash" ? "cash" : "accrual",
            source: values.source || "manual",
            sourceId: values.sourceId || null,
            vendorId: values.vendorId || null,
            lines: normalizeLines(values.lines),
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "JOURNAL_ENTRY_CREATED",
            details: { itemId: entry._id, entryNo, status: "draft" },
            message: `${user.fullName} created draft journal entry ${entryNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "JOURNAL_ENTRY",
        });

        revalidatePath(JOURNAL_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.error("Error creating draft journal entry:", error);
        throw error;
    }
}
export const createDraft = await withAuth(_createDraft, "accountingManagement");

interface UpdateDraftInput {
    date?: Date | string;
    memo?: string;
    basis?: "accrual" | "cash";
    vendorId?: string | null;
    lines?: JournalLineValues[];
}

/**
 * Edit a draft journal entry (R2.3). Only entries still in `draft` status can be
 * edited; a posted (or reversed) entry is immutable and corrections to it must
 * be made via `reverse`, never by editing. Gated by `accountingManagement`.
 */
async function _updateDraft(user: User, id: string, values: UpdateDraftInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A journal entry is required");
        await connectToDB();

        const entry = await JournalEntry.findById(id);
        if (!entry || entry.del_flag) throw new Error("Journal entry not found");
        if (entry.status !== "draft") {
            throw new Error(
                "A posted journal entry is immutable; make corrections with a reversing entry instead of editing.",
            );
        }

        if (values.date !== undefined) {
            const date = new Date(values.date);
            if (Number.isNaN(date.getTime())) throw new Error("Invalid posting date");
            entry.date = date;
        }
        if (values.memo !== undefined) entry.memo = values.memo.trim();
        if (values.basis !== undefined) entry.basis = values.basis === "cash" ? "cash" : "accrual";
        if (values.vendorId !== undefined) entry.vendorId = (values.vendorId || null) as never;
        if (values.lines !== undefined) entry.lines = normalizeLines(values.lines) as never;

        entry.mod_flag = true;
        entry.modifiedBy = user._id as never;
        entry.action_type = "updated";
        await entry.save();

        await History.create({
            actionType: "JOURNAL_ENTRY_UPDATED",
            details: { itemId: entry._id, entryNo: entry.entryNo, status: entry.status },
            message: `${user.fullName} updated draft journal entry ${entry.entryNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "JOURNAL_ENTRY",
        });

        revalidatePath(JOURNAL_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.error("Error updating draft journal entry:", error);
        throw error;
    }
}
export const updateDraft = await withAuth(_updateDraft, "accountingManagement");

/**
 * Post a draft journal entry to the ledger (R2.1, R2.5). This is the commit that
 * makes an entry part of the general ledger and renders it immutable. It
 * re-validates two things before writing:
 *
 *  1. Balance — reusing the pure `isBalanced` engine (>= 2 one-sided lines,
 *     total debits === total credits, total > 0). The model enforces the same
 *     guard, but we check first to return a clean error instead of a raw
 *     validation throw.
 *  2. Open period — the posting date must not fall inside a CLOSED period. A
 *     closed period is a reopenable soft lock, so posting is blocked until an
 *     authorized user reopens it (R7.2).
 *
 * On success the entry records who posted it and when. Gated by `accountingPost`.
 */
async function _post(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A journal entry is required");
        await connectToDB();

        const entry = await JournalEntry.findById(id);
        if (!entry || entry.del_flag) throw new Error("Journal entry not found");
        if (entry.status === "posted") throw new Error("This journal entry is already posted");
        if (entry.status === "reversed") throw new Error("A reversed journal entry cannot be posted");

        const lines = (entry.lines || []) as unknown as JournalLineInput[];
        if (!isBalanced(lines)) {
            throw new Error(
                "Journal entry must be balanced: total debits must equal total credits (> 0), with at least two one-sided lines.",
            );
        }

        // The posting date must land in an open period. A configured, closed
        // period blocks the post; an unconfigured date is permitted.
        const period = await findPeriodForDate(entry.date);
        if (period && period.status === "closed") {
            throw new Error(
                "The posting date falls in a closed accounting period. Reopen the period before posting.",
            );
        }

        entry.status = "posted";
        entry.postedBy = user._id as never;
        entry.postedAt = new Date();
        entry.mod_flag = true;
        entry.modifiedBy = user._id as never;
        entry.action_type = "updated";
        await entry.save();

        await History.create({
            actionType: "JOURNAL_ENTRY_POSTED",
            details: { itemId: entry._id, entryNo: entry.entryNo, date: entry.date },
            message: `${user.fullName} posted journal entry ${entry.entryNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "JOURNAL_ENTRY",
        });

        revalidatePath(JOURNAL_PATH);
        revalidatePath(LEDGER_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.error("Error posting journal entry:", error);
        throw error;
    }
}
export const post = await withAuth(_post, "accountingPost");

interface ReverseInput {
    date?: Date | string;
    memo?: string;
}

/**
 * Reverse a posted journal entry (R2.6). Because posted entries are immutable,
 * corrections are made by posting a NEW entry that mirrors the original with
 * every line's debit/credit swapped. The reversing entry links back to the
 * original via `reversalOf`; the original is marked `reversed` and records
 * `reversedBy`. The reversing entry is created already `posted`.
 *
 * The reversal date defaults to the original's date but may be overridden; it
 * must also land in an open period. Gated by `accountingPost`.
 */
async function _reverse(user: User, id: string, values?: ReverseInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A journal entry is required");
        await connectToDB();

        const original = await JournalEntry.findById(id);
        if (!original || original.del_flag) throw new Error("Journal entry not found");
        if (original.status !== "posted") {
            throw new Error("Only a posted journal entry can be reversed");
        }
        if (original.reversedBy) throw new Error("This journal entry has already been reversed");

        const date = values?.date ? new Date(values.date) : new Date(original.date);
        if (Number.isNaN(date.getTime())) throw new Error("Invalid reversal date");

        const period = await findPeriodForDate(date);
        if (period && period.status === "closed") {
            throw new Error(
                "The reversal date falls in a closed accounting period. Reopen the period before reversing.",
            );
        }

        // Mirror each line with debit/credit swapped so the reversing entry
        // exactly cancels the original and stays balanced by construction.
        const swappedLines = (original.lines || []).map((l) => ({
            accountId: l.accountId,
            debit: l.credit || 0,
            credit: l.debit || 0,
            memo: l.memo || "",
        }));

        const entryNo = await generateEntryNo();
        const reversingEntry = await JournalEntry.create({
            entryNo,
            date,
            memo: values?.memo?.trim() || `Reversal of ${original.entryNo}`,
            status: "posted",
            basis: original.basis,
            source: original.source,
            sourceId: original.sourceId,
            vendorId: original.vendorId,
            reversalOf: original._id,
            lines: swappedLines,
            postedBy: user._id,
            postedAt: new Date(),
            createdBy: user._id,
            action_type: "created",
        });

        original.status = "reversed";
        original.reversedBy = reversingEntry._id as never;
        original.mod_flag = true;
        original.modifiedBy = user._id as never;
        original.action_type = "updated";
        await original.save();

        await History.create({
            actionType: "JOURNAL_ENTRY_REVERSED",
            details: {
                itemId: original._id,
                entryNo: original.entryNo,
                reversingEntryNo: entryNo,
                reversingEntryId: reversingEntry._id,
            },
            message: `${user.fullName} reversed journal entry ${original.entryNo} with ${entryNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: original._id,
            entityType: "JOURNAL_ENTRY",
        });

        revalidatePath(JOURNAL_PATH);
        revalidatePath(LEDGER_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(reversingEntry));
    } catch (error) {
        console.error("Error reversing journal entry:", error);
        throw error;
    }
}
export const reverse = await withAuth(_reverse, "accountingPost");

/**
 * Read a single journal entry with its lines' accounts populated for drill-down
 * (R3.2). Gated by `accountingManagement`.
 */
async function _get(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A journal entry is required");
        await connectToDB();

        const entry = await JournalEntry.findById(id)
            .populate("lines.accountId", "code name type normalBalance")
            .populate("reversalOf", "entryNo")
            .populate("reversedBy", "entryNo")
            .lean();
        if (!entry) return null;
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.error("Error fetching journal entry:", error);
        return null;
    }
}
export const get = await withAuth(_get, "accountingManagement");

interface ListJournalInput {
    status?: "draft" | "posted" | "reversed" | "all";
    source?: IJournalEntry["source"];
    from?: Date | string;
    to?: Date | string;
    limit?: number;
}

/**
 * List journal entries newest-first, optionally filtered by status, source, and
 * a posting-date range. Gated by `accountingManagement`.
 */
async function _list(user: User, filter?: ListJournalInput) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const query: Record<string, unknown> = { del_flag: false };
        if (filter?.status && filter.status !== "all") query.status = filter.status;
        if (filter?.source) query.source = filter.source;

        if (filter?.from || filter?.to) {
            const range: Record<string, Date> = {};
            if (filter.from) range.$gte = new Date(filter.from);
            if (filter.to) range.$lte = new Date(filter.to);
            query.date = range;
        }

        const limit = Math.min(Math.max(Number(filter?.limit) || 200, 1), 500);
        const entries = await JournalEntry.find(query)
            .populate("lines.accountId", "code name type")
            .sort({ date: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        return JSON.parse(JSON.stringify(entries || []));
    } catch (error) {
        console.error("Error listing journal entries:", error);
        return [];
    }
}
export const list = await withAuth(_list, "accountingManagement");
