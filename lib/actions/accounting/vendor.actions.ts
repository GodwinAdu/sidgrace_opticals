"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import Vendor from "../../models/accounting/vendor.models";
import Expense from "../../models/accounting/expense.models";
import JournalEntry from "../../models/accounting/journal-entry.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";
import { vendorSpend, type StatementRow, type AccountType } from "../../accounting/statements";

const VENDOR_PATH = "/dashboard/account";

/* ════════════════════════════════ VENDORS ════════════════════════════════ */

interface CreateVendorInput {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    paymentTerms?: string;
    payableAccountId?: string | null;
}

/**
 * Create a vendor (R11.1). Only a name is required; contact, tax id, payment
 * terms, and a default payable account are optional. Gated by
 * `accountingSettings`; audited.
 */
async function _createVendor(user: User, values: CreateVendorInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.name || !values.name.trim()) throw new Error("A vendor name is required");
        await connectToDB();

        const vendor = await Vendor.create({
            name: values.name.trim(),
            contactName: values.contactName?.trim() || "",
            email: values.email?.trim() || "",
            phone: values.phone?.trim() || "",
            address: values.address?.trim() || "",
            taxId: values.taxId?.trim() || "",
            paymentTerms: values.paymentTerms?.trim() || "",
            payableAccountId: values.payableAccountId || null,
            isActive: true,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "VENDOR_CREATED",
            details: { itemId: vendor._id, name: vendor.name },
            message: `${user.fullName} created vendor ${vendor.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: vendor._id,
            entityType: "VENDOR",
        });

        revalidatePath(VENDOR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(vendor));
    } catch (error) {
        console.error("Error creating vendor:", error);
        throw error;
    }
}
export const createVendor = await withAuth(_createVendor, "accountingSettings");

interface UpdateVendorInput {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    paymentTerms?: string;
    payableAccountId?: string | null;
    isActive?: boolean;
}

/**
 * Edit a vendor's descriptive fields and default payable account. Only supplied
 * fields change. Gated by `accountingSettings`; audited.
 */
async function _updateVendor(user: User, id: string, values: UpdateVendorInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A vendor is required");
        await connectToDB();

        const vendor = await Vendor.findById(id);
        if (!vendor || vendor.del_flag) throw new Error("Vendor not found");

        if (values.name !== undefined) {
            if (!values.name.trim()) throw new Error("A vendor name cannot be empty");
            vendor.name = values.name.trim();
        }
        if (values.contactName !== undefined) vendor.contactName = values.contactName.trim();
        if (values.email !== undefined) vendor.email = values.email.trim();
        if (values.phone !== undefined) vendor.phone = values.phone.trim();
        if (values.address !== undefined) vendor.address = values.address.trim();
        if (values.taxId !== undefined) vendor.taxId = values.taxId.trim();
        if (values.paymentTerms !== undefined) vendor.paymentTerms = values.paymentTerms.trim();
        if (values.payableAccountId !== undefined) {
            vendor.payableAccountId = (values.payableAccountId || null) as never;
        }
        if (values.isActive !== undefined) vendor.isActive = !!values.isActive;

        vendor.mod_flag = true;
        vendor.modifiedBy = user._id as never;
        vendor.action_type = "updated";
        await vendor.save();

        await History.create({
            actionType: "VENDOR_UPDATED",
            details: { itemId: vendor._id, name: vendor.name },
            message: `${user.fullName} updated vendor ${vendor.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: vendor._id,
            entityType: "VENDOR",
        });

        revalidatePath(VENDOR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(vendor));
    } catch (error) {
        console.error("Error updating vendor:", error);
        throw error;
    }
}
export const updateVendor = await withAuth(_updateVendor, "accountingSettings");

/**
 * Deactivate (or reactivate) a vendor (R11.4). This is the safe alternative to
 * deletion — the vendor keeps all referencing history but is hidden from
 * pickers and new expenses. Gated by `accountingSettings`; audited.
 */
async function _setVendorActive(user: User, id: string, isActive: boolean, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A vendor is required");
        await connectToDB();

        const vendor = await Vendor.findById(id);
        if (!vendor || vendor.del_flag) throw new Error("Vendor not found");

        vendor.isActive = !!isActive;
        vendor.mod_flag = true;
        vendor.modifiedBy = user._id as never;
        vendor.action_type = "updated";
        await vendor.save();

        await History.create({
            actionType: "VENDOR_DEACTIVATED",
            details: { itemId: vendor._id, name: vendor.name, isActive: vendor.isActive },
            message: `${user.fullName} ${isActive ? "activated" : "deactivated"} vendor ${vendor.name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: vendor._id,
            entityType: "VENDOR",
        });

        revalidatePath(VENDOR_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(vendor));
    } catch (error) {
        console.error("Error changing vendor active state:", error);
        throw error;
    }
}
export const setVendorActive = await withAuth(_setVendorActive, "accountingSettings");

/** Convenience wrapper: deactivate a vendor (R11.4). Gated `accountingSettings`. */
async function _deactivateVendor(user: User, id: string, path?: string) {
    return _setVendorActive(user, id, false, path);
}
export const deactivateVendor = await withAuth(_deactivateVendor, "accountingSettings");

/**
 * True when a vendor is referenced by any expense or by any journal entry
 * (expenses and inventory purchases stamp the entry's `vendorId`). A referenced
 * vendor is part of the permanent record and must never be hard-deleted — it is
 * deactivated instead (R11.4).
 */
async function isVendorReferenced(vendorId: string): Promise<boolean> {
    const [expenseCount, entryCount] = await Promise.all([
        Expense.countDocuments({ vendorId, del_flag: false }),
        JournalEntry.countDocuments({ vendorId }),
    ]);
    return expenseCount > 0 || entryCount > 0;
}

/**
 * Hard-delete a vendor, guarded (R11.4). Deletion is blocked when the vendor is
 * referenced by any expense or posted/bridged journal entry (purchases); the
 * caller is instructed to deactivate instead. Gated by `accountingSettings`;
 * audited.
 */
async function _deleteVendor(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A vendor is required");
        await connectToDB();

        const vendor = await Vendor.findById(id);
        if (!vendor) throw new Error("Vendor not found");

        if (await isVendorReferenced(String(vendor._id))) {
            throw new Error(
                `${vendor.name} is referenced by existing expenses or purchases and cannot be deleted. Deactivate it instead.`,
            );
        }

        const name = vendor.name;
        const deletedId = vendor._id;
        await Vendor.deleteOne({ _id: vendor._id });

        await History.create({
            actionType: "VENDOR_DELETED",
            details: { itemId: deletedId, name },
            message: `${user.fullName} deleted vendor ${name} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: deletedId,
            entityType: "VENDOR",
        });

        revalidatePath(VENDOR_PATH);
        if (path) revalidatePath(path);
        return { success: true, message: "Vendor deleted successfully" };
    } catch (error) {
        console.error("Error deleting vendor:", error);
        throw error;
    }
}
export const deleteVendor = await withAuth(_deleteVendor, "accountingSettings");

/**
 * List vendors ordered by name. An optional `activeOnly` filter hides
 * deactivated vendors for pickers. Read-only; gated by `accountingManagement`.
 */
async function _listVendors(user: User, activeOnly?: boolean) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (activeOnly) query.isActive = true;
        const vendors = await Vendor.find(query).sort({ name: 1 }).lean();
        return JSON.parse(JSON.stringify(vendors || []));
    } catch (error) {
        console.error("Error listing vendors:", error);
        return [];
    }
}
export const listVendors = await withAuth(_listVendors, "accountingManagement");

/**
 * Read a single vendor with its payable account populated. Read-only; gated by
 * `accountingManagement`.
 */
async function _getVendor(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A vendor is required");
        await connectToDB();
        const vendor = await Vendor.findById(id)
            .populate("payableAccountId", "code name type")
            .lean();
        if (!vendor) return null;
        return JSON.parse(JSON.stringify(vendor));
    } catch (error) {
        console.error("Error fetching vendor:", error);
        return null;
    }
}
export const getVendor = await withAuth(_getVendor, "accountingManagement");

/* ════════════════════════════ VENDOR SPEND REPORT ════════════════════════════ */

interface VendorSpendPeriod {
    from?: Date | string;
    to?: Date | string;
}

type JournalLineLean = {
    accountId?: { _id?: unknown; code?: string; name?: string; type?: AccountType } | null;
    debit?: number;
    credit?: number;
};

type JournalEntryLean = {
    _id?: unknown;
    date?: Date;
    vendorId?: unknown;
    lines?: JournalLineLean[];
};

/**
 * Vendor spend for a period (R11.3): total posted expense amounts grouped by
 * vendor. Posted journal entries carrying a `vendorId` are joined to their
 * lines' accounts; each expense-type line is turned into a `StatementRow`
 * stamped with the entry's vendor, and the pure `vendorSpend` engine totals the
 * spend per vendor so the report math matches the unit tests exactly. Vendor
 * names are attached for presentation. Read-only; gated by
 * `accountingManagement`.
 */
async function _vendorSpendReport(user: User, period?: VendorSpendPeriod) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const query: Record<string, unknown> = {
            status: "posted",
            vendorId: { $ne: null },
        };
        if (period?.from || period?.to) {
            const range: Record<string, Date> = {};
            if (period.from) range.$gte = new Date(period.from);
            if (period.to) range.$lte = new Date(period.to);
            query.date = range;
        }

        const entries = (await JournalEntry.find(query)
            .populate("lines.accountId", "code name type")
            .lean()) as unknown as JournalEntryLean[];

        // Flatten posted lines into StatementRows carrying the ENTRY's vendorId,
        // so the pure engine can group expense spend by vendor.
        const rows: StatementRow[] = [];
        for (const entry of entries) {
            const vendorId = entry.vendorId ? String(entry.vendorId) : undefined;
            if (!vendorId) continue;
            for (const line of entry.lines || []) {
                const account = line.accountId;
                if (!account || !account.type) continue;
                rows.push({
                    accountId: account._id ? String(account._id) : "",
                    code: account.code || "",
                    name: account.name || "",
                    type: account.type,
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    vendorId,
                    date: entry.date,
                });
            }
        }

        const totals = vendorSpend(rows);

        // Attach vendor names for presentation.
        const vendorIds = totals.map((t) => t.vendorId);
        const vendors = await Vendor.find({ _id: { $in: vendorIds } })
            .select("name")
            .lean();
        const nameById = new Map(vendors.map((v) => [String(v._id), v.name]));

        const report = totals.map((t) => ({
            vendorId: t.vendorId,
            vendorName: nameById.get(t.vendorId) || "Unknown vendor",
            total: t.total,
        }));

        return JSON.parse(JSON.stringify(report));
    } catch (error) {
        console.error("Error building vendor spend report:", error);
        return [];
    }
}
export const vendorSpendReport = await withAuth(_vendorSpendReport, "accountingManagement");
