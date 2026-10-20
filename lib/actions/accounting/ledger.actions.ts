"use server";

import { connectToDB } from "../../mongoose";
import JournalEntry from "../../models/accounting/journal-entry.models";
import ChartAccount from "../../models/accounting/chart-account.models";
import { User, withAuth } from "../../helpers/auth";
import {
    lineSignedAmount,
    runningBalance,
    type AccountType,
    type JournalLineInput,
} from "../../accounting/ledger";

/** One posted ledger line for an account, carrying the running balance after it. */
interface LedgerLine {
    entryId: string;
    entryNo: string;
    date: string;
    memo: string;
    debit: number;
    credit: number;
    signedAmount: number;
    balance: number;
}

interface LedgerResult {
    account: {
        _id: string;
        code: string;
        name: string;
        type: AccountType;
        normalBalance: "debit" | "credit";
    };
    openingBalance: number;
    closingBalance: number;
    lines: LedgerLine[];
    from: string | null;
    to: string | null;
}

/**
 * A posted journal line projected onto one account, with the parent entry's
 * date/number carried along so the general ledger can order and label it.
 */
interface AccountPostedLine {
    entryId: string;
    entryNo: string;
    date: Date;
    memo: string;
    debit: number;
    credit: number;
}

/**
 * Pull every posted line that hits one account, flattened and date-ordered.
 *
 * Only `posted` entries contribute to ledger balances — drafts and the originals
 * that have been reversed out are excluded (R3.4). A reversing entry is itself a
 * normal `posted` entry, so the reversal's cancelling lines are included, which
 * is what nets a reversed original back out of the running balance.
 */
async function postedLinesForAccount(accountId: string, to?: Date): Promise<AccountPostedLine[]> {
    const query: Record<string, unknown> = {
        del_flag: false,
        status: "posted",
        "lines.accountId": accountId,
    };
    if (to) query.date = { $lte: to };

    const entries = await JournalEntry.find(query)
        .sort({ date: 1, createdAt: 1 })
        .lean();

    const result: AccountPostedLine[] = [];
    for (const entry of entries) {
        for (const line of entry.lines || []) {
            if (String(line.accountId) !== String(accountId)) continue;
            result.push({
                entryId: String(entry._id),
                entryNo: entry.entryNo,
                date: entry.date,
                memo: line.memo || entry.memo || "",
                debit: line.debit || 0,
                credit: line.credit || 0,
            });
        }
    }
    return result;
}

/**
 * Build the general ledger for a single account (R3.1, R3.3, R3.4).
 *
 * With no date range this returns every posted line in date order with a running
 * balance that moves in the account's normal direction (debit-normal accounts
 * rise on debits, credit-normal on credits — via the pure `runningBalance`
 * engine), an opening balance of 0, and the final running balance as the
 * closing balance.
 *
 * With a `from`/`to` range it splits the posted lines into three parts:
 *  - opening balance: the running total of everything strictly before `from`,
 *  - period activity: the lines within [from, to], each with a running balance
 *    seeded from the opening balance,
 *  - closing balance: opening balance plus the period activity.
 *
 * Only posted entries are considered, so draft and reversed-out activity never
 * affects the balances. Gated by `accountingManagement`.
 */
async function _getLedger(
    user: User,
    accountId: string,
    from?: Date | string,
    to?: Date | string,
): Promise<LedgerResult | null> {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!accountId) throw new Error("An account is required");
        await connectToDB();

        const account = await ChartAccount.findById(accountId).lean();
        if (!account) throw new Error("Account not found");

        const fromDate = from ? new Date(from) : undefined;
        const toDate = to ? new Date(to) : undefined;
        if (fromDate && Number.isNaN(fromDate.getTime())) throw new Error("Invalid from date");
        if (toDate && Number.isNaN(toDate.getTime())) throw new Error("Invalid to date");

        const accountType = account.type as AccountType;

        // All posted lines up to the end of the range (or all time if no `to`).
        const allLines = await postedLinesForAccount(accountId, toDate);

        // Opening balance is the running total of everything strictly before
        // `from`; with no `from` the opening balance is 0.
        const openingLines = fromDate
            ? allLines.filter((l) => l.date < fromDate)
            : [];
        const openingBalance = runningBalance(
            0,
            openingLines as unknown as JournalLineInput[],
            accountType,
        );

        // Activity is the lines within the range (>= from when supplied).
        const activityLines = fromDate
            ? allLines.filter((l) => l.date >= fromDate)
            : allLines;

        let balance = openingBalance;
        const lines: LedgerLine[] = activityLines.map((l) => {
            const signedAmount = lineSignedAmount(
                { debit: l.debit, credit: l.credit },
                accountType,
            );
            balance += signedAmount;
            return {
                entryId: l.entryId,
                entryNo: l.entryNo,
                date: new Date(l.date).toISOString(),
                memo: l.memo,
                debit: l.debit,
                credit: l.credit,
                signedAmount,
                balance,
            };
        });

        const result: LedgerResult = {
            account: {
                _id: String(account._id),
                code: account.code,
                name: account.name,
                type: accountType,
                normalBalance: account.normalBalance,
            },
            openingBalance,
            closingBalance: balance,
            lines,
            from: fromDate ? fromDate.toISOString() : null,
            to: toDate ? toDate.toISOString() : null,
        };

        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error building ledger:", error);
        throw error;
    }
}
export const getLedger = await withAuth(_getLedger, "accountingManagement");
