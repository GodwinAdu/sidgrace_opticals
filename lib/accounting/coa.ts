/**
 * Pure, dependency-free Chart of Accounts helpers + the seed definition.
 *
 * DB/React-free: the seed action and model layers consume `DEFAULT_CHART` and
 * these validators, but nothing here touches Mongoose or Next so it stays
 * unit-testable in isolation.
 */

import { normalBalanceForType, type AccountType, type NormalBalance } from "./ledger";

export { normalBalanceForType };
export type { AccountType, NormalBalance };

/** A seed account definition. `code` is sortable/hierarchical by convention. */
export interface ChartAccountSeed {
    code: string;
    name: string;
    type: AccountType;
    /** Reporting group, e.g. "current-asset", "cogs". */
    subtype?: string;
    /** Flags cash/bank accounts for cash-flow + cash-basis reporting. */
    isCash?: boolean;
    /** Seeded accounts the posting bridge relies on; not deletable. */
    isSystem?: boolean;
}

/**
 * A clinic/professional default Chart of Accounts, grouped by type and ordered
 * by code. Seeding is expected to be idempotent (insert by unique code).
 * System accounts are the ones the compatibility bridge maps onto.
 */
export const DEFAULT_CHART: ChartAccountSeed[] = [
    // --- Assets (1xxx), debit-normal ---
    { code: "1000", name: "Cash on Hand", type: "asset", subtype: "current-asset", isCash: true, isSystem: true },
    { code: "1010", name: "Bank Account", type: "asset", subtype: "current-asset", isCash: true, isSystem: true },
    { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "current-asset", isSystem: true },
    { code: "1110", name: "Insurance Receivable", type: "asset", subtype: "current-asset", isSystem: true },
    { code: "1200", name: "Inventory", type: "asset", subtype: "current-asset", isSystem: true },
    { code: "1300", name: "Prepaid Expenses", type: "asset", subtype: "current-asset" },
    { code: "1500", name: "Equipment", type: "asset", subtype: "fixed-asset" },
    { code: "1510", name: "Furniture & Fixtures", type: "asset", subtype: "fixed-asset" },
    { code: "1600", name: "Accumulated Depreciation", type: "asset", subtype: "fixed-asset" },

    // --- Liabilities (2xxx), credit-normal ---
    { code: "2000", name: "Accounts Payable", type: "liability", subtype: "current-liability", isSystem: true },
    { code: "2100", name: "Accrued Expenses", type: "liability", subtype: "current-liability" },
    { code: "2200", name: "Taxes Payable", type: "liability", subtype: "current-liability" },
    { code: "2300", name: "Wages Payable", type: "liability", subtype: "current-liability" },
    { code: "2500", name: "Loans Payable", type: "liability", subtype: "long-term-liability" },

    // --- Equity (3xxx), credit-normal ---
    { code: "3000", name: "Owner's Capital", type: "equity", subtype: "equity", isSystem: true },
    { code: "3100", name: "Owner's Drawings", type: "equity", subtype: "equity" },
    { code: "3900", name: "Retained Earnings", type: "equity", subtype: "equity", isSystem: true },

    // --- Revenue (4xxx), credit-normal ---
    { code: "4000", name: "Consultation Revenue", type: "revenue", subtype: "operating-revenue", isSystem: true },
    { code: "4100", name: "Procedure Revenue", type: "revenue", subtype: "operating-revenue" },
    { code: "4200", name: "Optical Sales Revenue", type: "revenue", subtype: "operating-revenue" },
    { code: "4300", name: "Pharmacy Revenue", type: "revenue", subtype: "operating-revenue" },
    { code: "4400", name: "Laboratory Revenue", type: "revenue", subtype: "operating-revenue" },
    { code: "4900", name: "Other Income", type: "revenue", subtype: "other-revenue" },

    // --- Expenses (5xxx-6xxx), debit-normal ---
    { code: "5000", name: "Cost of Goods Sold", type: "expense", subtype: "cogs", isSystem: true },
    { code: "6000", name: "Salaries & Wages", type: "expense", subtype: "operating-expense", isSystem: true },
    { code: "6100", name: "Rent Expense", type: "expense", subtype: "operating-expense" },
    { code: "6200", name: "Utilities Expense", type: "expense", subtype: "operating-expense" },
    { code: "6300", name: "Medical Supplies Expense", type: "expense", subtype: "operating-expense" },
    { code: "6400", name: "Office Supplies Expense", type: "expense", subtype: "operating-expense" },
    { code: "6500", name: "Depreciation Expense", type: "expense", subtype: "operating-expense" },
    { code: "6600", name: "Insurance Expense", type: "expense", subtype: "operating-expense" },
    { code: "6700", name: "Repairs & Maintenance", type: "expense", subtype: "operating-expense" },
    { code: "6800", name: "Marketing & Advertising", type: "expense", subtype: "operating-expense" },
    { code: "6900", name: "Miscellaneous Expense", type: "expense", subtype: "operating-expense" },
];

/**
 * A child account's type must match its parent's type (you cannot nest an
 * expense under an asset, etc.). Returns true only when the types are equal.
 */
export function validateParentType(childType: AccountType, parentType: AccountType): boolean {
    return childType === parentType;
}

/**
 * The AccountType conventionally denoted by a code's leading digit, following
 * the DEFAULT_CHART numbering scheme:
 *   1xxx -> asset, 2xxx -> liability, 3xxx -> equity, 4xxx -> revenue,
 *   5xxx & 6xxx -> expense.
 *
 * Returns null when no convention applies - an empty code, a non-numeric
 * leading character, or a leading digit outside 1-6 (e.g. "7000", "ABC").
 * Callers treat null as "cannot infer", never as a violation, so custom
 * numbering schemes outside the convention are left alone.
 */
export function expectedTypeForCode(code: string): AccountType | null {
    const first = String(code ?? "").trim().charAt(0);
    switch (first) {
        case "1":
            return "asset";
        case "2":
            return "liability";
        case "3":
            return "equity";
        case "4":
            return "revenue";
        case "5":
        case "6":
            return "expense";
        default:
            return null;
    }
}

/** The outcome of a code/type consistency check. */
export interface CodeTypeCheck {
    ok: boolean;
    /** The type the code's prefix implies, or null when no convention applies. */
    expectedType: AccountType | null;
    /** A human-readable explanation, present only when `ok` is false. */
    message?: string;
}

/**
 * Validate that an account `code`'s leading digit agrees with its `type`
 * (R-report-accuracy). Because every financial statement routes an account
 * purely by its `type`, a code whose prefix disagrees with its type is a strong
 * signal of a miscategorised account that would land in the wrong report.
 *
 * When the code's prefix maps to no convention (`expectedTypeForCode` is null)
 * the check passes — unknown prefixes are allowed so bespoke numbering is not
 * blocked. Otherwise the check passes only when the implied type equals `type`.
 */
export function validateCodeType(code: string, type: AccountType): CodeTypeCheck {
    const expectedType = expectedTypeForCode(code);
    if (expectedType === null) return { ok: true, expectedType: null };
    if (expectedType === type) return { ok: true, expectedType };
    return {
        ok: false,
        expectedType,
        message:
            `Account code ${String(code).trim()} conventionally denotes a(n) ${expectedType} account, ` +
            `but the type is ${type}. Codes beginning 1=asset, 2=liability, 3=equity, 4=revenue, 5/6=expense.`,
    };
}