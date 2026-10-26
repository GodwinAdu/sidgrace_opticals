"use server"

import { connectToDB } from "../../mongoose";
import History from "../../models/history.models";
import JournalEntry from "../../models/accounting/journal-entry.models";
import ChartAccount from "../../models/accounting/chart-account.models";
import { User } from "../../helpers/auth";
import { getSettingsInternal } from "./accounting-settings.actions";
import { nextSequence } from "../../models/counter.models";
import { isBalanced, type JournalLineInput } from "../../accounting/ledger";
import type { LedgerLineInput } from "../../inventory/postings";

/**
 * Input for {@link postLedgerEntryLines}: an explicit set of per-account
 * debit/credit lines (which must balance per `isBalanced`) plus the optional JE
 * metadata the bridge stamps onto the posted entry (D3 / R3 / R4).
 */
interface JournalPostInput {
    lines: LedgerLineInput[];
    memo?: string;
    date?: string;
    source?: IJournalEntry["source"];
    sourceId?: string | null;
    vendorId?: string | null;
}

interface TxnInput {
    type: "income" | "expense";
    category: string;
    amount: number;
    accountName?: string;
    date?: string;
    description?: string;
    method?: string;
    source?: "manual" | "payment" | "invoice" | "purchase" | "attendance";
    sourceId?: string | null;
    patientId?: string | null;
    vendorId?: string | null;
}

/**
 * Map a legacy transaction `source` onto the double-entry JournalEntry source
 * enum. The legacy-only "attendance" source has no 1:1 JE equivalent, so it maps
 * to "bridge"; everything else lines up directly. Unknown values fall back to
 * "bridge" too so an entry always has a valid, auditable origin.
 */
function mapBridgeSource(source: TxnInput["source"]): IJournalEntry["source"] {
    switch (source) {
        case "payment":
            return "payment";
        case "invoice":
            return "invoice";
        case "purchase":
            return "purchase";
        case "manual":
            return "manual";
        case "attendance":
        default:
            return "bridge";
    }
}

/**
 * Allocate the next human-readable journal entry number for the current year
 * (JE-YYYY-00001), matching the journal-entry action layer so bridged entries
 * share the same numbering scheme as hand-entered ones.
 */
async function generateBridgeEntryNo(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`journal-${year}`);
    return `JE-${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * Resolve an active ChartAccount by its configured default `code`. Returns null
 * (never throws) when the code is unset or no matching account exists, so the
 * bridge can log and skip the double-entry side without blocking the embedded
 * clinical/billing flow that triggered the post.
 */
async function resolveAccountByCode(code: string | undefined | null) {
    if (!code) return null;
    return ChartAccount.findOne({ code: String(code), del_flag: { $ne: true } });
}

/**
 * Pick the ChartAccount `code` for a posting side, honouring the clinic's
 * per-category mapping first and falling back to the single global default.
 *
 * Resolution order (R: clinic-configurable income/expense accounts):
 *   1. `byCategory[category]` — the clinic mapped THIS category to an account.
 *   2. `fallbackCode` — the single global revenue/expense default.
 *   3. `null` — caller then skips the posting (never posts to a wrong account).
 *
 * The category lookup is case-insensitive and trims surrounding whitespace so a
 * posting labelled "Consultation" matches a mapping key " consultation ".
 */
function pickCategoryCode(
    byCategory: Record<string, string> | undefined | null,
    category: string | undefined | null,
    fallbackCode: string | undefined | null,
): string | null {
    const map = byCategory || {};
    const key = String(category ?? "").trim().toLowerCase();
    if (key) {
        // Exact key first (fast path), then a case-insensitive scan.
        const direct = map[String(category ?? "").trim()];
        if (typeof direct === "string" && direct.trim()) return direct.trim();
        for (const [k, v] of Object.entries(map)) {
            if (k.trim().toLowerCase() === key && typeof v === "string" && v.trim()) {
                return v.trim();
            }
        }
    }
    if (typeof fallbackCode === "string" && fallbackCode.trim()) return fallbackCode.trim();
    return null;
}

/**
 * Map a well-known expense `category` onto the dedicated scalar default account
 * it logically belongs to, so those scalar mappings in AccountingSettings are
 * actually honoured by the posting bridge (not just displayed in the UI):
 *
 *   "Payroll"            → `payrollExpense` (6000 Salaries & Wages)
 *   "Inventory Purchase" → `inventory`      (1200 Inventory)
 *
 * Returns the mapped code (trimmed) or null when the category is not well-known
 * or its scalar default is unset. The caller uses this as the fallback BELOW an
 * explicit `expenseByCategory` override, so a clinic that maps the category by
 * hand still wins; only the generic `expense` default is superseded.
 */
function wellKnownExpenseDefault(
    map: IAccountingDefaultAccounts,
    category: string | undefined | null,
): string | null {
    const key = String(category ?? "").trim().toLowerCase();
    let code: string | undefined;
    if (key === "payroll") code = map.payrollExpense;
    else if (key === "inventory purchase") code = map.inventory;
    return typeof code === "string" && code.trim() ? code.trim() : null;
}

/**
 * Build and POST a balanced double-entry JournalEntry mirroring a bridged
 * legacy transaction, using the default-account mappings from AccountingSettings
 * (R8.1):
 *   income  → debit Cash,    credit Revenue
 *   expense → debit Expense,  credit Cash
 *
 * This is a best-effort internal post (NOT withAuth-gated): embedded flows
 * (payments, invoices, insurance, purchases, payroll) must never be blocked by
 * accounting permissions or a missing mapping. On any problem it logs via
 * console.error and returns null so the caller carries on, mirroring the
 * existing try/catch posture of the bridge. The amount recorded is unchanged —
 * only the representation becomes double-entry (R8.5).
 *
 * The entry is created already `posted` and balance is asserted with the pure
 * `isBalanced` guard before saving, so a malformed mapping can never persist an
 * unbalanced ledger row.
 *
 * Returns the created JournalEntry document (so the bridge can expose its `_id`
 * as the ledger-entry id — R2/D2), or null on any skip/failure.
 */
async function postBridgedJournalEntry(user: User, values: TxnInput) {
    try {
        const amount = Number(values.amount) || 0;
        if (amount <= 0) return null;

        const settings = await getSettingsInternal();
        if (!settings) {
            console.error("Bridge: accounting settings unavailable; skipped journal entry.");
            return null;
        }

        const map = settings.defaultAccounts || {};
        const cash = await resolveAccountByCode(map.cash);

        let debitAccount: typeof cash;
        let creditAccount: typeof cash;

        if (values.type === "income") {
            // income → debit Cash, credit Revenue. The revenue account is the
            // clinic's per-category mapping for this income category, falling
            // back to the single global revenue default (R: category mapping).
            debitAccount = cash;
            const revenueCode = pickCategoryCode(
                map.revenueByCategory as Record<string, string> | undefined,
                values.category,
                map.revenue,
            );
            creditAccount = await resolveAccountByCode(revenueCode);
        } else {
            // expense → debit Expense, credit Cash. The expense account is the
            // clinic's per-category mapping for this expense category, then a
            // well-known scalar default for the category (e.g. "Payroll" →
            // `payrollExpense`, "Inventory Purchase" → `inventory`), and finally
            // the single global expense default. This lets the dedicated scalar
            // mappings (6000 Salaries & Wages, 1200 Inventory) be honoured
            // out-of-the-box without the clinic having to map each category by
            // hand, while still letting an explicit per-category override win.
            const wellKnownExpenseCode = wellKnownExpenseDefault(map, values.category);
            const expenseCode = pickCategoryCode(
                map.expenseByCategory as Record<string, string> | undefined,
                values.category,
                wellKnownExpenseCode || map.expense,
            );
            debitAccount = await resolveAccountByCode(expenseCode);
            creditAccount = cash;
        }

        if (!debitAccount || !creditAccount) {
            console.error(
                `Bridge: missing default account mapping for ${values.type} (debit=${debitAccount?.code ?? "?"}, credit=${creditAccount?.code ?? "?"}); skipped journal entry.`,
            );
            return null;
        }

        const lines = [
            { accountId: debitAccount._id, debit: amount, credit: 0, memo: values.category || "" },
            { accountId: creditAccount._id, debit: 0, credit: amount, memo: values.category || "" },
        ];

        // Never persist an unbalanced ledger row, even best-effort.
        if (!isBalanced(lines as unknown as JournalLineInput[])) {
            console.error("Bridge: constructed journal entry is not balanced; skipped.");
            return null;
        }

        const entryNo = await generateBridgeEntryNo();
        const entry = await JournalEntry.create({
            entryNo,
            date: values.date ? new Date(values.date) : new Date(),
            memo: values.description || values.category || `Bridged ${values.type}`,
            status: "posted",
            basis: settings.basisDefault === "cash" ? "cash" : "accrual",
            source: mapBridgeSource(values.source),
            sourceId: values.sourceId || null,
            vendorId: values.vendorId || null,
            lines,
            postedBy: user._id,
            postedAt: new Date(),
            createdBy: user._id,
            action_type: "created",
        });

        return entry;
    } catch (error) {
        console.error("Bridge: failed to post bridged journal entry:", error);
        return null;
    }
}

/**
 * Post a reversing JournalEntry for a bridged entry (R8.2). Mirrors every line
 * with debit/credit swapped so it exactly cancels the original, marks the
 * original `reversed`, and links the two. Best-effort and non-throwing: if the
 * original JE is missing or already reversed it is a safe no-op, so reversing a
 * legacy transaction never fails because of its double-entry side.
 */
async function reverseBridgedJournalEntry(user: User, journalEntryId: string): Promise<void> {
    try {
        const original = await JournalEntry.findById(journalEntryId);
        if (!original || original.del_flag) return;
        if (original.status !== "posted" || original.reversedBy) return;

        const swappedLines = (original.lines || []).map((l) => ({
            accountId: l.accountId,
            debit: l.credit || 0,
            credit: l.debit || 0,
            memo: l.memo || "",
        }));

        const entryNo = await generateBridgeEntryNo();
        const reversingEntry = await JournalEntry.create({
            entryNo,
            date: new Date(),
            memo: `Reversal of ${original.entryNo}`,
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
    } catch (error) {
        console.error("Bridge: failed to reverse bridged journal entry:", error);
    }
}

/**
 * Core ledger post. Builds and posts a balanced double-entry JournalEntry via
 * the default-account mappings and returns it (R2). The legacy write-path is
 * gone: no `Transaction` row is created, no `Account` balance is mutated, and
 * nothing is linked onto an Account's `deposits[]`/`expenses[]`.
 *
 * The returned object is `JSON.parse(JSON.stringify(journalEntry))` (D2), so it
 * exposes the JournalEntry `_id`. We ALSO stamp a `journalEntryId` convenience
 * field equal to `_id` so callers reading either `txn._id` or
 * `txn.journalEntryId` keep working and keep compiling. The amount recorded is
 * unchanged — only the legacy side-effects are removed (P1: amounts invariant).
 *
 * Best-effort and non-throwing: if the bridge cannot post a JE (missing mapping,
 * non-positive amount, settings unavailable) it returns null, exactly as before,
 * so an embedded clinical/billing save is never blocked.
 */
async function _postLedgerEntry(user: User, values: TxnInput) {
    if (!user) throw new Error("User not authenticated");
    await connectToDB();

    // Post ONLY the balanced double-entry JournalEntry (R2). No Transaction row,
    // no Account balance mutation, no deposits[]/expenses[] linking.
    const entry = await postBridgedJournalEntry(user, values);
    if (!entry) return null;

    await History.create({
        actionType: "TRANSACTION_CREATED",
        details: { itemId: entry._id, postedAt: new Date() },
        message: `${user.fullName} recorded ${values.type} of ${Number(values.amount) || 0} (${values.category}) on ${new Date().toLocaleString()}.`,
        performedBy: user._id,
        entityId: entry._id,
        entityType: "JOURNAL_ENTRY",
    });

    // Preserve the return shape (D2): expose the JE `_id` plus a
    // `journalEntryId` alias equal to `_id`, so any caller reading either key is
    // safe (both now point at the JournalEntry).
    const plain = JSON.parse(JSON.stringify(entry));
    plain.journalEntryId = plain._id;
    return plain;
}

/**
 * Internal, non-withAuth post used by other server actions (e.g. payments)
 * that already have an authenticated user object.
 */
export async function postLedgerEntry(user: User, values: TxnInput) {
    try {
        return await _postLedgerEntry(user, values);
    } catch (error) {
        console.error("Failed to post ledger entry:", error);
        return null;
    }
}

/**
 * Internal reversal used by other server actions (e.g. re-charging a
 * consultation fee, voiding a payroll run or inventory purchase) to undo a
 * prior ledger entry. Safe no-op if nothing matches.
 *
 * The argument is a JournalEntry id (R2/D2): `postLedgerEntry` returns a JE id,
 * and its reversing callers (HR payroll, inventory-purchase) store that id and
 * pass it back here, so the posted JE with that id is reversed directly via the
 * double-entry path. The legacy `Transaction`-lookup fallback (D1 deploy-window
 * safety) has been removed now that the legacy ledger is retired and no stored
 * legacy transaction ids remain in active runs.
 */
export async function reverseLedgerEntry(user: User, id: string) {
    try {
        await connectToDB();

        const je = await JournalEntry.findById(id);
        if (je && !je.del_flag) {
            await reverseBridgedJournalEntry(user, id);
        }
        return { success: true };
    } catch (error) {
        console.error("Failed to reverse ledger entry:", error);
        return { success: false };
    }
}

/**
 * Post a balanced double-entry JournalEntry from an explicit set of per-account
 * debit/credit lines (R3/R4). Unlike {@link postLedgerEntry}, which only knows
 * the global income/expense pair, this accepts caller-resolved `ChartAccount`
 * ids and sides, so inventory flows (purchase → debit Inventory / credit
 * Payable|Cash; dispense → debit COGS / credit Inventory) can post their own
 * line pairs built by the pure line-builders in `lib/inventory/postings.ts`.
 *
 * It reuses the exact JE-creation internals already present: the entry number
 * via `generateBridgeEntryNo`, the pure `isBalanced` guard before save, an
 * already-`posted` status, the accounting basis from AccountingSettings, and a
 * `History` audit write — matching the posture of `_postLedgerEntry`.
 *
 * Best-effort and non-throwing (R10.3): it returns `null` on any problem —
 * missing/empty account id, a non-positive total, an unbalanced line set,
 * settings unavailable, or an unexpected error — logging the skip via
 * `console.error` like the rest of the bridge, so an embedded clinical/billing
 * save is never blocked.
 *
 * On success it returns `JSON.parse(JSON.stringify(entry))` with a
 * `journalEntryId` alias equal to `_id` (D2), so callers can store either key
 * and later hand it back to `reverseLedgerEntry(user, journalEntryId)` to undo
 * the post. Reversal reuses the existing path unchanged.
 */
export async function postLedgerEntryLines(
    user: User,
    input: JournalPostInput,
): Promise<Record<string, unknown> | null> {
    try {
        if (!user) return null;
        await connectToDB();

        const rawLines = Array.isArray(input?.lines) ? input.lines : [];
        if (rawLines.length < 2) {
            console.error("Bridge: postLedgerEntryLines requires at least two lines; skipped.");
            return null;
        }

        // Normalize into the JournalEntry line shape, defaulting the unused side
        // to 0. A missing/empty accountId is a skip, never a persisted bad row.
        const lines = [] as {
            accountId: string;
            debit: number;
            credit: number;
            memo: string;
        }[];
        for (const line of rawLines) {
            if (!line?.accountId) {
                console.error("Bridge: postLedgerEntryLines line missing accountId; skipped.");
                return null;
            }
            lines.push({
                accountId: String(line.accountId),
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                memo: line.memo || input.memo || "",
            });
        }

        // Never persist an unbalanced ledger row (also rejects a non-positive
        // total — isBalanced requires strictly positive, equal debit/credit sums).
        if (!isBalanced(lines as unknown as JournalLineInput[])) {
            console.error("Bridge: postLedgerEntryLines constructed entry is not balanced; skipped.");
            return null;
        }

        const settings = await getSettingsInternal();
        if (!settings) {
            console.error("Bridge: accounting settings unavailable; skipped journal entry.");
            return null;
        }

        const entryNo = await generateBridgeEntryNo();
        const entry = await JournalEntry.create({
            entryNo,
            date: input.date ? new Date(input.date) : new Date(),
            memo: input.memo || "Bridged ledger entry",
            status: "posted",
            basis: settings.basisDefault === "cash" ? "cash" : "accrual",
            source: input.source || "bridge",
            sourceId: input.sourceId || null,
            vendorId: input.vendorId || null,
            lines,
            postedBy: user._id,
            postedAt: new Date(),
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "TRANSACTION_CREATED",
            details: { itemId: entry._id, postedAt: new Date() },
            message: `${user.fullName} posted journal entry ${entryNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "JOURNAL_ENTRY",
        });

        const plain = JSON.parse(JSON.stringify(entry));
        plain.journalEntryId = plain._id;
        return plain;
    } catch (error) {
        console.error("Bridge: failed to post ledger entry lines:", error);
        return null;
    }
}
