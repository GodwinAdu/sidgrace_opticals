/**
 * Pure, dependency-free double-entry ledger engine.
 *
 * These helpers carry the core accounting invariants (balancing, normal-balance
 * math, running balances) and are extracted so they can be unit-tested without a
 * database or any Next/Mongoose imports. The action/model layers call these so
 * behavior stays identical between the app and the tests.
 */

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type NormalBalance = "debit" | "credit";

/** A single journal line: exactly one of debit/credit should be positive. */
export interface JournalLineInput {
    debit?: number;
    credit?: number;
}

/**
 * The side (debit or credit) that increases an account of a given type.
 * Debit-normal: assets and expenses. Credit-normal: liabilities, equity, revenue.
 */
export function normalBalanceForType(type: AccountType): NormalBalance {
    return type === "asset" || type === "expense" ? "debit" : "credit";
}

/** Coerce a value to a finite, non-negative number (0 for junk/negatives). */
function amount(value: number | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True when a line is strictly one-sided (exactly one of debit/credit positive). */
function isOneSided(line: JournalLineInput): boolean {
    const d = amount(line.debit);
    const c = amount(line.credit);
    return (d > 0 && c === 0) || (c > 0 && d === 0);
}

/**
 * A set of journal lines is balanced only when:
 *  - total debits equal total credits,
 *  - the total is strictly positive,
 *  - there are at least two lines, and
 *  - every line is strictly one-sided (exactly one of debit/credit positive).
 */
export function isBalanced(lines: JournalLineInput[]): boolean {
    if (!Array.isArray(lines) || lines.length < 2) return false;
    if (!lines.every(isOneSided)) return false;

    const totalDebit = lines.reduce((s, l) => s + amount(l.debit), 0);
    const totalCredit = lines.reduce((s, l) => s + amount(l.credit), 0);

    if (totalDebit <= 0) return false;
    return totalDebit === totalCredit;
}

/**
 * The signed effect of a line on its account: positive when it increases the
 * account's normal side, negative when it decreases it.
 *
 * For a debit-normal account a debit is +, a credit is -.
 * For a credit-normal account a credit is +, a debit is -.
 */
export function lineSignedAmount(line: JournalLineInput, accountType: AccountType): number {
    const d = amount(line.debit);
    const c = amount(line.credit);
    return normalBalanceForType(accountType) === "debit" ? d - c : c - d;
}

/**
 * Running balance for an account: start from the opening balance and apply each
 * line's signed effect in order. Balance increases on the account's normal side
 * and decreases on the other.
 */
export function runningBalance(
    openingBalance: number,
    lines: JournalLineInput[],
    accountType: AccountType,
): number {
    const opening = Number(openingBalance) || 0;
    return (lines || []).reduce((bal, line) => bal + lineSignedAmount(line, accountType), opening);
}
