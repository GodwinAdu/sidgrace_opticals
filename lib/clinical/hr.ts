/**
 * Pure HR & payroll helpers.
 *
 * Kept free of DB / React so the leave-request status machine and the payroll
 * math can be unit-tested in isolation and shared between the server actions
 * and the HR view (Requirement 9).
 *
 * Two concerns live here:
 *
 *  1. Leave-request workflow — a small status machine:
 *
 *         pending ──▶ approved     (manager signs off)
 *            └──────▶ rejected     (manager declines)
 *            └──────▶ cancelled    (requester withdraws)
 *
 *     approved / rejected / cancelled are all terminal.
 *
 *  2. Payroll math — the gross pay for one staff line and the totals for a run.
 *     Gross = base + Σ allowances − Σ deductions, floored at zero (a line can
 *     never pay a negative wage). The run total is the sum of the line grosses.
 *     All amounts are treated as plain numbers (minor-unit agnostic) and every
 *     input is coerced defensively so a stray string / NaN never poisons a
 *     payslip.
 */

/* ───────────────────────────── Leave workflow ───────────────────────────── */

/** Lifecycle state of a leave request. */
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export const LEAVE_STATUSES: { value: LeaveStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
];

/** Common leave types (free-form `other` kept open for anything else). */
export type LeaveType = "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "other";

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
    { value: "annual", label: "Annual" },
    { value: "sick", label: "Sick" },
    { value: "maternity", label: "Maternity" },
    { value: "paternity", label: "Paternity" },
    { value: "unpaid", label: "Unpaid" },
    { value: "other", label: "Other" },
];

/**
 * Allowed leave status transitions. A pending request may be approved,
 * rejected or cancelled; every other state is terminal.
 */
const LEAVE_TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
    pending: ["approved", "rejected", "cancelled"],
    approved: [],
    rejected: [],
    cancelled: [],
};

/** True when `from → to` is an allowed leave status transition. */
export function canTransitionLeave(from: LeaveStatus, to: LeaveStatus): boolean {
    if (from === to) return false;
    return (LEAVE_TRANSITIONS[from] ?? []).includes(to);
}

/** The statuses a request in `from` may legally move to (for building the UI). */
export function nextLeaveStatuses(from: LeaveStatus): LeaveStatus[] {
    return [...(LEAVE_TRANSITIONS[from] ?? [])];
}

/** True when a leave request has reached a terminal state (no further moves). */
export function isTerminalLeave(status: LeaveStatus): boolean {
    return (LEAVE_TRANSITIONS[status] ?? []).length === 0;
}

/** True when `value` is a recognised leave status. */
export function isValidLeaveStatus(value?: string | null): value is LeaveStatus {
    return value === "pending" || value === "approved" || value === "rejected" || value === "cancelled";
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalise any date-ish input to epoch ms, or null when invalid. */
function toTime(value?: Date | string | number | null): number | null {
    if (value === null || value === undefined) return null;
    const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
}

/**
 * Inclusive whole-day span of a leave request (both endpoints counted).
 *
 * A single-day request (start === end) is 1 day. Returns 0 when either date is
 * missing / invalid, or when the range is inverted (end before start) — the
 * caller is expected to reject such a range, this just never returns a
 * negative count.
 */
export function leaveDays(
    start?: Date | string | number | null,
    end?: Date | string | number | null,
): number {
    const s = toTime(start);
    const e = toTime(end);
    if (s === null || e === null) return 0;
    const startDay = Math.floor(s / MS_PER_DAY);
    const endDay = Math.floor(e / MS_PER_DAY);
    if (endDay < startDay) return 0;
    return endDay - startDay + 1;
}

/** True when `[start, end]` is a usable (non-inverted, well-formed) range. */
export function isValidLeaveRange(
    start?: Date | string | number | null,
    end?: Date | string | number | null,
): boolean {
    return leaveDays(start, end) > 0;
}

/* ─────────────────────────────── Payroll math ───────────────────────────── */

/** A single named money adjustment on a payslip line (allowance or deduction). */
export interface PayAdjustment {
    label?: string;
    amount?: number | string | null;
}

/** The input shape for computing one staff member's pay for a period. */
export interface PayLineInput {
    basePay?: number | string | null;
    allowances?: PayAdjustment[];
    deductions?: PayAdjustment[];
}

/** Coerce any amount-ish value to a finite number, defaulting to 0. */
export function toAmount(value?: number | string | null): number {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}

/** Sum the (coerced) amounts of a list of adjustments. */
export function sumAdjustments(items?: PayAdjustment[]): number {
    if (!Array.isArray(items)) return 0;
    return items.reduce((acc, it) => acc + toAmount(it?.amount), 0);
}

/**
 * Gross pay for one line:
 *
 *     gross = max(0, base + Σ allowances − Σ deductions)
 *
 * Negative base, allowances or deductions are tolerated arithmetically but the
 * final gross is floored at 0 so a payslip can never owe the employer money.
 */
export function computeGross(line: PayLineInput): number {
    const base = toAmount(line?.basePay);
    const allowances = sumAdjustments(line?.allowances);
    const deductions = sumAdjustments(line?.deductions);
    const gross = base + allowances - deductions;
    return gross > 0 ? gross : 0;
}

/** Per-line breakdown produced for a payroll run. */
export interface PayLineResult {
    base: number;
    allowances: number;
    deductions: number;
    gross: number;
}

/** Expand a line input into its arithmetic breakdown (base/allowances/.../gross). */
export function computeLine(line: PayLineInput): PayLineResult {
    const base = toAmount(line?.basePay);
    const allowances = sumAdjustments(line?.allowances);
    const deductions = sumAdjustments(line?.deductions);
    const gross = base + allowances - deductions;
    return { base, allowances, deductions, gross: gross > 0 ? gross : 0 };
}

/** Totals for a whole payroll run. */
export interface PayrollTotals {
    totalBase: number;
    totalAllowances: number;
    totalDeductions: number;
    totalGross: number;
    lineCount: number;
}

/**
 * Compute the run total as the sum of every line's gross (plus the component
 * subtotals for reporting). The `totalGross` is the amount posted to the ledger
 * as a payroll expense.
 */
export function computePayrollTotals(lines?: PayLineInput[]): PayrollTotals {
    const safe = Array.isArray(lines) ? lines : [];
    return safe.reduce<PayrollTotals>(
        (acc, line) => {
            const r = computeLine(line);
            return {
                totalBase: acc.totalBase + r.base,
                totalAllowances: acc.totalAllowances + r.allowances,
                totalDeductions: acc.totalDeductions + r.deductions,
                totalGross: acc.totalGross + r.gross,
                lineCount: acc.lineCount + 1,
            };
        },
        { totalBase: 0, totalAllowances: 0, totalDeductions: 0, totalGross: 0, lineCount: 0 },
    );
}

/* ───────────────────────────── Payroll run status ───────────────────────── */

/**
 * Lifecycle state of a payroll run:
 *
 *     draft ──▶ posted     (an approver posts the run; the ledger expense is
 *                           booked at this transition, never while draft)
 *
 * `posted` is terminal (a posted run is reversed by deletion, not un-posted).
 */
export type PayrollStatus = "draft" | "posted";

export const PAYROLL_STATUSES: { value: PayrollStatus; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "posted", label: "Posted" },
];

/** True when `value` is a recognised payroll-run status. */
export function isValidPayrollStatus(value?: string | null): value is PayrollStatus {
    return value === "draft" || value === "posted";
}

/** True when `from → to` is an allowed payroll-run transition (only draft→posted). */
export function canTransitionPayroll(from: PayrollStatus, to: PayrollStatus): boolean {
    return from === "draft" && to === "posted";
}

/* ─────────────────────── Compensation profile & statutory ───────────────── */

/**
 * A staff member's standing compensation profile — the recurring figures a
 * payroll run prefills each period so an operator never re-keys a salary. All
 * amounts are plain numbers (minor-unit agnostic) and coerced defensively.
 */
export interface CompensationProfile {
    baseSalary?: number | string | null;
    allowances?: PayAdjustment[];
    deductions?: PayAdjustment[];
    /** Statutory rates applied on top of the standing deductions (0..1 each). */
    taxRate?: number | string | null;
    pensionRate?: number | string | null;
}

/** Clamp any rate-ish value into the inclusive [0, 1] range (0 on garbage). */
export function toRate(value?: number | string | null): number {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n > 1 ? 1 : n;
}

/**
 * Statutory deductions derived from a taxable base (base + allowances):
 *
 *     PAYE    = taxableBase × taxRate
 *     Pension = taxableBase × pensionRate
 *
 * Returns labelled {@link PayAdjustment}s (rounded to 2 dp) ready to append to a
 * line's `deductions[]`, plus the taxable base they were computed from. A zero
 * rate yields no row for that statutory item.
 */
export function computeStatutoryDeductions(
    line: PayLineInput,
    rates: { taxRate?: number | string | null; pensionRate?: number | string | null },
): { deductions: PayAdjustment[]; taxableBase: number } {
    const base = toAmount(line?.basePay);
    const allowances = sumAdjustments(line?.allowances);
    const taxableBase = base + allowances;
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const out: PayAdjustment[] = [];
    const tax = round2(taxableBase * toRate(rates?.taxRate));
    if (tax > 0) out.push({ label: "PAYE Tax", amount: tax });
    const pension = round2(taxableBase * toRate(rates?.pensionRate));
    if (pension > 0) out.push({ label: "Pension", amount: pension });

    return { deductions: out, taxableBase };
}

/**
 * Build a ready-to-run payroll line from a compensation profile, folding the
 * standing deductions together with the computed statutory ones. Pure: the
 * caller (server action or UI) decides what to do with the result.
 */
export function payLineFromProfile(profile: CompensationProfile): Required<PayLineInput> {
    const allowances = Array.isArray(profile?.allowances) ? profile.allowances : [];
    const standingDeductions = Array.isArray(profile?.deductions) ? profile.deductions : [];
    const { deductions: statutory } = computeStatutoryDeductions(
        { basePay: profile?.baseSalary, allowances },
        { taxRate: profile?.taxRate, pensionRate: profile?.pensionRate },
    );
    return {
        basePay: toAmount(profile?.baseSalary),
        allowances: allowances.map((a) => ({ label: a?.label || "", amount: toAmount(a?.amount) })),
        deductions: [
            ...standingDeductions.map((d) => ({ label: d?.label || "", amount: toAmount(d?.amount) })),
            ...statutory,
        ],
    };
}

/**
 * Prorate a monthly base salary by hours actually worked in the period:
 *
 *     prorated = base × min(1, workedHours / expectedHours)
 *
 * Used to link timesheets to pay. When `expectedHours` is 0/invalid the base is
 * returned unchanged (no proration). Never returns a negative figure.
 */
export function prorateByHours(
    base: number | string | null | undefined,
    workedHours: number | string | null | undefined,
    expectedHours: number | string | null | undefined,
): number {
    const b = toAmount(base);
    const worked = Math.max(0, toAmount(workedHours));
    const expected = toAmount(expectedHours);
    if (expected <= 0) return b < 0 ? 0 : b;
    const ratio = Math.min(1, worked / expected);
    const out = b * ratio;
    return out > 0 ? Math.round(out * 100) / 100 : 0;
}
