"use server";

/**
 * Walk-in Pharmacy POS actions.
 *
 * Over-the-counter drug sales to non-patients (with an optional patient link).
 * Payment is taken inline, stock is depleted through the shared FEFO batch
 * engine, and exactly two journal entries are posted per completed sale: one
 * revenue entry (via `postLedgerEntry`, category "Pharmacy Sales") and one COGS
 * relief entry (via `postLedgerEntryLines`). The stock/accounting mechanics
 * mirror `_dispenseVisitProducts` in `visit-clinical.actions.ts` verbatim so the
 * math stays identical across the app.
 *
 * This is a `"use server"` module: ONLY async functions are exported. Every
 * shared constant/type/pure-helper lives in `../constants/pharmacy-pos` (a plain
 * module with no `"use server"`), which is the fix for the prior crash
 * "A 'use server' file can only export async functions".
 */

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { withAuth, type User } from "../helpers/auth";
import InventoryProduct from "../models/inventory-product.models";
import PharmacySale from "../models/pharmacy-sale.models";
import ChartAccount from "../models/accounting/chart-account.models";
import History from "../models/history.models";
import { nextSequence } from "../models/counter.models";
import { postLedgerEntry, postLedgerEntryLines, reverseLedgerEntry } from "./accounting/bridge.actions";
import { getSettingsInternal } from "./accounting/accounting-settings.actions";
import {
    type Batch,
    type ConsumedBatch,
    depleteFefo,
    restoreStock,
    sumBatchQuantity,
    coerceLegacyToOpeningBatch,
    isInsufficientStockError,
} from "../inventory/batches";
import { pickAccountCode } from "../inventory/account-resolution";
import { buildCogsReliefJournalLines, type ConsumedBatchCost } from "../inventory/postings";
import {
    POS_PAYMENT_METHODS,
    formatSaleNumber,
    computeChange,
    requiresAuthNote,
    aggregateQtyByProduct,
} from "../constants/pharmacy-pos";

/* ── Local (non-exported) input types ────────────────────────────────────── */

interface PharmacySaleItemInput {
    productId: string;
    quantity: number;
}

interface CreatePharmacySaleInput {
    items: PharmacySaleItemInput[];
    customerName?: string;
    customerPhone?: string;
    patientId?: string | null;
    paymentMethod: "cash" | "card" | "mobile-money" | "bank-transfer" | "other";
    paymentReference?: string;
    amountTendered?: number;
    authorizationNote?: string;
}

/* ── Batch <-> schema conversion helpers (copied from _dispenseVisitProducts
 *    so stock math stays identical between the app and the property tests). ── */

/** Normalize a `Date | string | null | undefined` to an ISO string or `null`. */
function toIso(value: string | Date | null | undefined): string | null {
    if (value == null || value === "") return null;
    const d = value instanceof Date ? value : new Date(value);
    const ms = d.getTime();
    return Number.isNaN(ms) ? null : d.toISOString();
}

/** Normalize a `Date | string | null | undefined` to a `Date` or `null` (schema side). */
function toDateOrNull(value: string | Date | null | undefined): Date | null {
    const iso = toIso(value);
    return iso == null ? null : new Date(iso);
}

/** Map a persisted product batch (Dates) to the pure engine's {@link Batch} shape (ISO strings). */
function toPureBatch(b: {
    batchNumber?: string;
    expiryDate?: Date | string | null;
    quantity?: number | null;
    manufactureDate?: Date | string | null;
    costPerUnit?: number | null;
    supplierId?: unknown;
    receivedAt?: Date | string | null;
}): Batch {
    return {
        batchNumber: String(b.batchNumber ?? ""),
        expiryDate: toIso(b.expiryDate ?? null),
        quantity: Number(b.quantity) || 0,
        manufactureDate: toIso(b.manufactureDate ?? null),
        costPerUnit: b.costPerUnit ?? null,
        supplierId: b.supplierId == null ? null : String(b.supplierId),
        receivedAt: toIso(b.receivedAt ?? null),
    };
}

/** Map a pure {@link Batch} back to the schema shape (ISO strings → Dates) for persistence. */
function toSchemaBatch(b: Batch) {
    return {
        batchNumber: b.batchNumber,
        expiryDate: toDateOrNull(b.expiryDate),
        quantity: Number(b.quantity) || 0,
        manufactureDate: toDateOrNull(b.manufactureDate),
        costPerUnit: b.costPerUnit ?? null,
        supplierId: (b.supplierId ?? null) as unknown,
        receivedAt: toDateOrNull(b.receivedAt),
    };
}

/**
 * Read the current batches off a product as pure {@link Batch}es, lazily coercing
 * a legacy scalar `quantity` into an opening batch (R7.1/R7.2) when the product
 * has a positive scalar quantity and no batches yet. Does NOT persist.
 */
function readProductBatches(product: {
    quantity?: number | null;
    batches?: unknown[] | null;
}): Batch[] {
    const existing = Array.isArray(product.batches)
        ? (product.batches as Parameters<typeof toPureBatch>[0][]).map(toPureBatch)
        : [];
    return coerceLegacyToOpeningBatch(Number(product.quantity) || 0, existing);
}

/**
 * Resolve an active, non-deleted ChartAccount by its `code`, returning its id as
 * a string, or null when the code is unset / unmatched.
 */
async function resolveCodeToAccountId(code: string | null | undefined): Promise<string | null> {
    if (!code) return null;
    const account = await ChartAccount.findOne({ code: String(code), del_flag: { $ne: true } });
    return account ? String(account._id) : null;
}

/**
 * Resolve a product's account link (a ChartAccount `_id`) to its `code`, so it
 * can feed the pure `pickAccountCode` resolver alongside the settings default.
 */
async function resolveLinkIdToCode(id: unknown): Promise<string | null> {
    if (!id) return null;
    const account = await ChartAccount.findOne({ _id: String(id), del_flag: { $ne: true } });
    return account ? String(account.code) : null;
}

/* ── createPharmacySale ───────────────────────────────────────────────────── */

async function _createPharmacySale(user: User, values: CreatePharmacySaleInput, path?: string) {
    try {
        // 1. Auth + connect.
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        // 2. Load + validate + price the cart.
        const priced: {
            productId: string;
            name: string;
            quantity: number;
            unitPrice: number;
            total: number;
            prescriptionRequired: boolean;
            controlledSubstance: boolean;
        }[] = [];

        for (const it of values?.items || []) {
            const qty = Number(it.quantity) || 0;
            if (qty <= 0) continue;
            const product = await InventoryProduct.findById(it.productId);
            if (!product) throw new Error("Product not found");
            if (product.isDrug !== true || product.del_flag === true) {
                throw new Error(`${product.name} is not a sellable drug`);
            }
            const unitPrice = Number(product.salePrice) || 0;
            priced.push({
                productId: String(it.productId),
                name: product.name,
                quantity: qty,
                unitPrice,
                total: unitPrice * qty,
                prescriptionRequired: product.prescriptionRequired === true,
                controlledSubstance: product.controlledSubstance === true,
            });
        }

        if (priced.length === 0) throw new Error("Cart is empty");

        const subTotal = priced.reduce((sum, line) => sum + line.total, 0);
        const total = subTotal;

        // 2b. Cash guard — BEFORE any depletion. Runs on in-memory values only so
        // an underpaid sale aborts with zero stock/ledger change.
        const method = String(values?.paymentMethod ?? "");
        const validMethod = POS_PAYMENT_METHODS.some((m) => m.value === method);
        if (!validMethod) throw new Error("Invalid payment method");

        let amountTendered = Number(values?.amountTendered) || 0;
        let change = 0;
        if (method === "cash") {
            if (amountTendered < total) throw new Error("Amount tendered is less than the total");
            change = computeChange(amountTendered, total);
        } else {
            amountTendered = total;
            change = 0;
        }

        // 3. Authorization gate for Rx / controlled items.
        const authorizationNote = String(values?.authorizationNote ?? "");
        if (requiresAuthNote(priced) && authorizationNote.trim().length === 0) {
            throw new Error("Authorization/prescriber note required for prescription or controlled items");
        }

        // 4. Aggregate requested qty per product (a cart may repeat a product).
        const newQty = aggregateQtyByProduct(
            priced.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        );

        // 5. Stage FEFO depletions atomically — persist only if ALL succeed.
        const now = new Date();
        const consumedByProduct = new Map<string, ConsumedBatch[]>();
        const fallbackPriceByProduct = new Map<string, number>();
        let cogsLinkCode: string | null = null;
        let inventoryLinkCode: string | null = null;

        const pending: { product: IInventoryProduct; batches: Batch[] }[] = [];

        for (const [id, qty] of newQty) {
            const product = await InventoryProduct.findById(id);
            if (!product) throw new Error("Product not found");

            const currentBatches = readProductBatches(
                product as unknown as { quantity?: number | null; batches?: unknown[] | null },
            );

            try {
                const result = depleteFefo(currentBatches, qty, now);
                consumedByProduct.set(String(id), result.consumed);
                fallbackPriceByProduct.set(
                    String(id),
                    Number((product as unknown as { purchasePrice?: number }).purchasePrice) || 0,
                );
                const prod = product as unknown as { cogsAccountId?: unknown; inventoryAccountId?: unknown };
                if (cogsLinkCode == null && prod.cogsAccountId) {
                    cogsLinkCode = await resolveLinkIdToCode(prod.cogsAccountId);
                }
                if (inventoryLinkCode == null && prod.inventoryAccountId) {
                    inventoryLinkCode = await resolveLinkIdToCode(prod.inventoryAccountId);
                }
                pending.push({ product: product as unknown as IInventoryProduct, batches: result.batches });
            } catch (err) {
                if (isInsufficientStockError(err)) {
                    throw new Error(`Not enough stock for ${product.name}. Available: ${err.available}`);
                }
                throw err;
            }
        }

        // 6. Persist stock — only after ALL depletions staged OK. Keep the
        // product.quantity = sumBatchQuantity(batches) invariant (R6.1).
        for (const { product, batches } of pending) {
            if (!product) continue;
            product.batches = batches.map(toSchemaBatch) as unknown as IInventoryProduct["batches"];
            product.quantity = sumBatchQuantity(batches);
            await (product as unknown as { save: () => Promise<unknown> }).save();
        }

        // 7. Create the sale record (paid-in-full inline; the sale IS the payment).
        const year = new Date().getFullYear();
        const seq = await nextSequence(`pharmacy-sale-${year}`);
        const saleNumber = formatSaleNumber(seq, year);

        const saleItems = priced.map((line) => ({
            productId: line.productId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            prescriptionRequired: line.prescriptionRequired,
            controlledSubstance: line.controlledSubstance,
            batchBreakdown: (consumedByProduct.get(line.productId) || []).map((c) => ({
                batchNumber: c.batchNumber,
                quantity: c.quantity,
                costPerUnit: c.costPerUnit,
            })),
        }));

        // Mongoose coerces string ids to ObjectId on save; the create payload is
        // cast to the document type (matching how the repo's invoice flow builds
        // loosely-typed item rows the model then coerces).
        const sale = await PharmacySale.create({
            saleNumber,
            items: saleItems,
            subTotal,
            total,
            customerName: String(values?.customerName ?? ""),
            customerPhone: String(values?.customerPhone ?? ""),
            patientId: values?.patientId || null,
            paymentMethod: method,
            paymentReference: String(values?.paymentReference ?? ""),
            amountTendered,
            change,
            authorizationNote,
            status: "completed",
            soldBy: user._id,
            createdBy: user._id,
            action_type: "created",
        } as unknown as IPharmacySale);

        // 8. Post revenue — exactly once. Do NOT pass `method` (the bridge ignores
        // it and always debits the cash default account). Best-effort: a null
        // return leaves journalEntryId null and never fails the sale.
        const revEntry = await postLedgerEntry(user, {
            type: "income",
            category: "Pharmacy Sales",
            amount: total,
            source: "payment",
            sourceId: String(sale._id),
            patientId: values?.patientId || null,
            description: `Pharmacy POS sale ${saleNumber}`,
        });
        if (revEntry) sale.journalEntryId = revEntry._id;

        // 9. Post COGS relief — exactly once (only if something was consumed).
        if (consumedByProduct.size > 0) {
            const settings = await getSettingsInternal();
            const defaults = settings?.defaultAccounts || {};

            const cogsCode = pickAccountCode(cogsLinkCode, defaults.expense);
            const inventoryCode = pickAccountCode(inventoryLinkCode, defaults.inventory);
            const cogsAccountId = await resolveCodeToAccountId(cogsCode);
            const inventoryAccountId = await resolveCodeToAccountId(inventoryCode);

            if (cogsAccountId && inventoryAccountId) {
                // Fold each product's fallback price into its own consumed rows so
                // a single builder call (engine fallbackPrice 0) sums the real
                // cost across products with different purchase prices.
                const consumed: ConsumedBatchCost[] = [];
                for (const [pid, rows] of consumedByProduct) {
                    const fallback = fallbackPriceByProduct.get(pid) ?? 0;
                    for (const row of rows) {
                        consumed.push({
                            quantity: Number(row.quantity) || 0,
                            costPerUnit: row.costPerUnit == null ? fallback : row.costPerUnit,
                        });
                    }
                }

                const built = buildCogsReliefJournalLines({
                    consumed,
                    fallbackPrice: 0,
                    cogsAccountId,
                    inventoryAccountId,
                    memo: "Pharmacy POS COGS",
                });

                if (built) {
                    const cogsEntry = await postLedgerEntryLines(user, {
                        lines: built.lines,
                        memo: "Pharmacy POS COGS",
                        source: "bridge",
                        sourceId: String(sale._id),
                        vendorId: null,
                    });
                    if (cogsEntry) sale.cogsJournalEntryId = cogsEntry._id as never;
                }
            }
        }

        // 10. Persist the two JE ids.
        await sale.save();
        if (path) revalidatePath(path);
        revalidatePath("/dashboard/inventory/products");

        // 11. Best-effort audit — AFTER the committed sale, in its own try/catch so
        // an audit failure can never turn a committed sale into a caller error.
        try {
            await History.create({
                actionType: "PHARMACY_SALE_CREATED",
                details: { itemId: sale._id, saleNumber: sale.saleNumber, total: sale.total },
                performedBy: user._id,
                entityId: sale._id,
                entityType: "PHARMACY_SALE",
                message: `${user.fullName} completed pharmacy sale ${sale.saleNumber} for ${sale.total}.`,
            });
        } catch (e) {
            console.error("Pharmacy sale audit write failed", e);
        }

        return JSON.parse(JSON.stringify(sale));
    } catch (error) {
        console.error("Error creating pharmacy sale:", error);
        throw error;
    }
}

/* ── listPharmacySales ────────────────────────────────────────────────────── */

async function _listPharmacySales(user: User, limit?: number) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const sales = await PharmacySale.find({ del_flag: { $ne: true } })
            .populate("soldBy", "fullName")
            .populate("patientId", "fullName patientId")
            .sort({ createdAt: -1 })
            .limit(Number(limit) || 100);
        return JSON.parse(JSON.stringify(sales));
    } catch (error) {
        console.error("Error listing pharmacy sales:", error);
        return [];
    }
}

/* ── voidPharmacySale ─────────────────────────────────────────────────────── */

async function _voidPharmacySale(user: User, id: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();

        const sale = await PharmacySale.findById(id);
        if (!sale) throw new Error("Sale not found");
        if (sale.status === "voided") return JSON.parse(JSON.stringify(sale));

        // Reverse both JEs (best-effort; a null/missing/already-reversed id is a no-op).
        if (sale.journalEntryId) await reverseLedgerEntry(user, String(sale.journalEntryId));
        if (sale.cogsJournalEntryId) await reverseLedgerEntry(user, String(sale.cogsJournalEntryId));

        // Restore stock through the batch engine, into the originally-consumed lots.
        for (const item of sale.items || []) {
            const product = await InventoryProduct.findById(item.productId);
            if (!product) continue;
            let next = readProductBatches(
                product as unknown as { quantity?: number | null; batches?: unknown[] | null },
            );
            const breakdown = item.batchBreakdown || [];
            if (breakdown.length > 0) {
                for (const row of breakdown) {
                    next = restoreStock(next, Number(row.quantity) || 0, {
                        batchNumber: row.batchNumber,
                        costPerUnit: row.costPerUnit,
                    });
                }
            } else {
                next = restoreStock(next, Number(item.quantity) || 0);
            }
            product.batches = next.map(toSchemaBatch) as unknown as IInventoryProduct["batches"];
            product.quantity = sumBatchQuantity(next);
            await (product as unknown as { save: () => Promise<unknown> }).save();
        }

        sale.status = "voided";
        sale.voidedBy = user._id as never;
        sale.mod_flag = true;
        sale.modifiedBy = user._id as never;
        sale.action_type = "voided";
        await sale.save();

        try {
            await History.create({
                actionType: "PHARMACY_SALE_VOIDED",
                details: { itemId: sale._id, saleNumber: sale.saleNumber, total: sale.total },
                performedBy: user._id,
                entityId: sale._id,
                entityType: "PHARMACY_SALE",
                message: `${user.fullName} voided pharmacy sale ${sale.saleNumber}.`,
            });
        } catch (e) {
            console.error("Pharmacy sale void audit write failed", e);
        }

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/inventory/products");
        return JSON.parse(JSON.stringify(sale));
    } catch (error) {
        console.error("Error voiding pharmacy sale:", error);
        throw error;
    }
}

export const createPharmacySale = await withAuth(_createPharmacySale, "pharmacyManagement");
export const listPharmacySales = await withAuth(_listPharmacySales, "pharmacyManagement");
export const voidPharmacySale = await withAuth(_voidPharmacySale, "pharmacyManagement");
