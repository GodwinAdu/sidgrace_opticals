import { describe, it, expect } from "vitest";
import {
    normalBalanceForType,
    isBalanced,
    lineSignedAmount,
    runningBalance,
    type AccountType,
    type JournalLineInput,
} from "../lib/accounting/ledger";
import { DEFAULT_CHART, validateParentType, expectedTypeForCode, validateCodeType } from "../lib/accounting/coa";

const ALL_TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];
const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];
const CREDIT_NORMAL: AccountType[] = ["liability", "equity", "revenue"];

/**
 * Property 2 (part): normal-balance correctness.
 * Validates: Requirements 1.1, 3.1
 */
describe("normalBalanceForType", () => {
    it("returns debit for asset and expense", () => {
        for (const t of DEBIT_NORMAL) expect(normalBalanceForType(t)).toBe("debit");
    });

    it("returns credit for liability, equity and revenue", () => {
        for (const t of CREDIT_NORMAL) expect(normalBalanceForType(t)).toBe("credit");
    });

    it("classifies every account type as exactly debit or credit", () => {
        for (const t of ALL_TYPES) {
            const nb = normalBalanceForType(t);
            expect(nb === "debit" || nb === "credit").toBe(true);
        }
    });
});

/**
 * Property 1: journal entries are balanced.
 * Validates: Requirements 2.1, 2.2
 */
describe("isBalanced", () => {
    it("accepts a balanced two-line entry", () => {
        expect(isBalanced([{ debit: 100 }, { credit: 100 }])).toBe(true);
    });

    it("accepts a balanced multi-line entry", () => {
        expect(
            isBalanced([{ debit: 70 }, { debit: 30 }, { credit: 100 }]),
        ).toBe(true);
    });

    it("rejects when debits do not equal credits", () => {
        expect(isBalanced([{ debit: 100 }, { credit: 90 }])).toBe(false);
    });

    it("rejects an entry with fewer than two lines", () => {
        expect(isBalanced([{ debit: 100 }])).toBe(false);
        expect(isBalanced([])).toBe(false);
    });

    it("rejects a zero-total entry", () => {
        expect(isBalanced([{ debit: 0 }, { credit: 0 }])).toBe(false);
    });

    it("rejects a line that is not strictly one-sided", () => {
        // both sides positive on the same line
        expect(isBalanced([{ debit: 100, credit: 100 }, { credit: 100 }])).toBe(false);
        // a line with neither side positive
        expect(isBalanced([{ debit: 100 }, {}, { credit: 100 }])).toBe(false);
    });

    it("treats negative/NaN amounts as not valid (not one-sided)", () => {
        expect(isBalanced([{ debit: -100 }, { credit: -100 }])).toBe(false);
    });

    it("balances across many random balanced entries", () => {
        for (let i = 0; i < 200; i++) {
            const n = 2 + Math.floor(Math.random() * 4); // 2..5 debit lines
            const debits = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 1000));
            const total = debits.reduce((s, d) => s + d, 0);
            const lines: JournalLineInput[] = [
                ...debits.map((d) => ({ debit: d })),
                { credit: total },
            ];
            expect(isBalanced(lines)).toBe(true);
        }
    });

    it("rejects random unbalanced entries", () => {
        for (let i = 0; i < 200; i++) {
            const debit = 1 + Math.floor(Math.random() * 1000);
            const credit = debit + 1 + Math.floor(Math.random() * 1000); // always different
            expect(isBalanced([{ debit }, { credit }])).toBe(false);
        }
    });
});

/**
 * Property 2 (part): running-balance math.
 * Validates: Requirements 1.1, 3.1
 */
describe("lineSignedAmount", () => {
    it("debit increases a debit-normal account, credit decreases it", () => {
        for (const t of DEBIT_NORMAL) {
            expect(lineSignedAmount({ debit: 50 }, t)).toBe(50);
            expect(lineSignedAmount({ credit: 50 }, t)).toBe(-50);
        }
    });

    it("credit increases a credit-normal account, debit decreases it", () => {
        for (const t of CREDIT_NORMAL) {
            expect(lineSignedAmount({ credit: 50 }, t)).toBe(50);
            expect(lineSignedAmount({ debit: 50 }, t)).toBe(-50);
        }
    });
});

describe("runningBalance", () => {
    it("starts from the opening balance when there are no lines", () => {
        expect(runningBalance(500, [], "asset")).toBe(500);
    });

    it("increases a debit-normal account on debits", () => {
        // Cash (asset): open 100, +200 debit, -50 credit => 250
        expect(runningBalance(100, [{ debit: 200 }, { credit: 50 }], "asset")).toBe(250);
    });

    it("increases a credit-normal account on credits", () => {
        // Revenue: open 0, +300 credit, -100 debit => 200
        expect(runningBalance(0, [{ credit: 300 }, { debit: 100 }], "revenue")).toBe(200);
    });

    it("equals opening plus the sum of signed amounts for any type", () => {
        for (const t of ALL_TYPES) {
            const lines: JournalLineInput[] = [{ debit: 40 }, { credit: 15 }, { debit: 5 }];
            const expected =
                0 + lines.reduce((s, l) => s + lineSignedAmount(l, t), 0);
            expect(runningBalance(0, lines, t)).toBe(expected);
        }
    });
});

/**
 * Property 2 context: parent type validation (Requirement 1.5).
 */
describe("validateParentType", () => {
    it("accepts a child whose type matches its parent", () => {
        for (const t of ALL_TYPES) expect(validateParentType(t, t)).toBe(true);
    });

    it("rejects a child whose type differs from its parent", () => {
        expect(validateParentType("expense", "asset")).toBe(false);
        expect(validateParentType("asset", "liability")).toBe(false);
        expect(validateParentType("revenue", "equity")).toBe(false);
    });
});

describe("DEFAULT_CHART seed", () => {
    it("has unique account codes", () => {
        const codes = DEFAULT_CHART.map((a) => a.code);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it("covers every account type", () => {
        const types = new Set(DEFAULT_CHART.map((a) => a.type));
        for (const t of ALL_TYPES) expect(types.has(t)).toBe(true);
    });

    it("flags at least one cash account for cash-flow reporting", () => {
        const cash = DEFAULT_CHART.filter((a) => a.isCash);
        expect(cash.length).toBeGreaterThan(0);
        for (const a of cash) expect(a.type).toBe("asset");
    });

    it("marks the bridge's system accounts", () => {
        const system = DEFAULT_CHART.filter((a) => a.isSystem);
        expect(system.length).toBeGreaterThan(0);
    });
});


/**
 * Report-accuracy guardrail: an account code's leading digit must agree with
 * its accounting type (1=asset, 2=liability, 3=equity, 4=revenue, 5/6=expense),
 * since every statement routes accounts purely by `type`.
 */
describe("expectedTypeForCode", () => {
    it("maps each leading digit to its conventional type", () => {
        expect(expectedTypeForCode("1000")).toBe("asset");
        expect(expectedTypeForCode("2000")).toBe("liability");
        expect(expectedTypeForCode("3000")).toBe("equity");
        expect(expectedTypeForCode("4000")).toBe("revenue");
        expect(expectedTypeForCode("5000")).toBe("expense");
        expect(expectedTypeForCode("6000")).toBe("expense");
    });

    it("returns null for prefixes outside the convention", () => {
        expect(expectedTypeForCode("7000")).toBeNull();
        expect(expectedTypeForCode("9000")).toBeNull();
        expect(expectedTypeForCode("0100")).toBeNull();
        expect(expectedTypeForCode("ABC")).toBeNull();
        expect(expectedTypeForCode("")).toBeNull();
    });

    it("ignores surrounding whitespace", () => {
        expect(expectedTypeForCode("  4100 ")).toBe("revenue");
    });
});

describe("validateCodeType", () => {
    it("passes when the code prefix matches the type", () => {
        expect(validateCodeType("1000", "asset").ok).toBe(true);
        expect(validateCodeType("2000", "liability").ok).toBe(true);
        expect(validateCodeType("3000", "equity").ok).toBe(true);
        expect(validateCodeType("4000", "revenue").ok).toBe(true);
        expect(validateCodeType("5000", "expense").ok).toBe(true);
        expect(validateCodeType("6000", "expense").ok).toBe(true);
    });

    it("fails when the code prefix contradicts the type, exposing the expected type", () => {
        const wrong = validateCodeType("6100", "liability");
        expect(wrong.ok).toBe(false);
        expect(wrong.expectedType).toBe("expense");
        expect(wrong.message).toBeTruthy();

        const alsoWrong = validateCodeType("1000", "revenue");
        expect(alsoWrong.ok).toBe(false);
        expect(alsoWrong.expectedType).toBe("asset");
    });

    it("allows unknown prefixes (custom numbering) regardless of type", () => {
        for (const t of ALL_TYPES) {
            expect(validateCodeType("7000", t).ok).toBe(true);
            expect(validateCodeType("9100", t).ok).toBe(true);
            expect(validateCodeType("ABC", t).ok).toBe(true);
            expect(validateCodeType("", t).ok).toBe(true);
        }
    });

    it("accepts every account in DEFAULT_CHART (regression guard)", () => {
        for (const acc of DEFAULT_CHART) {
            const check = validateCodeType(acc.code, acc.type);
            expect(check.ok).toBe(true);
        }
    });
});
