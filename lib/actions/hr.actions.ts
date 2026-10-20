"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { LeaveRequest, Timesheet, PayrollRun } from "../models/hr.models";
import Staff from "../models/staff.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import { postLedgerEntry, reverseLedgerEntry } from "./accounting/bridge.actions";
import {
    canTransitionLeave,
    isValidLeaveStatus,
    isValidLeaveRange,
    leaveDays,
    computeLine,
    computePayrollTotals,
    payLineFromProfile,
    type LeaveStatus,
    type LeaveType,
    type PayLineInput,
    type CompensationProfile,
} from "../clinical/hr";

const HR_PATH = "/dashboard/hr";

/* ══════════════════════════════ LEAVE REQUESTS ═════════════════════════════ */

interface CreateLeaveInput {
    staffId: string;
    type?: LeaveType;
    startDate: Date | string;
    endDate: Date | string;
    reason?: string;
}

/**
 * File a staff leave request (Requirement 9, criterion 1). Captures a type and
 * an inclusive date range and opens the request in the `pending` state; the
 * day-count is derived from the range by the pure helper. Gated by
 * `hrManagement`.
 */
async function _createLeaveRequest(user: User, values: CreateLeaveInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.staffId) throw new Error("A staff member is required");
        if (!isValidLeaveRange(values.startDate, values.endDate)) {
            throw new Error("Provide a valid leave date range (end on or after start)");
        }
        await connectToDB();

        const staff = await Staff.findById(values.staffId).select("fullName").lean();
        if (!staff) throw new Error("Staff member not found");

        const leave = await LeaveRequest.create({
            staffId: values.staffId,
            type: values.type || "annual",
            startDate: new Date(values.startDate),
            endDate: new Date(values.endDate),
            days: leaveDays(values.startDate, values.endDate),
            reason: values.reason?.trim() || "",
            status: "pending",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "LEAVE_REQUEST_CREATED",
            details: { itemId: leave._id, staffId: values.staffId },
            message: `${user.fullName} filed a ${leave.type} leave request for ${(staff as { fullName?: string }).fullName || "a staff member"} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: leave._id,
            entityType: "LEAVE_REQUEST",
        });

        revalidatePath(HR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(leave));
    } catch (error) {
        console.error("Error creating leave request:", error);
        throw error;
    }
}
export const createLeaveRequest = await withAuth(_createLeaveRequest, "hrManagement");

async function _getLeaveRequests(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const leaves = await LeaveRequest.find(query)
            .populate("staffId", "fullName role")
            .populate("approver", "fullName")
            .sort({ createdAt: -1 })
            .limit(300)
            .lean();
        return JSON.parse(JSON.stringify(leaves || []));
    } catch (error) {
        console.error("Error fetching leave requests:", error);
        return [];
    }
}
export const getLeaveRequests = await withAuth(_getLeaveRequests);

/**
 * Advance a leave request through its approval workflow (Requirement 9,
 * criterion 1): pending → approved / rejected / cancelled. The move is
 * validated against the pure status machine so an illegal transition can never
 * be persisted; the approver and decision time are stamped. Gated by
 * `hrManagement`.
 */
async function _decideLeaveRequest(
    user: User,
    id: string,
    status: LeaveStatus,
    decisionNote?: string,
    path?: string,
) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A leave request is required");
        if (!isValidLeaveStatus(status)) throw new Error("Invalid leave status");
        await connectToDB();

        const leave = await LeaveRequest.findById(id);
        if (!leave) throw new Error("Leave request not found");

        if (!canTransitionLeave(leave.status as LeaveStatus, status)) {
            throw new Error(`Cannot move a leave request from ${leave.status} to ${status}`);
        }

        leave.status = status;
        leave.approver = user._id as never;
        leave.decidedAt = new Date();
        leave.decisionNote = decisionNote?.trim() || "";
        leave.mod_flag = true;
        leave.modifiedBy = user._id as never;
        leave.action_type = "updated";
        await leave.save();

        await History.create({
            actionType: "LEAVE_REQUEST_STATUS_CHANGED",
            details: { itemId: leave._id, status },
            message: `${user.fullName} ${status} a leave request on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: leave._id,
            entityType: "LEAVE_REQUEST",
        });

        revalidatePath(HR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(leave));
    } catch (error) {
        console.error("Error deciding leave request:", error);
        throw error;
    }
}
export const decideLeaveRequest = await withAuth(_decideLeaveRequest, "hrManagement");

async function _deleteLeaveRequest(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const leave = await LeaveRequest.findById(id);
        if (!leave || !leave._id) throw new Error("Leave request not found");

        await deleteDocument({
            actionType: "LEAVE_REQUEST_DELETED",
            documentId: leave._id.toString(),
            collectionName: "LeaveRequest",
            userId: `${user._id}`,
            trashMessage: `Leave request was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a leave request on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(HR_PATH);
        return { success: true, message: "Leave request deleted successfully" };
    } catch (error) {
        console.error("Error deleting leave request:", error);
        throw error;
    }
}
export const deleteLeaveRequest = await withAuth(_deleteLeaveRequest, "hrManagement");

/* ═══════════════════════════════ TIMESHEETS ════════════════════════════════ */

interface CreateTimesheetInput {
    staffId: string;
    date?: Date | string;
    clockIn?: Date | string | null;
    clockOut?: Date | string | null;
    hours?: number;
    note?: string;
}

/**
 * Record a staff time / attendance entry (Requirement 9, criterion 2). Accepts
 * either a clock-in/out pair or a plain daily-hours entry; when both ends of a
 * clock pair are given and no explicit hours, the worked hours are derived from
 * the span. Gated by `hrManagement`.
 */
async function _recordTimesheet(user: User, values: CreateTimesheetInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.staffId) throw new Error("A staff member is required");
        await connectToDB();

        const staff = await Staff.findById(values.staffId).select("fullName").lean();
        if (!staff) throw new Error("Staff member not found");

        const clockIn = values.clockIn ? new Date(values.clockIn) : null;
        const clockOut = values.clockOut ? new Date(values.clockOut) : null;

        let hours = Math.max(0, Number(values.hours) || 0);
        if (!hours && clockIn && clockOut && clockOut.getTime() > clockIn.getTime()) {
            hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        }

        const entry = await Timesheet.create({
            staffId: values.staffId,
            date: values.date ? new Date(values.date) : new Date(),
            clockIn,
            clockOut,
            hours: Math.round(hours * 100) / 100,
            note: values.note?.trim() || "",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "TIMESHEET_CREATED",
            details: { itemId: entry._id, staffId: values.staffId },
            message: `${user.fullName} recorded a timesheet entry for ${(staff as { fullName?: string }).fullName || "a staff member"} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: entry._id,
            entityType: "TIMESHEET",
        });

        revalidatePath(HR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(entry));
    } catch (error) {
        console.error("Error recording timesheet:", error);
        throw error;
    }
}
export const recordTimesheet = await withAuth(_recordTimesheet, "hrManagement");

async function _getTimesheets(user: User, staffId?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (staffId && staffId !== "all") query.staffId = staffId;
        const entries = await Timesheet.find(query)
            .populate("staffId", "fullName role")
            .sort({ date: -1 })
            .limit(300)
            .lean();
        return JSON.parse(JSON.stringify(entries || []));
    } catch (error) {
        console.error("Error fetching timesheets:", error);
        return [];
    }
}
export const getTimesheets = await withAuth(_getTimesheets);

async function _deleteTimesheet(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const entry = await Timesheet.findById(id);
        if (!entry || !entry._id) throw new Error("Timesheet entry not found");

        await deleteDocument({
            actionType: "TIMESHEET_DELETED",
            documentId: entry._id.toString(),
            collectionName: "Timesheet",
            userId: `${user._id}`,
            trashMessage: `Timesheet entry was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted a timesheet entry on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(HR_PATH);
        return { success: true, message: "Timesheet entry deleted successfully" };
    } catch (error) {
        console.error("Error deleting timesheet:", error);
        throw error;
    }
}
export const deleteTimesheet = await withAuth(_deleteTimesheet, "hrManagement");

/* ═══════════════════════════════ PAYROLL RUNS ══════════════════════════════ */

interface PayrollLineInput {
    staffId: string;
    staffName?: string;
    basePay?: number | string;
    allowances?: { label?: string; amount?: number | string }[];
    deductions?: { label?: string; amount?: number | string }[];
}

interface CreatePayrollRunInput {
    periodLabel?: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    lines: PayrollLineInput[];
    note?: string;
    /**
     * Whether to post the run to the ledger immediately ("posted", the default,
     * preserving prior behaviour) or save it for later approval ("draft"). A
     * draft books no ledger expense until `postPayrollRun` is called.
     */
    status?: "draft" | "posted";
}

/** Build the computed, persisted line + totals from raw payroll inputs. */
function buildPayrollLines(rawLines: PayrollLineInput[]) {
    const lines = rawLines.map((line) => {
        const input: PayLineInput = {
            basePay: line.basePay,
            allowances: line.allowances,
            deductions: line.deductions,
        };
        const r = computeLine(input);
        return {
            staffId: line.staffId,
            staffName: line.staffName?.trim() || "",
            basePay: r.base,
            allowances: (line.allowances || []).map((a) => ({
                label: a.label?.trim() || "",
                amount: Number(a.amount) || 0,
            })),
            deductions: (line.deductions || []).map((d) => ({
                label: d.label?.trim() || "",
                amount: Number(d.amount) || 0,
            })),
            gross: r.gross,
        };
    });
    const totals = computePayrollTotals(
        rawLines.map((l) => ({
            basePay: l.basePay,
            allowances: l.allowances,
            deductions: l.deductions,
        })),
    );
    return { lines, totals };
}

/**
 * Post a payroll run's gross to the accounting ledger as a cash-basis expense
 * (category "Payroll", which the bridge routes to the dedicated `payrollExpense`
 * account). Returns the JE id (or null). Shared by immediate-post creation and
 * the draft → post transition so the posting path is identical.
 */
async function postPayrollToLedger(
    user: User,
    runNumber: string,
    periodLabel: string,
    totalGross: number,
    periodEnd: Date | string,
): Promise<string | null> {
    if (totalGross <= 0) return null;
    const txn = await postLedgerEntry(user, {
        type: "expense",
        category: "Payroll",
        amount: totalGross,
        accountName: "Operating Expenses",
        source: "manual",
        description: `Payroll ${runNumber}${periodLabel ? ` (${periodLabel})` : ""}`,
        date: new Date(periodEnd).toISOString(),
    });
    return txn?._id ? String(txn._id) : null;
}

async function generatePayrollRunNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`payroll-${year}`);
    return `PAY-${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * Run payroll for a period (Requirement 9, criterion 3). Each line's gross is
 * computed by the pure helper (`max(0, base + allowances − deductions)`) and
 * the run totals are summed from the lines. The run's gross total is posted to
 * the accounting ledger as a cash-basis expense via `postLedgerEntry` (same
 * path other expense posts use); the resulting transaction id is stored so the
 * entry can be reversed if the run is later deleted. Gated by
 * `payrollManagement`.
 */
async function _createPayrollRun(user: User, values: CreatePayrollRunInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.periodStart || !values?.periodEnd) throw new Error("A pay period is required");
        if (!Array.isArray(values.lines) || values.lines.length === 0) {
            throw new Error("Add at least one staff line to the payroll run");
        }
        await connectToDB();

        const { lines, totals } = buildPayrollLines(values.lines);

        const runNumber = await generatePayrollRunNumber();
        const periodLabel = values.periodLabel?.trim() || "";
        const asDraft = values.status === "draft";

        // Post the payroll cost to the ledger unless the run is saved as a draft
        // (drafts book no expense until explicitly posted via postPayrollRun).
        const transactionId = asDraft
            ? null
            : await postPayrollToLedger(user, runNumber, periodLabel, totals.totalGross, values.periodEnd);

        const run = await PayrollRun.create({
            runNumber,
            periodLabel,
            periodStart: new Date(values.periodStart),
            periodEnd: new Date(values.periodEnd),
            lines,
            totalBase: totals.totalBase,
            totalAllowances: totals.totalAllowances,
            totalDeductions: totals.totalDeductions,
            totalGross: totals.totalGross,
            status: asDraft ? "draft" : "posted",
            transactionId,
            note: values.note?.trim() || "",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "PAYROLL_RUN_CREATED",
            details: { itemId: run._id, runNumber, totalGross: totals.totalGross, status: run.status },
            message: `${user.fullName} ${asDraft ? "drafted" : "ran"} payroll ${runNumber} (${totals.lineCount} staff, total ${totals.totalGross}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: run._id,
            entityType: "PAYROLL_RUN",
        });

        revalidatePath(HR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(run));
    } catch (error) {
        console.error("Error creating payroll run:", error);
        throw error;
    }
}
export const createPayrollRun = await withAuth(_createPayrollRun, "payrollManagement");

/**
 * Post a draft payroll run: books the ledger expense (idempotently — a run that
 * already has a `transactionId` is not double-posted) and flips `status` to
 * "posted". Only `draft → posted` is allowed. Gated by `payrollManagement`.
 */
async function _postPayrollRun(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A payroll run is required");
        await connectToDB();

        const run = await PayrollRun.findById(id);
        if (!run || run.del_flag) throw new Error("Payroll run not found");
        if (run.status === "posted") throw new Error("This payroll run is already posted");

        // Book the ledger expense only if one was not already booked.
        if (!run.transactionId && Number(run.totalGross) > 0) {
            const txnId = await postPayrollToLedger(
                user,
                run.runNumber,
                run.periodLabel || "",
                Number(run.totalGross) || 0,
                run.periodEnd,
            );
            run.transactionId = (txnId as never) || null;
        }

        run.status = "posted";
        run.mod_flag = true;
        run.modifiedBy = user._id as never;
        run.action_type = "updated";
        await run.save();

        await History.create({
            actionType: "PAYROLL_RUN_POSTED",
            details: { itemId: run._id, runNumber: run.runNumber, totalGross: run.totalGross },
            message: `${user.fullName} posted payroll ${run.runNumber} to the ledger on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: run._id,
            entityType: "PAYROLL_RUN",
        });

        revalidatePath(HR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(run));
    } catch (error) {
        console.error("Error posting payroll run:", error);
        throw error;
    }
}
export const postPayrollRun = await withAuth(_postPayrollRun, "payrollManagement");

/**
 * Derive the payslips for a payroll run (one per line). Pure read — payslips are
 * materialised from the run's stored `lines[]`, so they stay consistent with the
 * posted figures without a second collection to keep in sync. Gated by
 * `payrollManagement`.
 */
async function _getPayslipsForRun(user: User, runId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!runId) throw new Error("A payroll run is required");
        await connectToDB();

        const run = await PayrollRun.findById(runId).lean();
        if (!run || run.del_flag) throw new Error("Payroll run not found");

        const payslips = (run.lines || []).map((l) => ({
            runId: String(run._id),
            runNumber: run.runNumber,
            periodLabel: run.periodLabel || "",
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
            status: run.status,
            staffId: l.staffId ? String(l.staffId) : "",
            staffName: l.staffName || "",
            basePay: Number(l.basePay) || 0,
            allowances: (l.allowances || []).map((a) => ({ label: a.label || "", amount: Number(a.amount) || 0 })),
            deductions: (l.deductions || []).map((d) => ({ label: d.label || "", amount: Number(d.amount) || 0 })),
            gross: Number(l.gross) || 0,
        }));

        return JSON.parse(JSON.stringify(payslips));
    } catch (error) {
        console.error("Error building payslips:", error);
        return [];
    }
}
export const getPayslipsForRun = await withAuth(_getPayslipsForRun, "payrollManagement");

/* ───────────────────────── COMPENSATION PROFILES ──────────────────────────── */

interface CompensationInput {
    baseSalary?: number | string;
    allowances?: { label?: string; amount?: number | string }[];
    deductions?: { label?: string; amount?: number | string }[];
    taxRate?: number | string;
    pensionRate?: number | string;
    expectedMonthlyHours?: number | string;
}

/**
 * Set a staff member's standing compensation profile (base salary, recurring
 * allowances / deductions, statutory rates, expected monthly hours). This is
 * what a payroll run prefills from. Gated by `payrollManagement`.
 */
async function _setCompensation(user: User, staffId: string, values: CompensationInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!staffId) throw new Error("A staff member is required");
        await connectToDB();

        const staff = await Staff.findById(staffId);
        if (!staff || staff.del_flag) throw new Error("Staff member not found");

        const clampRate = (v?: number | string) => {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) return 0;
            return n > 1 ? 1 : n;
        };

        staff.set("compensation", {
            baseSalary: Math.max(0, Number(values.baseSalary) || 0),
            allowances: (values.allowances || [])
                .filter((a) => a && (a.label || a.amount))
                .map((a) => ({ label: a.label?.trim() || "", amount: Number(a.amount) || 0 })),
            deductions: (values.deductions || [])
                .filter((d) => d && (d.label || d.amount))
                .map((d) => ({ label: d.label?.trim() || "", amount: Number(d.amount) || 0 })),
            taxRate: clampRate(values.taxRate),
            pensionRate: clampRate(values.pensionRate),
            expectedMonthlyHours: Math.max(0, Number(values.expectedMonthlyHours) || 0),
        });
        staff.mod_flag = true;
        staff.modifiedBy = user._id as never;
        staff.action_type = "updated";
        await staff.save();

        await History.create({
            actionType: "STAFF_COMPENSATION_UPDATED",
            details: { itemId: staff._id },
            message: `${user.fullName} updated the compensation profile for ${staff.fullName} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: staff._id,
            entityType: "STAFF",
        });

        revalidatePath(HR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(staff.compensation || {}));
    } catch (error) {
        console.error("Error setting compensation profile:", error);
        throw error;
    }
}
export const setCompensation = await withAuth(_setCompensation, "payrollManagement");

/**
 * Prefill payroll lines for a period from every active staff member's standing
 * compensation profile, folding in statutory PAYE / pension via the pure
 * helper. Staff without a profile are skipped. Gated by `payrollManagement`.
 */
async function _prefillPayrollLines(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const staff = await Staff.find({ del_flag: false, isActive: true })
            .select("fullName compensation")
            .lean();

        const lines = (staff || [])
            .filter((s) => s.compensation && Number(s.compensation.baseSalary) > 0)
            .map((s) => {
                const built = payLineFromProfile(s.compensation as CompensationProfile);
                return {
                    staffId: String(s._id),
                    staffName: s.fullName || "",
                    basePay: built.basePay,
                    allowances: built.allowances,
                    deductions: built.deductions,
                };
            });

        return JSON.parse(JSON.stringify(lines));
    } catch (error) {
        console.error("Error prefilling payroll lines:", error);
        return [];
    }
}
export const prefillPayrollLines = await withAuth(_prefillPayrollLines, "payrollManagement");

async function _getPayrollRuns(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const runs = await PayrollRun.find({ del_flag: false })
            .populate("createdBy", "fullName")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return JSON.parse(JSON.stringify(runs || []));
    } catch (error) {
        console.error("Error fetching payroll runs:", error);
        return [];
    }
}
export const getPayrollRuns = await withAuth(_getPayrollRuns);

/**
 * Delete a payroll run and reverse its ledger expense (mirrors the inventory
 * purchase delete). The posted transaction is reversed first (balance restored,
 * transaction soft-deleted) and then the run document is moved to trash. Gated
 * by `payrollManagement`.
 */
async function _deletePayrollRun(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const run = await PayrollRun.findById(id);
        if (!run || !run._id) throw new Error("Payroll run not found");

        // Reverse the accounting expense first (if one was posted).
        if (run.transactionId) {
            await reverseLedgerEntry(user, String(run.transactionId));
        }

        await deleteDocument({
            actionType: "PAYROLL_RUN_DELETED",
            documentId: run._id.toString(),
            collectionName: "PayrollRun",
            userId: `${user._id}`,
            trashMessage: `Payroll run ${run.runNumber} was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted payroll run ${run.runNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(HR_PATH);
        return { success: true, message: "Payroll run deleted successfully" };
    } catch (error) {
        console.error("Error deleting payroll run:", error);
        throw error;
    }
}
export const deletePayrollRun = await withAuth(_deletePayrollRun, "payrollManagement");
