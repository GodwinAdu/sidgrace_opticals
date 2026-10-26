"use server"

import InventoryProduct from "../models/inventory-product.models";
import { connectToDB } from "../mongoose";
import { type User, withAuth } from "../helpers/auth";
import {
    type Batch,
    classifyExpiry,
    coerceLegacyToOpeningBatch,
} from "../inventory/batches";

/* ════════════════════════════ PURE-BATCH CONVERSION HELPERS ════════════════════════════ */
/*
 * Replicated locally (rather than importing the private helpers from
 * `inventory-product.actions.ts`) so this reporting module stays self-contained
 * and the pure math is identical between the app and its property tests.
 */

/** Normalize a `Date | string | null | undefined` to an ISO string or `null`. */
function toIso(value: string | Date | null | undefined): string | null {
    if (value == null || value === "") return null;
    const d = value instanceof Date ? value : new Date(value);
    const ms = d.getTime();
    return Number.isNaN(ms) ? null : d.toISOString();
}

/**
 * Map a persisted/plain product batch (Mongoose stores `Date`s) to the pure
 * engine's {@link Batch} shape (ISO strings). Keeps the pure math identical
 * between the app and its property tests.
 */
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

/**
 * Read the current batches off a plain product object as pure {@link Batch}es,
 * lazily coercing a legacy scalar `quantity` into an opening batch (R7.1/R7.2)
 * when the product has a positive scalar quantity and no batches yet. This does
 * NOT persist the coercion — it is the batch-aware VIEW of the product used for
 * classification. The opening batch has no expiry, so it is never flagged.
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

/* ════════════════════════════ FLATTENED ROW SHAPE ════════════════════════════ */

/**
 * A single flattened expiry report row: a batch plus the context of its parent
 * product so a report UI can list the row directly without re-joining.
 */
export interface ExpiryReportRow {
    productId: string;
    productName: string;
    categoryId: string | null;
    isDrug: boolean;
    batchNumber: string;
    expiryDate: string | null;
    quantity: number;
    manufactureDate: string | null;
    costPerUnit: number | null;
    supplierId: string | null;
    receivedAt: string | null;
}

/** Shape of the lean product documents we read for classification. */
interface LeanProduct {
    _id: unknown;
    name?: string;
    categoryId?: unknown;
    isDrug?: boolean;
    quantity?: number | null;
    batches?: unknown[] | null;
}

/** Flatten a classified batch into a report row carrying its product context. */
function toReportRow(product: LeanProduct, batch: Batch): ExpiryReportRow {
    return {
        productId: String(product._id),
        productName: String(product.name ?? ""),
        categoryId: product.categoryId == null ? null : String(product.categoryId),
        isDrug: Boolean(product.isDrug),
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: Number(batch.quantity) || 0,
        manufactureDate: batch.manufactureDate ?? null,
        costPerUnit: batch.costPerUnit ?? null,
        supplierId: batch.supplierId ?? null,
        receivedAt: batch.receivedAt ?? null,
    };
}

/* ════════════════════════════ EXPIRY LISTINGS ════════════════════════════ */

/**
 * R8.1: list every EXPIRED batch across all (non-deleted) inventory products as
 * flattened rows with product context.
 *
 * Each product's batches are classified via `classifyExpiry(batches, now)` from
 * the pure engine; a legacy scalar quantity is lazily coerced into an opening
 * batch for classification (the opening batch has no expiry, so it is never
 * flagged — which is correct). Nothing is persisted. Gated by
 * `inventoryManagement`.
 */
async function _listExpiredBatches(user: User): Promise<ExpiryReportRow[]> {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const products = (await InventoryProduct.find({ del_flag: { $ne: true } }).lean()) as LeanProduct[];

        const now = new Date();
        const rows: ExpiryReportRow[] = [];

        for (const product of products) {
            const batches = readProductBatches(product);
            const { expired } = classifyExpiry(batches, now);
            for (const batch of expired) {
                rows.push(toReportRow(product, batch));
            }
        }

        return JSON.parse(JSON.stringify(rows));
    } catch (error) {
        console.error("Error listing expired batches:", error);
        throw error;
    }
}
export const listExpiredBatches = await withAuth(_listExpiredBatches, "inventoryManagement");

/**
 * R8.2 / R8.3: list every NEAR-EXPIRY batch across all (non-deleted) inventory
 * products as flattened rows with product context, using a `thresholdDays`
 * near-expiry window (default 90 days).
 *
 * Each product's batches are classified via
 * `classifyExpiry(batches, now, thresholdDays)` from the pure engine; a legacy
 * scalar quantity is lazily coerced into an opening batch for classification
 * (the opening batch has no expiry, so it is never flagged). Nothing is
 * persisted. Gated by `inventoryManagement`.
 */
async function _listNearExpiryBatches(user: User, thresholdDays = 90): Promise<ExpiryReportRow[]> {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const products = (await InventoryProduct.find({ del_flag: { $ne: true } }).lean()) as LeanProduct[];

        const now = new Date();
        const rows: ExpiryReportRow[] = [];

        for (const product of products) {
            const batches = readProductBatches(product);
            const { nearExpiry } = classifyExpiry(batches, now, thresholdDays);
            for (const batch of nearExpiry) {
                rows.push(toReportRow(product, batch));
            }
        }

        return JSON.parse(JSON.stringify(rows));
    } catch (error) {
        console.error("Error listing near-expiry batches:", error);
        throw error;
    }
}
export const listNearExpiryBatches = await withAuth(_listNearExpiryBatches, "inventoryManagement");
