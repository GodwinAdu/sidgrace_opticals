"use server"

import { revalidatePath } from "next/cache";
import InventoryCategory from "../models/inventory-category.models";
import InventoryProduct from "../models/inventory-product.models";
import ChartAccount from "../models/accounting/chart-account.models";
import { connectToDB } from "../mongoose";
import History from "../models/history.models";
import { type User, withAuth } from '../helpers/auth';


interface ProductProps {
    name: string;
    categoryId: string;
    purchasePrice: number;
    salePrice: number;
    quantity: number;
    // Optional drug / pharmacy fields
    isDrug?: boolean;
    strength?: string;
    form?: string;
    unit?: string;
    reorderLevel?: number;
    prescriptionRequired?: boolean;
    // Chart-of-Accounts links (optional; blank/empty persists as null → default fallback)
    inventoryAccountId?: string | null;
    revenueAccountId?: string | null;
    cogsAccountId?: string | null;
    // Additional pharmacy fields (optional)
    genericName?: string;
    manufacturer?: string;
    barcode?: string;
    storageConditions?: string;
    controlledSubstance?: boolean;
}

/**
 * The three product→account link fields and the ChartAccount `type` each must
 * resolve to (R1.3–R1.5): inventory → asset, revenue → revenue, COGS → expense.
 */
const ACCOUNT_LINK_RULES = [
    { field: "inventoryAccountId", type: "asset", label: "an asset" },
    { field: "revenueAccountId", type: "revenue", label: "a revenue" },
    { field: "cogsAccountId", type: "expense", label: "an expense" },
] as const;

type AccountLinkField = (typeof ACCOUNT_LINK_RULES)[number]["field"];

/**
 * Validate the supplied Chart-of-Accounts link values and return a normalized
 * patch mapping each supplied field to a resolved ObjectId (or `null` for a
 * blank/empty link, which falls back to the default account at posting time —
 * R1.7). Only fields present in `values` are included in the returned patch, so
 * `updateProduct` leaves unspecified links untouched.
 *
 * For every non-blank link we require it to resolve to an active, non-deleted
 * `ChartAccount` of the correct `type` (R1.3–R1.6); otherwise we throw a
 * field-identifying validation `Error` that blocks the save — the user chose the
 * link explicitly, so a bad choice must surface rather than silently drop.
 */
async function resolveAccountLinks(
    values: Partial<ProductProps>,
): Promise<Partial<Record<AccountLinkField, string | null>>> {
    const patch: Partial<Record<AccountLinkField, string | null>> = {};

    for (const { field, type, label } of ACCOUNT_LINK_RULES) {
        // Only touch fields the caller actually supplied.
        if (!(field in values)) continue;

        const raw = values[field];

        // Blank / empty link → persist as null (R1.7).
        if (raw === null || raw === undefined || String(raw).trim() === "") {
            patch[field] = null;
            continue;
        }

        const id = String(raw).trim();

        const account = await ChartAccount.findOne({
            _id: id,
            isActive: true,
            del_flag: { $ne: true },
        });

        // Not resolvable to an active, non-deleted account (R1.6) OR wrong type
        // (R1.3–R1.5): throw a field-identifying error that blocks the save.
        if (!account || account.type !== type) {
            throw new Error(`${field} must reference ${label} account`);
        }

        patch[field] = id;
    }

    return patch;
}

async function _createProduct(user: User, values: ProductProps, path: string) {
    try {
        const { name, categoryId, purchasePrice, salePrice, quantity } = values

        if (!user) throw new Error("user not logged in");


        await connectToDB();

        const [existingProduct, category] = await Promise.all([
            InventoryProduct.findOne({ name }),
            InventoryCategory.findById(categoryId)
        ])


        if (existingProduct) {
            throw new Error("Product already exists");
        }

        if (!category) {
            throw new Error("Invalid category ID");
        }

        // Validate any supplied account links (throws on wrong type / unresolved,
        // normalizes blank links to null — R1.3–R1.7). Runs before the save.
        const accountLinks = await resolveAccountLinks(values);

        const newProduct = new InventoryProduct({
            name,
            categoryId,
            purchasePrice,
            salePrice,
            quantity,
            isDrug: values.isDrug ?? false,
            strength: values.strength ?? "",
            form: values.form ?? "",
            unit: values.unit ?? "",
            reorderLevel: values.reorderLevel ?? 0,
            prescriptionRequired: values.prescriptionRequired ?? false,
            // Account links (null = fall back to defaults at posting time).
            inventoryAccountId: accountLinks.inventoryAccountId ?? null,
            revenueAccountId: accountLinks.revenueAccountId ?? null,
            cogsAccountId: accountLinks.cogsAccountId ?? null,
            // Additional pharmacy fields.
            genericName: values.genericName ?? "",
            manufacturer: values.manufacturer ?? "",
            barcode: values.barcode ?? "",
            storageConditions: values.storageConditions ?? "",
            controlledSubstance: values.controlledSubstance ?? false,
            createdBy: user._id,
            action_type: "created",
        });
        const history = new History({
            actionType: 'PRODUCT_CREATED', // Use a relevant action type
            details: {
                itemId: newProduct._id,
                deletedAt: new Date(),
            },
            message: `${user.fullName} created new product with (ID: ${newProduct._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: newProduct._id,
            entityType: 'PRODUCT', // The type of the entity
        })

        category.products.push(newProduct._id);

        await Promise.all([
            newProduct.save(),
            category.save(),
            history.save(),
        ]);

        revalidatePath(path)

    } catch (error) {
        console.log("Error creating product: ", error);
        throw error;

    }

}

export const createProduct = await withAuth(_createProduct)


async function _fetchAllProducts(user: User) {
    try {

        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const products = await InventoryProduct.find({});

        if (products.length === 0) {
            console.log("No products found");
            return [];
        }

        return JSON.parse(JSON.stringify(products));

    } catch (error) {
        console.log("Error fetching inventory products: ", error);
        throw error;
    }
}

export const fetchAllProducts = await withAuth(_fetchAllProducts)


async function _fetchProductById(user: User, productId: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const product = await InventoryProduct.findById(productId);

        if (!product) {
            console.log("Product not found");
            return null;
        }

        return JSON.parse(JSON.stringify(product));

    } catch (error) {
        console.log("Error fetching inventory product by id: ", error);
        throw error;
    }
}

export const fetchProductById = await withAuth(_fetchProductById)



async function _fetchProductsByCategory(user: User, categoryId: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();
        const products = await InventoryProduct.find({ categoryId });
        if (!products) {
            console.log("No products found for this category");
            return [];
        }
        return JSON.parse(JSON.stringify(products));

    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}
export const fetchProductsByCategory = await withAuth(_fetchProductsByCategory)


async function _updateProduct(user: User, productId: string, values: Partial<ProductProps>, path: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        // Validate any supplied account links before writing (throws on wrong
        // type / unresolved, normalizes blank links to null — R1.3–R1.7). Only
        // fields present in `values` are returned, so unspecified links are
        // left untouched.
        const accountLinks = await resolveAccountLinks(values);

        const newValues = {
            ...values,
            // Overwrite the raw link values with the resolved/normalized patch
            // (resolved ObjectId string or null) for any link the caller supplied.
            ...accountLinks,
            mod_flag: true,
            modifyBy: user._id,
            action_type: "updated",
        };

        const updatedProduct = await InventoryProduct.findByIdAndUpdate(
            productId,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            console.log("Product not found");
            return null;
        }

        console.log("Update successful");

        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedProduct));
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}
export const updateProduct = await withAuth(_updateProduct)

export async function deleteProduct(id: string) {
    try {
        await connectToDB();

        const product = await InventoryProduct.findByIdAndDelete(id);
        if (!product) {
            console.log("Product doesn't exist");
            return null; // or throw an error if you want to handle it differently
        }

        // Remove the product ID from the products array in InventoryCategory
        await InventoryCategory.updateMany(
            { products: id },
            { $pull: { products: id } }
        );

        console.log("Delete successfully");

        return JSON.parse(JSON.stringify(product));
    } catch (error) {
        console.error("Error deleting Product:", error);
        throw error; // throw the error to handle it at a higher level if needed
    }
}


async function _fetchDrugProducts(user: User) {
    try {
        if (!user) throw new Error("User not logged in");
        await connectToDB();
        const products = await InventoryProduct.find({ isDrug: true, del_flag: { $ne: true } })
            .populate("categoryId", "name")
            .sort({ name: 1 });
        if (!products || products.length === 0) return [];
        return JSON.parse(JSON.stringify(products));
    } catch (error) {
        console.error("Error fetching drug products:", error);
        return [];
    }
}
export const fetchDrugProducts = await withAuth(_fetchDrugProducts)


/* ════════════════════════════ BATCH / LOT HELPERS ════════════════════════════ */

import {
    type Batch,
    sumBatchQuantity,
    coerceLegacyToOpeningBatch,
} from "../inventory/batches";

/**
 * Input accepted when adding or updating a batch/lot on a product.
 *
 * `batchNumber` identifies the lot — when it matches an existing batch on the
 * product the batch is UPDATED (quantity set, metadata patched), otherwise a new
 * batch is appended. Dates are accepted as ISO strings or `Date`s; they are
 * normalized to `Date` for the Mongoose schema (R5.2).
 */
interface BatchInput {
    batchNumber: string;
    quantity: number;
    expiryDate?: string | Date | null;
    manufactureDate?: string | Date | null;
    costPerUnit?: number | null;
    supplierId?: string | null;
    receivedAt?: string | Date | null;
}

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
 * NOT persist the coercion — it is the batch-aware VIEW of the product.
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
 * R5.4 / R5.5: validate a batch before it is written. Throws a field-identifying
 * validation `Error` that blocks the mutation when:
 *  - `quantity` is negative or not a finite number (R5.4), or
 *  - both dates are provided and `expiryDate < manufactureDate` (R5.5).
 */
function validateBatchInput(input: BatchInput): void {
    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
        throw new Error("quantity must be zero or a positive number");
    }

    const expiryMs = input.expiryDate == null ? null : new Date(input.expiryDate as string | Date).getTime();
    const mfgMs = input.manufactureDate == null ? null : new Date(input.manufactureDate as string | Date).getTime();

    if (
        expiryMs != null &&
        mfgMs != null &&
        !Number.isNaN(expiryMs) &&
        !Number.isNaN(mfgMs) &&
        expiryMs < mfgMs
    ) {
        throw new Error("expiryDate must be on or after manufactureDate");
    }
}

/**
 * List a product's batches as the pure engine sees them (R5.3 read view).
 *
 * Legacy products that still carry a scalar `quantity` with no batches get a
 * lazily-coerced "OPENING" batch in the returned view (R7.1/R7.2) so callers see
 * a consistent batch-shaped result — WITHOUT persisting anything on a pure read
 * (per design: a read never mutates).
 *
 * Gated by `inventoryManagement`.
 */
async function _listProductBatches(user: User, productId: string): Promise<Batch[]> {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const product = await InventoryProduct.findById(productId).lean();
        if (!product) {
            console.log("Product not found");
            return [];
        }

        const batches = readProductBatches(product as { quantity?: number | null; batches?: unknown[] | null });
        return JSON.parse(JSON.stringify(batches));
    } catch (error) {
        console.error("Error listing product batches:", error);
        throw error;
    }
}
export const listProductBatches = await withAuth(_listProductBatches, "inventoryManagement");

/**
 * Add a new batch to a product or update an existing one (matched by
 * `batchNumber`), then recompute `product.quantity = sumBatchQuantity(batches)`
 * so the derived-sum invariant always holds (R6.1).
 *
 * Before touching batches, a legacy scalar quantity on a product with no batches
 * is lazily materialized into an "OPENING" batch and PERSISTED (R7.1/R7.2), so
 * the historical on-hand stock is preserved as a real lot rather than silently
 * folded into the new batch.
 *
 * Validation (R5.4/R5.5) runs first and throws to block the mutation. Writes a
 * `History` row and returns the updated product following the repo's
 * `JSON.parse(JSON.stringify(...))` convention. Gated by `inventoryManagement`.
 */
async function _addOrUpdateBatch(
    user: User,
    productId: string,
    input: BatchInput,
    path?: string,
) {
    try {
        if (!user) throw new Error("User not logged in");

        // R5.4 / R5.5 — reject bad input before any write.
        validateBatchInput(input);

        await connectToDB();

        const product = await InventoryProduct.findById(productId);
        if (!product) {
            console.log("Product not found");
            return null;
        }

        // R7.1 / R7.2 — lazily materialize a legacy scalar quantity into an
        // opening batch the first time a batch-aware op runs on this product.
        const hasBatches = Array.isArray(product.batches) && product.batches.length > 0;
        const scalarQty = Number(product.quantity) || 0;
        if (!hasBatches && scalarQty > 0) {
            product.batches = [
                {
                    batchNumber: "OPENING",
                    expiryDate: null,
                    quantity: scalarQty,
                    manufactureDate: null,
                    costPerUnit: null,
                    supplierId: null,
                    receivedAt: null,
                },
            ] as IInventoryProduct["batches"];
        } else if (!Array.isArray(product.batches)) {
            product.batches = [] as IInventoryProduct["batches"];
        }

        const batches = product.batches as NonNullable<IInventoryProduct["batches"]>;
        const qty = Number(input.quantity);

        // Match an existing lot by batchNumber → update; otherwise append.
        const existing = batches.find((b) => b.batchNumber === input.batchNumber);
        if (existing) {
            existing.quantity = qty;
            if (input.expiryDate !== undefined) existing.expiryDate = toDateOrNull(input.expiryDate);
            if (input.manufactureDate !== undefined) existing.manufactureDate = toDateOrNull(input.manufactureDate);
            if (input.costPerUnit !== undefined) existing.costPerUnit = input.costPerUnit ?? null;
            if (input.supplierId !== undefined) {
                existing.supplierId = (input.supplierId ?? null) as IInventoryBatch["supplierId"];
            }
            if (input.receivedAt !== undefined) existing.receivedAt = toDateOrNull(input.receivedAt);
        } else {
            batches.push({
                batchNumber: input.batchNumber,
                expiryDate: toDateOrNull(input.expiryDate),
                quantity: qty,
                manufactureDate: toDateOrNull(input.manufactureDate),
                costPerUnit: input.costPerUnit ?? null,
                supplierId: (input.supplierId ?? null) as IInventoryBatch["supplierId"],
                receivedAt: toDateOrNull(input.receivedAt) ?? new Date(),
            } as IInventoryBatch);
        }

        // R6.1 — product.quantity is ALWAYS the sum of batch quantities.
        product.quantity = sumBatchQuantity(
            batches.map((b) => toPureBatch(b as Parameters<typeof toPureBatch>[0])),
        );
        product.mod_flag = true;
        product.modifiedBy = user._id as unknown as IInventoryProduct["modifiedBy"];
        product.action_type = "batch-updated";

        const history = new History({
            actionType: "PRODUCT_BATCH_UPDATED",
            details: {
                itemId: product._id,
                batchNumber: input.batchNumber,
                quantity: qty,
            },
            message: `${user.fullName} updated batch "${input.batchNumber}" on product (ID: ${product._id}); on-hand is now ${product.quantity} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: product._id,
            entityType: "PRODUCT",
        });

        await Promise.all([product.save(), history.save()]);

        if (path) revalidatePath(path);

        return JSON.parse(JSON.stringify(product));
    } catch (error) {
        console.error("Error adding/updating product batch:", error);
        throw error;
    }
}
export const addOrUpdateBatch = await withAuth(_addOrUpdateBatch, "inventoryManagement");
