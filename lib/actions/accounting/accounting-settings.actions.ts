"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../../mongoose";
import AccountingSettings from "../../models/accounting/accounting-settings.models";
import History from "../../models/history.models";
import { User, withAuth } from "../../helpers/auth";

const SETTINGS_PATH = "/dashboard/account";

/**
 * The default account mappings the posting bridge falls back to when settings
 * have never been configured. These are the system `code`s seeded by
 * `DEFAULT_CHART` (see `lib/accounting/coa.ts`), so a freshly seeded clinic is
 * immediately postable without any manual configuration (R7.3).
 */
const DEFAULT_ACCOUNT_MAP: Required<IAccountingDefaultAccounts> = {
    cash: "1000", // Cash on Hand
    accountsReceivable: "1100", // Accounts Receivable
    accountsPayable: "2000", // Accounts Payable
    revenue: "4000", // Consultation Revenue (operating revenue)
    expense: "6900", // Miscellaneous Expense (operating expense)
    insuranceReceivable: "1110", // Insurance Receivable
    inventory: "1200", // Inventory
    payrollExpense: "6000", // Salaries & Wages
    // Per-category overrides start empty: every category uses the single
    // revenue/expense default above until the clinic maps it explicitly.
    // Walk-in Pharmacy POS revenue routes to the dedicated Pharmacy Revenue
    // account (4300) by default, keeping it separate from Consultation Revenue.
    revenueByCategory: { "Pharmacy Sales": "4300" },
    // Payroll expense routes to the dedicated Salaries & Wages account (6000) by
    // default so a payroll run never lands in Miscellaneous Expense. The bridge
    // also falls back to the `payrollExpense` scalar default for this category,
    // but seeding it here makes the mapping visible/editable in the settings UI.
    expenseByCategory: { "Payroll": "6000" },
};

/**
 * Read the singleton accounting settings, creating it with sensible defaults on
 * first access (upsert). This is the single source of truth the bridge and the
 * rest of the module read their policy + default-account mappings from. Gated by
 * `accountingManagement` (read-level permission).
 */
async function _getSettings(user: User) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        let settings = await AccountingSettings.findOne({ key: "accounting" });
        if (!settings) {
            settings = await AccountingSettings.create({
                key: "accounting",
                periodValidation: "lenient",
                basisDefault: "accrual",
                overBudgetMode: "warn",
                defaultAccounts: { ...DEFAULT_ACCOUNT_MAP },
                createdBy: user._id,
                action_type: "created",
            });
        }

        return JSON.parse(JSON.stringify(settings));
    } catch (error) {
        console.error("Error reading accounting settings:", error);
        throw error;
    }
}
export const getSettings = await withAuth(_getSettings, "accountingManagement");

/**
 * Non-withAuth settings reader for internal server-side callers (e.g. the
 * compatibility bridge) that already hold an authenticated user and must not be
 * blocked by the finer `accountingManagement` gate while posting embedded
 * clinical/billing finance. Upserts the singleton with defaults if missing.
 */
export async function getSettingsInternal() {
    try {
        await connectToDB();
        let settings = await AccountingSettings.findOne({ key: "accounting" });
        if (!settings) {
            settings = await AccountingSettings.create({
                key: "accounting",
                periodValidation: "lenient",
                basisDefault: "accrual",
                overBudgetMode: "warn",
                defaultAccounts: { ...DEFAULT_ACCOUNT_MAP },
                action_type: "created",
            });
        }
        return settings;
    } catch (error) {
        console.error("Error reading accounting settings (internal):", error);
        return null;
    }
}

interface UpdateSettingsInput {
    periodValidation?: "strict" | "lenient";
    basisDefault?: "accrual" | "cash";
    overBudgetMode?: "warn" | "block";
    defaultAccounts?: Partial<IAccountingDefaultAccounts>;
}

/**
 * Update the accounting settings singleton: period-validation mode, default
 * posting basis, over-budget behaviour, and the default-account mappings used by
 * the posting bridge (R7.3). Only the fields supplied are changed; mappings are
 * merged (a partial `defaultAccounts` patches, it does not replace). Gated by
 * `accountingSettings` and audited with the actor (R7.4).
 */
async function _updateSettings(user: User, values: UpdateSettingsInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        let settings = await AccountingSettings.findOne({ key: "accounting" });
        if (!settings) {
            settings = await AccountingSettings.create({
                key: "accounting",
                defaultAccounts: { ...DEFAULT_ACCOUNT_MAP },
                createdBy: user._id,
                action_type: "created",
            });
        }

        if (values.periodValidation !== undefined) {
            settings.periodValidation = values.periodValidation === "strict" ? "strict" : "lenient";
        }
        if (values.basisDefault !== undefined) {
            settings.basisDefault = values.basisDefault === "cash" ? "cash" : "accrual";
        }
        if (values.overBudgetMode !== undefined) {
            settings.overBudgetMode = values.overBudgetMode === "block" ? "block" : "warn";
        }
        if (values.defaultAccounts) {
            const existing = (settings.defaultAccounts || {}) as IAccountingDefaultAccounts;
            const incoming = values.defaultAccounts;

            // Scalar code mappings: only overwrite the ones the caller supplied,
            // keeping existing codes for the rest.
            const scalarPatch = Object.fromEntries(
                Object.entries(incoming).filter(
                    ([k, v]) =>
                        v !== undefined &&
                        k !== "revenueByCategory" &&
                        k !== "expenseByCategory",
                ),
            );

            // Per-category maps: DEEP-merge so supplying one category never wipes
            // the others. A blank/empty value for a category clears that single
            // mapping (so it falls back to the global default again).
            const mergeCategoryMap = (
                current: Record<string, string> | undefined,
                patch: Record<string, string> | undefined,
            ): Record<string, string> => {
                const out: Record<string, string> = { ...(current || {}) };
                for (const [cat, code] of Object.entries(patch || {})) {
                    const trimmed = typeof code === "string" ? code.trim() : "";
                    if (trimmed) out[cat] = trimmed;
                    else delete out[cat]; // clearing a category resets it to the default
                }
                return out;
            };

            const merged: IAccountingDefaultAccounts = {
                ...existing,
                ...scalarPatch,
            };

            if (incoming.revenueByCategory !== undefined) {
                merged.revenueByCategory = mergeCategoryMap(
                    existing.revenueByCategory,
                    incoming.revenueByCategory,
                );
            }
            if (incoming.expenseByCategory !== undefined) {
                merged.expenseByCategory = mergeCategoryMap(
                    existing.expenseByCategory,
                    incoming.expenseByCategory,
                );
            }

            settings.defaultAccounts = merged as never;
            settings.markModified("defaultAccounts");
        }

        settings.mod_flag = true;
        settings.modifiedBy = user._id as never;
        settings.action_type = "updated";
        await settings.save();

        await History.create({
            actionType: "ACCOUNTING_SETTINGS_UPDATED",
            details: {
                itemId: settings._id,
                periodValidation: settings.periodValidation,
                basisDefault: settings.basisDefault,
                overBudgetMode: settings.overBudgetMode,
                defaultAccounts: settings.defaultAccounts,
            },
            message: `${user.fullName} updated accounting settings on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: settings._id,
            entityType: "ACCOUNTING_SETTINGS",
        });

        revalidatePath(SETTINGS_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(settings));
    } catch (error) {
        console.error("Error updating accounting settings:", error);
        throw error;
    }
}
export const updateSettings = await withAuth(_updateSettings, "accountingSettings");
