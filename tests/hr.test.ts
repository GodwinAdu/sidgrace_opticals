import { describe, it, expect } from "vitest";
import {
    canTransitionLeave,
    nextLeaveStatuses,
    isTerminalLeave,
    isValidLeaveStatus,
    leaveDays,
    isValidLeaveRange,
    toAmount,
    sumAdjustments,
    computeGross,
    computeLine,
    computePayrollTotals,
    isValidPayrollStatus,
    canTransitionPayroll,
    toRate,
    computeStatutoryDeductions,
    payLineFromProfile,
    prorateByHours,
    MS_PER_DAY,
    LEAVE_STATUSES,
    type LeaveStatus,
    type PayLineInput,
} from "../lib/clinical/hr";

const ALL = LEAVE_STATUSES.map((s) => s.value);

const NOW = new Date("2026-06-15T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * MS_PER_DAY);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * MS_PER_DAY);

/* ───────────────────────── Leave status machine ─────────────────────────── */

describe("canTransitionLeave", () => {
    it("lets a pending request be approved / rejected / cancelled", () => {
        expect(canTransitionLeave("pending", "approved")).toBe(true);
        expect(canTransitionLeave("pending", "rejected")).toBe(true);
        expect(canTransitionLeave("pending", "cancelled")).toBe(true);
    });

    it("treats approved / rejected / cancelled as terminal", () => {
        for (const from of ["approved", "rejected", "cancelled"] as LeaveStatus[]) {
            for (const to of ALL) expect(canTransitionLeave(from, to)).toBe(false);
        }
    });

    it("rejects no-op (same-state) transitions", () => {
        for (const s of ALL) expect(canTransitionLeave(s, s)).toBe(false);
    });
});

describe("nextLeaveStatuses", () => {
    it("stays consistent with canTransitionLeave", () => {
        for (const from of ALL) {
            const nexts = nextLeaveStatuses(from);
            for (const to of nexts) expect(canTransitionLeave(from, to)).toBe(true);
            for (const to of ALL.filter((s) => !nexts.includes(s))) {
                expect(canTransitionLeave(from, to)).toBe(false);
            }
        }
    });

    it("returns a fresh copy callers cannot mutate", () => {
        const a = nextLeaveStatuses("approved");
        a.push("pending" as LeaveStatus);
        expect(nextLeaveStatuses("approved")).toEqual([]);
        expect([...nextLeaveStatuses("pending")].sort()).toEqual(["approved", "cancelled", "rejected"]);
    });
});

describe("isTerminalLeave / isValidLeaveStatus", () => {
    it("only pending is non-terminal", () => {
        expect(isTerminalLeave("pending")).toBe(false);
        expect(isTerminalLeave("approved")).toBe(true);
        expect(isTerminalLeave("rejected")).toBe(true);
        expect(isTerminalLeave("cancelled")).toBe(true);
    });

    it("recognises only the four real statuses", () => {
        expect(isValidLeaveStatus("pending")).toBe(true);
        expect(isValidLeaveStatus("approved")).toBe(true);
        expect(isValidLeaveStatus("rejected")).toBe(true);
        expect(isValidLeaveStatus("cancelled")).toBe(true);
        expect(isValidLeaveStatus("archived")).toBe(false);
        expect(isValidLeaveStatus(null)).toBe(false);
        expect(isValidLeaveStatus(undefined)).toBe(false);
    });
});

/* ───────────────────────────── Leave range math ─────────────────────────── */

describe("leaveDays", () => {
    it("counts a single-day request as 1 (inclusive)", () => {
        expect(leaveDays(NOW, NOW)).toBe(1);
    });

    it("counts both endpoints of a multi-day range", () => {
        // start today, end 4 days later → 5 calendar days
        expect(leaveDays(NOW, daysAhead(4))).toBe(5);
    });

    it("is 0 for an inverted range", () => {
        expect(leaveDays(daysAhead(4), NOW)).toBe(0);
    });

    it("is 0 when a date is missing or invalid", () => {
        expect(leaveDays(null, NOW)).toBe(0);
        expect(leaveDays(NOW, null)).toBe(0);
        expect(leaveDays("not-a-date", NOW)).toBe(0);
    });
});

describe("isValidLeaveRange", () => {
    it("accepts a well-formed range and rejects an inverted / empty one", () => {
        expect(isValidLeaveRange(NOW, daysAhead(2))).toBe(true);
        expect(isValidLeaveRange(NOW, NOW)).toBe(true);
        expect(isValidLeaveRange(daysAhead(2), NOW)).toBe(false);
        expect(isValidLeaveRange(null, NOW)).toBe(false);
    });
});

/* ─────────────────────────────── Payroll math ───────────────────────────── */

describe("toAmount", () => {
    it("coerces numbers, numeric strings and junk defensively", () => {
        expect(toAmount(1250)).toBe(1250);
        expect(toAmount("1250")).toBe(1250);
        expect(toAmount("1250.5")).toBe(1250.5);
        expect(toAmount("abc")).toBe(0);
        expect(toAmount(null)).toBe(0);
        expect(toAmount(undefined)).toBe(0);
        expect(toAmount(NaN)).toBe(0);
    });
});

describe("sumAdjustments", () => {
    it("sums coerced amounts and tolerates a missing / non-array list", () => {
        expect(sumAdjustments([{ amount: 100 }, { amount: "50" }, { amount: null }])).toBe(150);
        expect(sumAdjustments([])).toBe(0);
        expect(sumAdjustments(undefined)).toBe(0);
    });
});

describe("computeGross", () => {
    it("is base + allowances − deductions", () => {
        const line: PayLineInput = {
            basePay: 1000,
            allowances: [{ label: "Transport", amount: 200 }, { label: "Housing", amount: 300 }],
            deductions: [{ label: "Tax", amount: 150 }],
        };
        // 1000 + 500 − 150
        expect(computeGross(line)).toBe(1350);
    });

    it("floors a would-be-negative gross at 0", () => {
        expect(computeGross({ basePay: 100, deductions: [{ amount: 500 }] })).toBe(0);
    });

    it("treats missing base / adjustments as 0", () => {
        expect(computeGross({})).toBe(0);
        expect(computeGross({ allowances: [{ amount: 250 }] })).toBe(250);
    });

    it("coerces string amounts", () => {
        expect(computeGross({ basePay: "1000", allowances: [{ amount: "100" }], deductions: [{ amount: "50" }] })).toBe(1050);
    });
});

describe("computeLine", () => {
    it("returns the full breakdown with a floored gross", () => {
        expect(
            computeLine({ basePay: 800, allowances: [{ amount: 100 }], deductions: [{ amount: 50 }] }),
        ).toEqual({ base: 800, allowances: 100, deductions: 50, gross: 850 });

        expect(
            computeLine({ basePay: 100, deductions: [{ amount: 1000 }] }),
        ).toEqual({ base: 100, allowances: 0, deductions: 1000, gross: 0 });
    });
});

describe("computePayrollTotals", () => {
    it("sums each line's gross into the run total (the ledger-posted amount)", () => {
        const lines: PayLineInput[] = [
            { basePay: 1000, allowances: [{ amount: 200 }], deductions: [{ amount: 100 }] }, // 1100
            { basePay: 1500, allowances: [{ amount: 0 }], deductions: [{ amount: 300 }] },    // 1200
            { basePay: 500 },                                                                  // 500
        ];
        const totals = computePayrollTotals(lines);
        expect(totals.lineCount).toBe(3);
        expect(totals.totalBase).toBe(3000);
        expect(totals.totalAllowances).toBe(200);
        expect(totals.totalDeductions).toBe(400);
        expect(totals.totalGross).toBe(2800);
    });

    it("equals the sum of per-line computeGross results", () => {
        const lines: PayLineInput[] = [
            { basePay: 1234, allowances: [{ amount: 56 }], deductions: [{ amount: 78 }] },
            { basePay: 999, deductions: [{ amount: 2000 }] }, // floored to 0
        ];
        const expected = lines.reduce((acc, l) => acc + computeGross(l), 0);
        expect(computePayrollTotals(lines).totalGross).toBe(expected);
    });

    it("is all-zero for an empty / missing run", () => {
        expect(computePayrollTotals([])).toEqual({
            totalBase: 0, totalAllowances: 0, totalDeductions: 0, totalGross: 0, lineCount: 0,
        });
        expect(computePayrollTotals(undefined).totalGross).toBe(0);
    });

    it("never lets one line's negative push the run total below the others", () => {
        // a floored line contributes 0, not a negative, to the run total
        const lines: PayLineInput[] = [
            { basePay: 1000 },
            { basePay: 100, deductions: [{ amount: 999 }] }, // → 0
        ];
        expect(computePayrollTotals(lines).totalGross).toBe(1000);
    });
});

describe("isValidPayrollStatus", () => {
    it("recognises only draft / posted", () => {
        expect(isValidPayrollStatus("draft")).toBe(true);
        expect(isValidPayrollStatus("posted")).toBe(true);
        expect(isValidPayrollStatus("void")).toBe(false);
        expect(isValidPayrollStatus(null)).toBe(false);
    });
});

describe("canTransitionPayroll", () => {
    it("allows only draft → posted", () => {
        expect(canTransitionPayroll("draft", "posted")).toBe(true);
        expect(canTransitionPayroll("posted", "draft")).toBe(false);
        expect(canTransitionPayroll("draft", "draft")).toBe(false);
        expect(canTransitionPayroll("posted", "posted")).toBe(false);
    });
});

/* ──────────────────── Statutory / compensation / proration ──────────────── */

describe("toRate", () => {
    it("clamps into [0, 1] and zeroes garbage/negatives", () => {
        expect(toRate(0.075)).toBe(0.075);
        expect(toRate("0.1")).toBe(0.1);
        expect(toRate(1.5)).toBe(1);
        expect(toRate(-0.2)).toBe(0);
        expect(toRate("abc")).toBe(0);
        expect(toRate(null)).toBe(0);
    });
});

describe("computeStatutoryDeductions", () => {
    it("computes PAYE and pension off base + allowances, rounded to 2dp", () => {
        const { deductions, taxableBase } = computeStatutoryDeductions(
            { basePay: 1000, allowances: [{ amount: 200 }] },
            { taxRate: 0.1, pensionRate: 0.08 },
        );
        expect(taxableBase).toBe(1200);
        expect(deductions).toEqual([
            { label: "PAYE Tax", amount: 120 },
            { label: "Pension", amount: 96 },
        ]);
    });

    it("omits a statutory row when its rate is 0", () => {
        const { deductions } = computeStatutoryDeductions(
            { basePay: 1000 },
            { taxRate: 0, pensionRate: 0.05 },
        );
        expect(deductions).toEqual([{ label: "Pension", amount: 50 }]);
    });
});

describe("payLineFromProfile", () => {
    it("folds standing deductions with computed statutory deductions", () => {
        const line = payLineFromProfile({
            baseSalary: 2000,
            allowances: [{ label: "Transport", amount: 300 }],
            deductions: [{ label: "Loan", amount: 100 }],
            taxRate: 0.1,
            pensionRate: 0,
        });
        expect(line.basePay).toBe(2000);
        expect(line.allowances).toEqual([{ label: "Transport", amount: 300 }]);
        // standing Loan 100 + PAYE on (2000+300)=2300 × 0.1 = 230
        expect(line.deductions).toEqual([
            { label: "Loan", amount: 100 },
            { label: "PAYE Tax", amount: 230 },
        ]);
        // gross = 2000 + 300 − (100 + 230) = 1970
        expect(computeGross(line)).toBe(1970);
    });

    it("handles an empty profile without throwing", () => {
        const line = payLineFromProfile({});
        expect(line.basePay).toBe(0);
        expect(line.allowances).toEqual([]);
        expect(line.deductions).toEqual([]);
    });
});

describe("prorateByHours", () => {
    it("prorates base by worked / expected, capped at full base", () => {
        expect(prorateByHours(1600, 80, 160)).toBe(800);
        expect(prorateByHours(1600, 200, 160)).toBe(1600); // capped at 1.0 ratio
    });

    it("returns the base unchanged when expected hours are 0/invalid", () => {
        expect(prorateByHours(1600, 80, 0)).toBe(1600);
        expect(prorateByHours(1600, 80, null)).toBe(1600);
    });

    it("never returns a negative", () => {
        expect(prorateByHours(-500, 80, 160)).toBe(0);
    });
});
