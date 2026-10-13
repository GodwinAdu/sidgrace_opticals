"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { LeaveRequest, Timesheet, PayrollRun } from "../models/hr.models";
import Staff from "../models/staff.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import { postLedgerEntry, reverseLedgerEntry } from "./transaction.actions";
import {
    canTransitionLeave,
    isValidLeaveStatus,
    isValidLeaveRange,
    leaveDays,
    computeLine,
    computePayrollTotals,
    type LeaveStatus,
    type LeaveType,
    type PayLineInput,
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

        // Build the computed lines from the (defensively coerced) inputs.
        const lines = values.lines.map((line) => {
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
            values.lines.map((l) => ({
                basePay: l.basePay,
                allowances: l.allowances,
                deductions: l.deductions,
            })),
        );

        const runNumber = await generatePayrollRunNumber();
        const periodLabel = values.periodLabel?.trim() || "";

        // Post the payroll cost to the ledger as a cash-basis expense.
        const txn = totals.totalGross > 0
            ? await postLedgerEntry(user, {
                type: "expense",
                category: "Payroll",
                amount: totals.totalGross,
                accountName: "Operating Expenses",
                source: "manual",
                description: `Payroll ${runNumber}${periodLabel ? ` (${periodLabel})` : ""}`,
                date: new Date(values.periodEnd).toISOString(),
            })
            : null;

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
            status: "posted",
            transactionId: txn?._id || null,
            note: values.note?.trim() || "",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "PAYROLL_RUN_CREATED",
            details: { itemId: run._id, runNumber, totalGross: totals.totalGross },
            message: `${user.fullName} ran payroll ${runNumber} (${totals.lineCount} staff, total ${totals.totalGross}) on ${new Date().toLocaleString()}.`,
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
