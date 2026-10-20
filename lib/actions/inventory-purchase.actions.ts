"use server"

import InventoryPurchase from '../models/inventory-purchase.models';
import InventoryProduct from '../models/inventory-product.models';
import ChartAccount from '../models/accounting/chart-account.models';
import { connectToDB } from '../mongoose';
import { revalidatePath } from 'next/cache';
import InventorySupplier from '../models/inventory-supplier.models';
import InventoryStore from '../models/inventory-store.models';
import History from '../models/history.models';
import { withAuth, type User } from '../helpers/auth';
import { postLedgerEntryLines, reverseLedgerEntry } from './accounting/bridge.actions';
import { getSettingsInternal } from './accounting/accounting-settings.actions';
import { pickAccountCode } from '../inventory/account-resolution';
import { buildPurchaseJournalLines, type PurchaseLineItem } from '../inventory/postings';
import { sumBatchQuantity, type Batch } from '../inventory/batches';

interface ItemsProps {
    products: string;
    quantity: number;
    discount: number;
}

interface PurchaseProps {
    supplierId: string;
    storeId: string;
    status?: string;
    purchaseDate: Date;
    purchaseItems: ItemsProps[];
}

/**
 * Map a persisted/plain batch (Mongoose stores `Date`s) to the pure engine's
 * {@link Batch} shape (ISO strings) so `sumBatchQuantity` stays identical to the
 * property-tested math. Mirrors `toPureBatch` in `inventory-product.actions.ts`.
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
    const toIso = (v: Date | string | null | undefined): string | null => {
        if (v == null) return null;
        const d = v instanceof Date ? v : new Date(v);
        const ms = d.getTime();
        return Number.isNaN(ms) ? null : d.toISOString();
    };
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
 * Resolve an active, non-deleted ChartAccount by its `code`, returning its id as
 * a string, or null when the code is unset / unmatched. Mirrors the bridge's own
 * `resolveAccountByCode` (which resolves by `code`, not `_id`).
 */
async function resolveCodeToAccountId(code: string | null | undefined): Promise<string | null> {
    if (!code) return null;
    const account = await ChartAccount.findOne({ code: String(code), del_flag: { $ne: true } });
    return account ? String(account._id) : null;
}

/**
 * Resolve a product's `inventoryAccountId` link (a ChartAccount `_id`) to its
 * `code`, so it can feed the pure `pickAccountCode` resolver alongside the
 * settings default code. Returns null when the link is unset or the referenced
 * account no longer resolves to an active, non-deleted account.
 */
async function resolveLinkIdToCode(id: unknown): Promise<string | null> {
    if (!id) return null;
    const account = await ChartAccount.findOne({ _id: String(id), del_flag: { $ne: true } });
    return account ? String(account.code) : null;
}

async function _createPurchase(user: User, values: PurchaseProps, path: string) {
    try {
        const { supplierId, storeId, status, purchaseDate, purchaseItems } = values;

        if (!user) throw new Error('User not logged in');

        await connectToDB();

        // Resolve the global default account codes once (R2 fallback source).
        const settings = await getSettingsInternal();
        const defaults = settings?.defaultAccounts || {};

        // Fetch each product, add the received stock as a BATCH (R6.2) — not a
        // scalar increment — recomputing quantity = sum(batches), accumulate the
        // monetary purchase total, and track the per-product inventory link code
        // so the inventory DEBIT account can be resolved (R3.1 / R3.3).
        const lineItems: PurchaseLineItem[] = [];
        let inventoryLinkCode: string | null = null;

        for (const item of values.purchaseItems) {
            const product = await InventoryProduct.findById(item.products);
            if (!product) {
                throw new Error(`Product with ID ${item.products} not found.`);
            }

            const addQty = Number(item.quantity) || 0;

            // R6.2 — add the received stock as a batch. Lazily coerce a legacy
            // scalar quantity into an opening batch the first time this runs so
            // the derived-sum invariant holds afterwards.
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
            const unitCost = Math.max(0, (Number(product.purchasePrice) || 0) - (Number(item.discount) || 0));
            if (addQty > 0) {
                batches.push({
                    batchNumber: `PO-${Date.now()}-${batches.length + 1}`,
                    expiryDate: null,
                    quantity: addQty,
                    manufactureDate: null,
                    costPerUnit: unitCost,
                    supplierId: (supplierId || null) as IInventoryBatch["supplierId"],
                    receivedAt: new Date(),
                } as IInventoryBatch);
            }

            // R6.1 — product.quantity is ALWAYS the sum of batch quantities.
            product.quantity = sumBatchQuantity(
                batches.map((b) => toPureBatch(b as Parameters<typeof toPureBatch>[0])),
            );
            product.mod_flag = true;
            product.modifiedBy = user._id as unknown as IInventoryProduct["modifiedBy"];
            product.action_type = "purchase-received";
            await product.save();

            lineItems.push({
                quantity: addQty,
                purchasePrice: Number(product.purchasePrice) || 0,
                discount: Number(item.discount) || 0,
            });

            // First product carrying an inventory-account link wins the DEBIT
            // side resolution (per-purchase JE). Resolve its id → code.
            if (inventoryLinkCode == null && product.inventoryAccountId) {
                inventoryLinkCode = await resolveLinkIdToCode(product.inventoryAccountId);
            }
        }

        // R3.1 / R3.3 — resolve the inventory DEBIT account: product link code →
        // default inventory code → skip. Resolve the chosen code to an active id.
        const inventoryCode = pickAccountCode(inventoryLinkCode, defaults.inventory);
        const inventoryAccountId = await resolveCodeToAccountId(inventoryCode);

        // R3.2 — resolve the CREDIT side: Accounts Payable when a supplier is
        // recorded, else Cash. Resolve the chosen code to an active id.
        const creditCode = supplierId
            ? pickAccountCode(null, defaults.accountsPayable)
            : pickAccountCode(null, defaults.cash);
        const creditAccountId = await resolveCodeToAccountId(creditCode);

        // R3.1 / R3.7 — build the balanced inventory-debit JE lines for the
        // computed total (Σ max(0, qty × (price − discount))) via the pure builder.
        // R3.6 — skip-and-complete: when either account fails to resolve we post
        // no JE and leave journalEntryId null; the purchase still completes.
        let journalEntryId: string | null = null;
        let total = 0;

        if (inventoryAccountId && creditAccountId) {
            const built = buildPurchaseJournalLines({
                items: lineItems,
                inventoryAccountId,
                creditAccountId,
                memo: "Inventory purchase",
            });
            if (built) {
                total = built.total;
                const je = await postLedgerEntryLines(user, {
                    lines: built.lines,
                    memo: "Inventory purchase",
                    source: "purchase",
                    sourceId: null,
                    vendorId: supplierId || null,
                });
                journalEntryId = je ? String(je.journalEntryId) : null;
            }
        } else {
            // No JE posted (R3.6) — still record the computed total on the purchase.
            total = lineItems.reduce((sum, li) => {
                const net = Math.max(0, (Number(li.purchasePrice) || 0) - (Number(li.discount) || 0));
                return sum + net * (Number(li.quantity) || 0);
            }, 0);
        }

        // Create new purchase
        const newPurchase = new InventoryPurchase({
            supplierId,
            storeId,
            status,
            purchaseDate,
            purchaseItems,
            total,
            journalEntryId,
            createdBy: user._id,
            action_type: "created"
        });

        const history = new History({
            actionType: 'PURCHASE_CREATED',
            details: {
                itemId: newPurchase._id,
                deletedAt: new Date(),
            },
            message: `${user.fullName} created new purchase with (ID: ${newPurchase._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: newPurchase._id,
            entityType: 'PURCHASE', // The type of the entity, e.g., 'PRODUCT', 'SUPPLIER', etc.
        });

        await Promise.all([
            newPurchase.save(),
            history.save(),
        ]);

        revalidatePath(path); // Revalidate the cache for the updated data

    } catch (error) {
        console.error('Error creating purchase:', error);
        // Handle the error as needed, e.g., throw it, return a value, etc.
        throw error;
    }
}

export const createPurchase = await withAuth(_createPurchase)



async function _fetchAllPurchases(user: User) {
    try {
        if (!user) throw new Error('User not logged in');

        await connectToDB();

        // Fetch all purchases and populate the related fields
        const purchases = await InventoryPurchase.find({})
            .populate([
                { path: 'supplierId', model: InventorySupplier, select: 'name' },
                { path: 'storeId', model: InventoryStore, select: 'name' },
            ]) // Populate supplier details, assuming the Supplier model has a `name` field
            .exec();

        if (purchases.length === 0) {
            return []
        }

        return JSON.parse(JSON.stringify(purchases));
    } catch (error) {
        console.error('Error fetching purchases:', error);
        throw error;
    }
}

export const fetchAllPurchases = await withAuth(_fetchAllPurchases)


async function _fetchPurchaseById(user: User, id: string) {
    try {
        if (!user) throw new Error('User not logged in');

        await connectToDB();

        const purchase = await InventoryPurchase.findById(id).lean()

        if (!purchase) {
            console.log('Purchase not found');
            return null;
        }

        return JSON.parse(JSON.stringify(purchase));
    } catch (error) {
        console.error('Error fetching purchase by ID:', error);
        throw error;
    }
}
export const fetchPurchaseById = await withAuth(_fetchPurchaseById)


async function _updatePurchase(user:User,purchaseId: string, values: Partial<PurchaseProps>, path: string) {
    try {

        if (!user) throw new Error('User not logged in');

        await connectToDB();

        const newValues = {
            ...values,
            mod_flag: true,
            modifyBy: user._id,
            action_type: "updated"
        }

        const updatedPurchase = await InventoryPurchase.findByIdAndUpdate(
            purchaseId,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updatedPurchase) {
            console.log('Purchase not found');
            return null;
        }

        console.log('Update successful');

        // Revalidate the path if necessary
        revalidatePath(path);

    } catch (error) {
        console.error('Error updating purchase status:', error);
        throw error;
    }
}
export const updatePurchase = await withAuth(_updatePurchase)



/**
 * Remove `qty` units added by a purchase from a product's batches, preserving
 * the derived-sum invariant (R6.1). Mutates and returns the plain-batch array.
 *
 * Timestamps aren't stored on the purchase, so the exact `PO-{timestamp}-{n}`
 * lot created at receive-time can't be matched deterministically. The pragmatic
 * reconciliation here is the inverse of `restoreStock`: prefer to pull the units
 * from a matching PO lot for this supplier (a `PO-` batch with enough quantity),
 * otherwise drain remaining units from the newest-received / latest-expiring
 * batches first (LIFO-ish, mirroring how receive appends new lots), floored at
 * zero so a quantity is never driven negative. The product quantity is always
 * recomputed as `sumBatchQuantity(batches)` by the caller.
 */
function removePurchaseQuantity(
    batches: IInventoryBatch[],
    qty: number,
    supplierId: string | null,
): IInventoryBatch[] {
    let remaining = Math.max(0, Number(qty) || 0);
    if (remaining <= 0 || !Array.isArray(batches)) return batches;

    // 1) Prefer draining matching PO lots for this supplier (newest first).
    const poIdx = batches
        .map((b, index) => ({ b, index }))
        .filter(({ b }) =>
            String(b?.batchNumber ?? "").startsWith("PO-") &&
            (supplierId == null || String(b?.supplierId ?? "") === String(supplierId)),
        )
        .sort((x, y) => {
            const ax = x.b?.receivedAt ? new Date(x.b.receivedAt as unknown as string).getTime() : 0;
            const ay = y.b?.receivedAt ? new Date(y.b.receivedAt as unknown as string).getTime() : 0;
            return ay - ax; // newest received first
        })
        .map(({ index }) => index);

    for (const index of poIdx) {
        if (remaining <= 0) break;
        const have = Math.max(0, Number(batches[index].quantity) || 0);
        const take = Math.min(have, remaining);
        batches[index].quantity = have - take;
        remaining -= take;
    }

    // 2) Drain any remaining units from the rest (newest-received first).
    if (remaining > 0) {
        const restIdx = batches
            .map((_, index) => index)
            .filter((index) => !poIdx.includes(index))
            .sort((a, b) => {
                const aa = batches[a]?.receivedAt ? new Date(batches[a].receivedAt as unknown as string).getTime() : 0;
                const bb = batches[b]?.receivedAt ? new Date(batches[b].receivedAt as unknown as string).getTime() : 0;
                return bb - aa;
            });
        for (const index of restIdx) {
            if (remaining <= 0) break;
            const have = Math.max(0, Number(batches[index].quantity) || 0);
            const take = Math.min(have, remaining);
            batches[index].quantity = have - take;
            remaining -= take;
        }
    }

    return batches;
}

async function _deletePurchase(user: User, id: string) {
    try {
        if (!user) throw new Error('User not logged in');
        await connectToDB();

        const purchase = await InventoryPurchase.findById(id);
        if (!purchase) {
            console.log('Purchase not found');
            return null;
        }

        // R3.5 / R7.4 — reverse the purchase JE. Prefer the stored
        // `journalEntryId` (written by `_createPurchase` after task 6.1); fall
        // back to the legacy `transactionId` so purchases posted before the
        // rewrite stay reversible. `reverseLedgerEntry` is a safe no-op when the
        // id matches nothing, so if neither exists we simply skip reversal.
        const reversalId = purchase.journalEntryId
            ? String(purchase.journalEntryId)
            : purchase.transactionId
                ? String(purchase.transactionId)
                : null;
        if (reversalId) {
            await reverseLedgerEntry(user, reversalId);
        }

        // Reverse the stock this purchase added. Task 6.1 now records received
        // stock as BATCHES, so a scalar `product.quantity -= item.quantity` would
        // break the quantity = sum(batches) invariant (R6.1). Instead remove the
        // purchased units from the batches and recompute the derived sum.
        const purchaseSupplierId = purchase.supplierId ? String(purchase.supplierId) : null;
        for (const item of purchase.purchaseItems) {
            const product = await InventoryProduct.findById(item.products);
            if (!product) continue;

            const addedQty = Number(item.quantity) || 0;

            if (Array.isArray(product.batches) && product.batches.length > 0) {
                removePurchaseQuantity(
                    product.batches as unknown as IInventoryBatch[],
                    addedQty,
                    purchaseSupplierId,
                );
                product.quantity = sumBatchQuantity(
                    (product.batches as NonNullable<IInventoryProduct["batches"]>).map((b) =>
                        toPureBatch(b as Parameters<typeof toPureBatch>[0]),
                    ),
                );
            } else {
                // Legacy product with no batches — keep the scalar decrement,
                // floored at zero.
                product.quantity = Math.max(0, (Number(product.quantity) || 0) - addedQty);
            }

            product.mod_flag = true;
            product.modifiedBy = user._id as unknown as IInventoryProduct["modifiedBy"];
            product.action_type = "purchase-reversed";
            await product.save();
        }

        await InventoryPurchase.findByIdAndDelete(id);
        return JSON.parse(JSON.stringify(purchase));
    } catch (error) {
        console.error('Error deleting purchase:', error);
        throw error;
    }
}
export const deletePurchase = await withAuth(_deletePurchase)