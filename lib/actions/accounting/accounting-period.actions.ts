"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import AccountingPeriod from "../../models/accounting/accounting-period.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";

const SETTINGS_PATH = "/dashboard/account";

interface ConfigurePeriodInput {
    fiscalYear: number;
    periodNo: number; // 1..13
    start: Date | string;
    end: Date | string;
    status?: "open" | "closed";
}

/* ═══════════════════════════════ ACCOUNTING PERIODS ═══════════════════════════════ */

/**
 * Create or update a fiscal period (R7.1). Periods are keyed by
 * (fiscalYear, periodNo); configuring the same key again updates its dates and
 * status rather than creating a duplicate. The posting layer uses these ranges
 * to validate posting dates and the close/reopen soft lock. Gated by
 * `accountingSettings`.
 */
async function _configure(user: User, values: ConfigurePeriodInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const fiscalYear = Math.floor(Number(values.fiscalYear));
        const periodNo = Math.floor(Number(values.periodNo));
        if (!Number.isFinite(fiscalYear) || fiscalYear < 1) throw new Error("A valid fiscal year is required");
        if (!Number.isFinite(periodNo) || periodNo < 1 || periodNo > 13) {
            throw new Error("Period number must be between 1 and 13");
        }

        const start = new Date(values.start);
        const end = new Date(values.end);
        if (Number.isNaN(start.getTime())) throw new Error("Invalid period start date");
        if (Number.isNaN(end.getTime())) throw new Error("Invalid period end date");
        if (start > end) throw new Error("Period start must be on or before its end");

        const status = values.status === "closed" ? "closed" : "open";

        const existing = await AccountingPeriod.findOne({ fiscalYear, periodNo, del_flag: false });

        let period;
        let actionType: "ACCOUNTING_PERIOD_CONFIGURED" = "ACCOUNTING_PERIOD_CONFIGURED";
        if (existing) {
            existing.start = start;
            existing.end = end;
            existing.status = status;
            existing.mod_flag = true;
            existing.modifiedBy = user._id as never;
            existing.action_type = "updated";
            await existing.save();
            period = existing;
        } else {
            period = await AccountingPeriod.create({
                fiscalYear,
                periodNo,
                start,
                end,
                status,
                createdBy: user._id,
                action_type: "created",
            });
        }

        await History.create({
            actionType,
            details: { itemId: period._id, fiscalYear, periodNo, status },
            message: `${user.fullName} configured accounting period ${fiscalYear}-P${periodNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: period._id,
            entityType: "ACCOUNTING_PERIOD",
        });

        revalidatePath(SETTINGS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(period));
    } catch (error) {
        console.error("Error configuring accounting period:", error);
        throw error;
    }
}
export const configure = await withAuth(_configure, "accountingSettings");

/**
 * Close a fiscal period (R7.2). Closing is a reopenable soft lock: once closed,
 * the posting layer blocks any entry dated inside the period until it is
 * reopened. It does not delete or archive anything. Gated by
 * `accountingSettings`.
 */
async function _close(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A period is required");
        await connectToDB();

        const period = await AccountingPeriod.findById(id);
        if (!period || period.del_flag) throw new Error("Accounting period not found");
        if (period.status === "closed") throw new Error("This period is already closed");

        period.status = "closed";
        period.closedBy = user._id as never;
        period.closedAt = new Date();
        period.mod_flag = true;
        period.modifiedBy = user._id as never;
        period.action_type = "updated";
        await period.save();

        await History.create({
            actionType: "ACCOUNTING_PERIOD_CLOSED",
            details: { itemId: period._id, fiscalYear: period.fiscalYear, periodNo: period.periodNo },
            message: `${user.fullName} closed accounting period ${period.fiscalYear}-P${period.periodNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: period._id,
            entityType: "ACCOUNTING_PERIOD",
        });

        revalidatePath(SETTINGS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(period));
    } catch (error) {
        console.error("Error closing accounting period:", error);
        throw error;
    }
}
export const close = await withAuth(_close, "accountingSettings");

/**
 * Reopen a closed fiscal period (R7.2). This lifts the soft lock so entries
 * dated inside the period can be posted again. The close metadata is cleared.
 * Gated by `accountingSettings`.
 */
async function _reopen(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A period is required");
        await connectToDB();

        const period = await AccountingPeriod.findById(id);
        if (!period || period.del_flag) throw new Error("Accounting period not found");
        if (period.status === "open") throw new Error("This period is already open");

        period.status = "open";
        period.closedBy = null as never;
        period.closedAt = null;
        period.mod_flag = true;
        period.modifiedBy = user._id as never;
        period.action_type = "updated";
        await period.save();

        await History.create({
            actionType: "ACCOUNTING_PERIOD_REOPENED",
            details: { itemId: period._id, fiscalYear: period.fiscalYear, periodNo: period.periodNo },
            message: `${user.fullName} reopened accounting period ${period.fiscalYear}-P${period.periodNo} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: period._id,
            entityType: "ACCOUNTING_PERIOD",
        });

        revalidatePath(SETTINGS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(period));
    } catch (error) {
        console.error("Error reopening accounting period:", error);
        throw error;
    }
}
export const reopen = await withAuth(_reopen, "accountingSettings");

interface ListPeriodInput {
    fiscalYear?: number;
    status?: "open" | "closed" | "all";
}

/**
 * List configured periods for a fiscal year (or all years), ordered by period
 * number so the settings UI can render the calendar. Gated by
 * `accountingSettings`.
 */
async function _list(user: User, filter?: ListPeriodInput) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const query: Record<string, unknown> = { del_flag: false };
        if (filter?.fiscalYear) query.fiscalYear = Math.floor(Number(filter.fiscalYear));
        if (filter?.status && filter.status !== "all") query.status = filter.status;

        const periods = await AccountingPeriod.find(query)
            .sort({ fiscalYear: -1, periodNo: 1 })
            .lean();
        return JSON.parse(JSON.stringify(periods || []));
    } catch (error) {
        console.error("Error listing accounting periods:", error);
        return [];
    }
}
export const list = await withAuth(_list, "accountingSettings");
