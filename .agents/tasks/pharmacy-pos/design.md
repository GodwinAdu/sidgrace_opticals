# Design — Professional Walk-in Pharmacy POS

## Overview

This feature adds an over-the-counter Pharmacy POS so the clinic can sell drugs to **non-patients** (with an optional patient link), take payment inline, deplete stock through the existing FEFO batch engine, and post exactly two journal entries (revenue + COGS relief) per completed sale. It introduces a new `PharmacySale` Mongoose model, a new `'use server'` action module, a two-pane POS UI with a printable receipt, and a nav entry under the existing Pharmacy group.

The implementation **mirrors the canonical `_dispenseVisitProducts` flow** in `lib/actions/visit-clinical.actions.ts` for all stock/accounting mechanics, so the math and the posting semantics stay identical across the app. Nothing in the existing dispense-to-visit path is changed; this is a parallel, additive flow for walk-in sales that bypasses the visit/invoice billing entirely and recognizes revenue once, at the POS.

Target stack (locked): **Next.js 15 App Router (server actions + server components) + Mongoose 8 + TypeScript**, UI via the repo's shadcn/ui components and `sonner` toasts. 4-space indentation in actions/models, `JSON.parse(JSON.stringify(...))` return convention.

---

## ⚠️ Blocking prerequisite (must be resolved before implementation)

The implementation worktree `.worktrees/pharmacy-pos` is checked out on branch `feature/pharmacy-pos`, whose committed tip (`f470c67`, the encounter-workspace rebuild) **predates the inventory-batch and accounting-bridge work**. The following reference files that R3/R4/R6/R7 depend on **do not exist on this branch**:

- `lib/inventory/batches.ts` (FEFO engine: `depleteFefo`, `sumBatchQuantity`, `coerceLegacyToOpeningBatch`, `restoreStock`, `InsufficientStockError`, `isInsufficientStockError`)
- `lib/inventory/postings.ts` (`buildCogsReliefJournalLines`, `ConsumedBatchCost`)
- `lib/inventory/account-resolution.ts` (`pickAccountCode`)
- `lib/actions/accounting/bridge.actions.ts` (`postLedgerEntry`, `postLedgerEntryLines`, `reverseLedgerEntry`)
- `lib/actions/accounting/accounting-settings.actions.ts` (`getSettingsInternal`, `defaultAccounts.expense/.inventory`)
- `lib/models/accounting/chart-account.models.ts`, `journal-entry.models.ts`
- The batch/account-link fields on `InventoryProduct` (`batches`, `inventoryAccountId`, `revenueAccountId`, `cogsAccountId`) and the matching `IInventoryProduct`/`IInventoryBatch` types
- The `_dispenseVisitProducts` FEFO version (the branch's `visit-clinical.actions.ts` is the pre-batch version), and `fetchDrugProducts` / the `/dashboard/pharmacy` routes

These exist and are complete in the **main working tree** (`c:\Users\Jr\Desktop\sidgrace_opticals`) but are currently **uncommitted** there and have **never been committed on any branch**. The worktree is on branch `feature/pharmacy-pos` at tip `f470c67` (the encounter-workspace rebuild), which predates all of it. **This was re-verified again for the current (iteration-3) revision**, confirming the review's HIGH-1 finding is still live and unresolved: `Test-Path` in `.worktrees/pharmacy-pos` returns **False** for `lib/inventory/batches.ts`, `lib/inventory/postings.ts`, `lib/inventory/account-resolution.ts`, `lib/actions/accounting/bridge.actions.ts`, and `lib/actions/accounting/accounting-settings.actions.ts` (only `lib/helpers/user.actions.ts`, `clinic-settings.actions.ts`, `history.models.ts`, and `counter.models.ts` are present). Everything in this design is written against those canonical files (read in full from main), but the gate below has **not** passed — the orchestrator must clear it before implementation starts.

**Resolution (MANDATORY — do not start implementation until this passes):** the prerequisite is an environment/sequencing fix, not a design change. Pick exactly one and perform it first:

1. **Commit-then-merge (preferred):** in the main tree, commit the inventory-accounting + batch-engine + pharmacy-inventory work to its source branch, then `git -C .worktrees/pharmacy-pos merge <that-branch>` (or rebase `feature/pharmacy-pos` onto it). This is preferred because it preserves history and keeps the worktree on its own branch.
2. **Repoint the worktree:** have the orchestrator re-create / re-point `.worktrees/pharmacy-pos` at the branch/commit that already carries those files.

**Gate (hard stop):** implementation may begin only when, run inside `.worktrees/pharmacy-pos`, **all** of these return `True` — `Test-Path lib/inventory/batches.ts`, `Test-Path lib/inventory/postings.ts`, `Test-Path lib/actions/accounting/bridge.actions.ts`, `Test-Path lib/actions/accounting/accounting-settings.actions.ts` — **and** `inventory-product.actions.ts` exports `fetchDrugProducts` **and** `visit-clinical.actions.ts` contains the FEFO `_dispenseVisitProducts` (grep for `depleteFefo`). Until then `npx tsc --noEmit` / `npx next build` cannot pass because every import in the action module resolves to a nonexistent file. The design itself is complete and correct against the canonical code; only the branch state blocks it.

The rest of this document assumes those files are present (as they are in main) and cites them by their canonical paths/signatures.

---

## Technology & integration points (locked)

| Concern | Decision |
|---|---|
| Persistence | New model `lib/models/pharmacy-sale.models.ts` (`PharmacySale`), plus `IPharmacySale` in `lib/types.d.ts` |
| Sale numbering | `nextSequence("pharmacy-sale-" + year)` from `lib/models/counter.models.ts`, formatted `POS-YYYY-00001` (mirrors `generateBridgeEntryNo` / `generateInvoiceNumber`) |
| Stock | `lib/inventory/batches.ts` pure engine, via the exact `toPureBatch`/`toSchemaBatch`/`readProductBatches` pattern copied from `_dispenseVisitProducts` |
| Revenue posting | `postLedgerEntry(user, { type: 'income', category: 'Pharmacy Sales', ... })` from `lib/actions/accounting/bridge.actions.ts` |
| COGS posting | `postLedgerEntryLines(user, { lines, ... })` with lines from `buildCogsReliefJournalLines` (`lib/inventory/postings.ts`) |
| Account resolution | `pickAccountCode` (`lib/inventory/account-resolution.ts`) + `resolveLinkIdToCode`/`resolveCodeToAccountId` helpers copied from `_dispenseVisitProducts` |
| Auth | `withAuth(_fn, 'pharmacyManagement')` from `lib/helpers/auth.ts` |
| Patient link | `fetchPatientBySearch` from `lib/actions/patient.actions.ts` |
| Drug list | `fetchDrugProducts` from `lib/actions/inventory-product.actions.ts` |
| Clinic name (receipt) | `getClinicSettings()` from `lib/actions/clinic-settings.actions.ts` — returns a JSON object whose `clinicName` defaults to `"Medira"`; read `settings?.clinicName \|\| "Clinic"` |
| Cashier name (receipt) | `currentUser()` from `lib/helpers/user.actions.ts` — cached, throws if unauthenticated (fine on a protected route); returns `User` with optional `fullName`; read `user?.fullName \|\| "Cashier"` in `page.tsx` and pass down as the `cashierName` prop |
| Audit log | `History.create(...)` with new `actionType`s `PHARMACY_SALE_CREATED` / `PHARMACY_SALE_VOIDED` (added to the enum in `lib/models/history.models.ts`) |
| UI | shadcn/ui (`button`, `card`, `input`, `select`, `badge`, `table`, `scroll-area`, `dialog`, `separator`, `label`, `textarea`) + `sonner` toast; style matched to `OpdForm.tsx` / `AccountingSettings.tsx` |
| Nav | `components/dashboad-layout/nav-main.tsx` Pharmacy group (~line 444) |

---

## Files to create / modify

**Create**
1. `lib/models/pharmacy-sale.models.ts` — the `PharmacySale` model.
2. `lib/actions/pharmacy-sale.actions.ts` — `'use server'`; `createPharmacySale`, `listPharmacySales`, `voidPharmacySale`.
3. `lib/constants/pharmacy-pos.ts` — **non-`'use server'`** module holding shared constant lists (payment methods) and the shared input/line TypeScript types (see R7 note).
4. `app/(dashboard)/(routes)/dashboard/pharmacy/pos/page.tsx` — server component.
5. `app/(dashboard)/(routes)/dashboard/pharmacy/pos/_components/PharmacyPOS.tsx` — client component (the POS).
6. `app/(dashboard)/(routes)/dashboard/pharmacy/pos/_components/Receipt.tsx` — client receipt component.

**Modify**
7. `lib/types.d.ts` — add `IPharmacySale` (+ `IPharmacySaleItem`, `IPharmacySaleBatchLine`) ambient global interfaces.
8. `components/dashboad-layout/nav-main.tsx` — add the "Point of Sale" item to the Pharmacy group.
9. `lib/models/history.models.ts` — add `PHARMACY_SALE_CREATED` and `PHARMACY_SALE_VOIDED` to the `actionTypes` enum (both audit writes fail Mongoose enum validation without this — see "Audit writes" below).
10. `lib/actions/accounting/accounting-settings.actions.ts` — seed `revenueByCategory: { "Pharmacy Sales": "4300" }` into `DEFAULT_ACCOUNT_MAP` so POS revenue routes to the dedicated **Pharmacy Revenue** account by default (see Finding-4 resolution under "Post revenue").

No existing model **field** is removed or retyped, no existing action behavior changes, and the prescription-dispense flow is untouched. The two edits above are purely **additive** (one new enum value pair, one new default-map entry) and backward-compatible: existing History rows and existing accounting settings are unaffected (the per-category seed only applies when a settings singleton is first created; existing clinics keep their current map — see the Finding-4 note for the migration behavior).

---

## Data model — `PharmacySale` (`lib/models/pharmacy-sale.models.ts`)

Follows `payment.models.ts` / `invoice.models.ts` conventions (Schema typed `Schema<IPharmacySale>`, `models.X ?? model(...)`, `timestamps: true`, standard audit flags). An embedded `PharmacySaleItemSchema` (`_id: false`) mirrors `InvoiceItemSchema`.

```
PharmacySaleBatchLineSchema (_id:false):
    batchNumber: String
    quantity:    Number
    costPerUnit: Number | null   // per-unit cost captured from the depleted batch (COGS)

PharmacySaleItemSchema (_id:false):
    productId:       ObjectId ref InventoryProduct, required
    name:            String, required
    quantity:        Number, required, min 1
    unitPrice:       Number, required, min 0   // product.salePrice snapshot
    total:           Number, required, min 0   // unitPrice * quantity
    prescriptionRequired: Boolean, default false   // snapshot for receipt/audit
    controlledSubstance:  Boolean, default false   // snapshot
    batchBreakdown:  [PharmacySaleBatchLineSchema], default []   // consumed rows (for void/restore + COGS trace)

PharmacySaleSchema:
    saleNumber:        String, required, unique            // POS-YYYY-00001
    items:             [PharmacySaleItemSchema], default []
    subTotal:          Number, default 0
    total:             Number, default 0
    customerName:      String, default ""
    customerPhone:     String, default ""
    patientId:         ObjectId ref Patient, default null   // OPTIONAL
    paymentMethod:     String, enum ["cash","card","mobile-money","bank-transfer","other"], default "cash"
    paymentReference:  String, default ""
    amountTendered:    Number, default 0                   // relevant for cash
    change:            Number, default 0
    authorizationNote: String, default ""                  // required iff a Rx/controlled item present
    status:            String, enum ["completed","voided"], default "completed"
    journalEntryId:    ObjectId ref JournalEntry, default null   // revenue JE id
    cogsJournalEntryId:ObjectId ref JournalEntry, default null   // COGS relief JE id
    soldBy:            ObjectId ref Staff, default null
    voidedBy:          ObjectId ref Staff, default null
    voidReason:        String, default ""
    // standard audit flags
    createdBy / modifiedBy / deletedBy: ObjectId ref Staff, default null
    mod_flag / del_flag: Boolean, default false
    action_type: String, enum ["created","updated","deleted","restored","voided"], default "created"
    timestamps: true
```

Indexes: `{ saleNumber: 1 }` (unique via field), `{ createdAt: -1 }`, `{ patientId: 1, createdAt: -1 }`.

**`IPharmacySale` in `lib/types.d.ts`** (ambient global `interface ... extends Document`, `Types.ObjectId` refs, matching `IPayment`/`IInvoice` style): mirror every field above, with `items: IPharmacySaleItem[]`, `patientId?: Types.ObjectId | null`, `journalEntryId?: Types.ObjectId | null`, `cogsJournalEntryId?: Types.ObjectId | null`, `createdAt/updatedAt: Date`. Place it next to `IInvoice`/`IPayment`.

---

## Server actions (`lib/actions/pharmacy-sale.actions.ts`)

`"use server"` at top. **Only async functions are exported** (R7). Every shared constant list and every shared *type* lives in `lib/constants/pharmacy-pos.ts` (a plain module, no `"use server"`), imported here — this is exactly the fix for the prior "A 'use server' file can only export async functions" crash: no `export const PAYMENT_METHODS = [...]`, no `export type`, no `export interface` in the action file. Input types used only internally may be declared locally (not exported).

Imports mirror `_dispenseVisitProducts`:
```ts
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
    type Batch, type ConsumedBatch,
    depleteFefo, restoreStock, sumBatchQuantity, coerceLegacyToOpeningBatch, isInsufficientStockError,
} from "../inventory/batches";
import { pickAccountCode } from "../inventory/account-resolution";
import { buildCogsReliefJournalLines, type ConsumedBatchCost } from "../inventory/postings";
import { revalidatePath } from "next/cache";
```

Copy verbatim from `_dispenseVisitProducts` (same file, same semantics): `toIso`, `toDateOrNull`, `toPureBatch`, `toSchemaBatch`, `readProductBatches`, `resolveCodeToAccountId`, `resolveLinkIdToCode`. These are small pure/DB helpers; duplicating them keeps the action self-contained and matches how `inventory-product.actions.ts` and `visit-clinical.actions.ts` each keep their own copies (no shared export exists to reuse, and the prompt says to mirror the pattern).

### `createPharmacySale(values, path?)` — gated `pharmacyManagement`

`values` shape (local interface):
```
{ items: { productId: string; quantity: number }[];
  customerName?: string; customerPhone?: string; patientId?: string | null;
  paymentMethod: "cash"|"card"|"mobile-money"|"bank-transfer"|"other";
  paymentReference?: string; amountTendered?: number; authorizationNote?: string; }
```

**Ordered algorithm (SINGLE authoritative sequence — the invariant-critical part).** This is the one and only execution order; there is no competing ordering elsewhere in this document. The cash-sufficiency guard is **step 2b**, deliberately **before any stock depletion**, so "no successful payment ⇒ no depletion, no ledger post" (R2) is strictly true.

1. **Auth + connect.** `if (!user) throw`; `await connectToDB()`.
2. **Load + validate the cart (pricing R5).** For each item with `quantity > 0`: `product = await InventoryProduct.findById(productId)`; throw `"Product not found"` if missing. Reject if `product.isDrug !== true` or `product.del_flag === true` → throw `"<name> is not a sellable drug"`. Price `unitPrice = Number(product.salePrice) || 0`; `lineTotal = unitPrice * qty`. Snapshot `prescriptionRequired`/`controlledSubstance`. Build the priced `items[]` and compute `subTotal = total = Σ lineTotal`. Reject empty priced cart → throw `"Cart is empty"`.
2b. **Cash guard (payment validation — BEFORE any depletion, R2).** Normalize `paymentMethod` against `POS_PAYMENT_METHODS` (reject an unknown method). If `paymentMethod === "cash"` and `(Number(amountTendered) || 0) < total` → throw `"Amount tendered is less than the total"`. This runs on in-memory values only; nothing has been written yet, so an underpaid sale aborts with zero stock/ledger change. (Compute `change = max(0, (amountTendered||0) - total)` for cash; for non-cash, `amountTendered = total` and `change = 0` — computed here, applied at step 7.)
3. **Authorization gate (R5).** If any item has `prescriptionRequired || controlledSubstance` and `authorizationNote.trim()` is empty → throw `"Authorization/prescriber note required for prescription or controlled items"`. (UI enforces too; the action is the source of truth.)
4. **Aggregate requested qty per product** into `newQty: Map<productId, qty>` (an item list can legitimately repeat a product; summing avoids under-depletion). There is no "previous" quantity for a POS sale, so this is a pure positive-delta deplete — no restore branch.
5. **Stage FEFO depletions atomically (R3 — the atomic invariant).** `now = new Date()`. For each `(id, qty)`:
   - `product = await InventoryProduct.findById(id)`.
   - `currentBatches = readProductBatches(product)` (lazily coerces a legacy scalar quantity to an OPENING batch, non-persisted).
   - `const { batches: nextBatches, consumed } = depleteFefo(currentBatches, qty, now)` inside a `try/catch`. On `isInsufficientStockError(err)` rethrow `new Error(\`Not enough stock for ${product.name}. Available: ${err.available}\`)`; otherwise rethrow. **Because `depleteFefo` throws before mutating anything and we only persist in step 6, one insufficient/expired item aborts the whole sale with zero stock or ledger change.**
   - Record `consumedByProduct.set(id, consumed)` and `fallbackPriceByProduct.set(id, product.purchasePrice || 0)`.
   - First-seen account links: if `cogsLinkCode == null && product.cogsAccountId` → `cogsLinkCode = await resolveLinkIdToCode(product.cogsAccountId)`; same for `inventoryLinkCode` from `product.inventoryAccountId`. (First depleted product carrying a link wins — identical to the dispense flow.)
   - Push `{ product, batches: nextBatches, consumed }` to `pending[]`.
6. **Persist stock (only after ALL depletions staged OK).** For each `pending` entry: `product.batches = batches.map(toSchemaBatch)`; `product.quantity = sumBatchQuantity(batches)` (R6.1 invariant); `await product.save()`.
7. **Create the sale record (payment is inline, paid-in-full — R2).** Attach `batchBreakdown` to each item from `consumedByProduct`. Apply `amountTendered`/`change` computed at step 2b. `saleNumber = POS-YYYY-#####`. Create `PharmacySale` with `subTotal`, `total`, `status: "completed"`, `soldBy: user._id`, `createdBy: user._id`, `action_type: "created"`, `patientId: values.patientId || null`. Save.
   - *The cash guard already ran at step 2b; step 7 does not re-validate payment. Stock is already depleted and the sale row exists before any accounting runs — satisfying "stock + payment must have succeeded first" (R4). A POS sale is paid-in-full at creation, so there is no separate payment document; the `PharmacySale` IS the payment record.*
8. **Post revenue — exactly once (R4a).** `const revEntry = await postLedgerEntry(user, { type: "income", category: "Pharmacy Sales", amount: total, source: "payment", sourceId: String(sale._id), patientId: values.patientId || null, description: \`Pharmacy POS sale ${saleNumber}\` })`. **Do NOT pass `method`** — verified in `postBridgedJournalEntry` (`bridge.actions.ts`): `TxnInput.method?` is accepted by the type but never read; the income branch always debits the single `cash` default account (code `1000`) regardless of tender type, so `method` would be a silent no-op that misleads the reader. The payment method lives only on the `PharmacySale` row (step 7). `pickCategoryCode` inside the bridge routes `category: "Pharmacy Sales"` through `revenueByCategory["Pharmacy Sales"]` → global `revenue` default. **Finding-4 resolution:** because `DEFAULT_ACCOUNT_MAP.revenueByCategory` is seeded `{ "Pharmacy Sales": "4300" }` (modify step 10), a fresh clinic posts POS revenue to the dedicated **Pharmacy Revenue (4300)** account rather than co-mingling with Consultation Revenue (4000). A clinic that has already explicitly remapped "Pharmacy Sales" keeps its own choice; a pre-existing clinic with an empty `revenueByCategory` still falls back to the global `revenue` default (4000) until it re-saves settings — acceptable and documented in Edge cases. If `revEntry` is non-null, set `sale.journalEntryId = revEntry._id` (`revEntry.journalEntryId` alias equals `_id`).
9. **Post COGS relief — exactly once (R4b).** Only if `consumedByProduct.size > 0`:
   - `settings = await getSettingsInternal(); defaults = settings?.defaultAccounts || {}`.
   - `cogsCode = pickAccountCode(cogsLinkCode, defaults.expense)`; `inventoryCode = pickAccountCode(inventoryLinkCode, defaults.inventory)`.
   - `cogsAccountId = await resolveCodeToAccountId(cogsCode)`; `inventoryAccountId = await resolveCodeToAccountId(inventoryCode)`.
   - If both resolve: fold each product's fallback price into its consumed rows (a `null` `costPerUnit` becomes the product's `purchasePrice`), build one aggregate `consumed: ConsumedBatchCost[]`, then `const built = buildCogsReliefJournalLines({ consumed, fallbackPrice: 0, cogsAccountId, inventoryAccountId, memo: "Pharmacy POS COGS" })`. **The action does NOT re-implement any cost math:** `computeCogsAmount` inside `buildCogsReliefJournalLines` already applies the `costPerUnit == null ? fallbackPrice : costPerUnit` rule **per row**, so stamping each product's `purchasePrice` onto its own consumed rows and passing the engine-level `fallbackPrice: 0` is the correct multi-product handling (a single scalar `fallbackPrice` would be wrong across products with different costs). This is exactly how `_dispenseVisitProducts` does it. If `built`, `const cogsEntry = await postLedgerEntryLines(user, { lines: built.lines, memo: "Pharmacy POS COGS", source: "bridge", sourceId: String(sale._id), vendorId: null })`; set `sale.cogsJournalEntryId = cogsEntry._id` when non-null.
   - *This is identical to the dispense flow's COGS block, except `source` traces to the sale id.*
10. **Persist JE ids.** `await sale.save()` (to store the two JE ids). `if (path) revalidatePath(path)`; `revalidatePath("/dashboard/inventory/products")`. Return `JSON.parse(JSON.stringify(sale))`.
11. **Best-effort audit (AFTER the committed sale — Finding 1).** See "Audit writes" below. The `History.create` call is wrapped in its own `try/catch` so an audit failure can never turn a committed, stock-depleted, posted sale into a caller-visible error.

**No-double-post invariant (explicit):** revenue is posted by step 8 and *only* step 8; the COGS relief in step 9 is a cost entry (debit COGS / credit Inventory), never revenue. A POS sale has no visit and never touches `recordVisitPayment`/`createInvoiceFromVisit`, so there is no second revenue path. The two JE ids are stored so a void reverses exactly those two entries.

**Accounting is best-effort (R4):** `postLedgerEntry`/`postLedgerEntryLines` already catch internally and return `null` on any failure (missing mapping, settings unavailable, non-positive/unbalanced). A null return leaves the corresponding `journalEntryId`/`cogsJournalEntryId` null; the sale still completes. Stock + sale (steps 5–7) ran first, so a failed posting never corrupts stock and never blocks the sale. We do **not** wrap steps 8–9 in extra try/catch beyond what the bridge provides, matching the dispense flow.

**Audit writes (Finding 1 — the History enum + required fields + isolation).** The `History` model (`lib/models/history.models.ts`) validates `actionType` against a fixed `enum` (`required: true`) and requires both `details` (Mixed, `required: true`) and `performedBy`. The existing Pharmacy block has only `PRESCRIPTION_*` values, so a write with an unknown `actionType` **throws a Mongoose validation error**. Because the write happens after the sale, both JEs, and stock depletion have committed, an unguarded throw would surface a *completed* sale as a failure toast and tempt a double-sale retry. Therefore:
- **Modify `lib/models/history.models.ts`:** add `"PHARMACY_SALE_CREATED"` and `"PHARMACY_SALE_VOIDED"` to the `actionTypes` array (under the existing `// ── Pharmacy ──` block, additive).
- **Supply the required `details` object** on every write, matching the shape used by the visit/invoice History calls in `visit-clinical.actions.ts` (e.g. `details: { itemId: sale._id, saleNumber: sale.saleNumber, total: sale.total }`), plus `performedBy: user._id`, `entityId: sale._id`, `entityType: "PHARMACY_SALE"`, and a human `message`.
- **Wrap the write in its own `try/catch`** (`catch (e) { console.error("Pharmacy sale audit write failed", e); }`) so an audit failure never fails a committed sale. This matches the "best-effort audit AFTER the save" posture `visit-clinical.actions.ts` uses via `writeVisitAuditEntry`.

Export: `export const createPharmacySale = await withAuth(_createPharmacySale, "pharmacyManagement");`

### `listPharmacySales(limit?)` — gated `pharmacyManagement`

`PharmacySale.find({ del_flag: { $ne: true } }).populate("soldBy", "fullName").populate("patientId", "fullName patientId").sort({ createdAt: -1 }).limit(Number(limit) || 100)`; return `JSON.parse(JSON.stringify(...))`, `[]` on empty/error (matching `fetchDrugProducts`' catch-returns-`[]` posture for read lists).

### `voidPharmacySale(id, path?)` — gated `pharmacyManagement`

1. Load the sale; throw if missing; if already `status === "voided"` return it (idempotent no-op).
2. **Reverse both JEs** (best-effort, order-independent): `if (sale.journalEntryId) await reverseLedgerEntry(user, String(sale.journalEntryId));` and `if (sale.cogsJournalEntryId) await reverseLedgerEntry(user, String(sale.cogsJournalEntryId));`. `reverseLedgerEntry` is a safe no-op if an id is null/missing/already reversed.
3. **Restore stock** via the batch engine: for each item, `product = await InventoryProduct.findById(item.productId)`; if present, `currentBatches = readProductBatches(product)`; for each `batchBreakdown` row `restoreStock(currentBatches, row.quantity, { batchNumber: row.batchNumber, costPerUnit: row.costPerUnit })` (restores into the originally-consumed lot when it still exists, else tops up / creates a RESTORED lot — `restoreStock` semantics). If an item has no `batchBreakdown` (shouldn't happen for a completed sale), fall back to `restoreStock(currentBatches, item.quantity)`. Then `product.batches = next.map(toSchemaBatch)`; `product.quantity = sumBatchQuantity(next)`; `await product.save()`.
4. Set `sale.status = "voided"`, `voidedBy = user._id`, `mod_flag = true`, `modifiedBy = user._id`, `action_type = "voided"`; `await sale.save()`.
5. Write `History` with `actionType: "PHARMACY_SALE_VOIDED"` (added to the enum in modify step 9), `details: { itemId: sale._id, saleNumber: sale.saleNumber, total: sale.total }`, `performedBy: user._id`, `entityId: sale._id`, `entityType: "PHARMACY_SALE"`, and a `message` — wrapped in its own `try/catch` for the same best-effort reason as the create path (the sale is already voided before the audit write). `revalidatePath` on `path` + `/dashboard/inventory/products`. Return the voided sale (`JSON.parse(JSON.stringify(...))`).

**Permission scope (Finding 7 — decided):** `voidPharmacySale` is gated by `pharmacyManagement`, the same permission as `createPharmacySale`. This is intentional: voiding is the inverse of a sale (reverse two JEs + restore stock) and sits at the same authority level as making one. **Any `pharmacyManagement` holder may void any sale, including another cashier's** — we do NOT add a stricter supervisory gate, matching how `dispensePrescription` (also `pharmacyManagement`) lets any pharmacy user act on any prescription. The `voidedBy`/`voidReason` fields and the `PHARMACY_SALE_VOIDED` History row provide the audit trail that substitutes for a role split. If a supervisor-only void is later required, tightening the gate to `accountManagement` is a one-line change and does not affect the rest of this design.

Export: `export const voidPharmacySale = await withAuth(_voidPharmacySale, "pharmacyManagement");`

---

## `lib/constants/pharmacy-pos.ts` (non-`'use server'`)

```ts
export const POS_PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "mobile-money", label: "Mobile Money" },
    { value: "bank-transfer", label: "Bank Transfer" },
    { value: "other", label: "Other" },
] as const;

export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number]["value"];

export interface PosCartLine {
    productId: string; name: string; genericName?: string;
    unitPrice: number; quantity: number; available: number;
    prescriptionRequired: boolean; controlledSubstance: boolean;
}
```
Note the deliberate exclusion of `"insurance"` (R2). Both the client UI and the action's enum derive their list from the same conceptual set; the model enum is declared inline in the schema (Mongoose needs a literal array), and the client imports `POS_PAYMENT_METHODS`.

---

## UI

### `page.tsx` (server component)

Mirrors `opd/page.tsx`: `async` default export. Fetch on the server, in parallel:
```ts
const [products, settings] = await Promise.all([
    fetchDrugProducts(),
    getClinicSettings(),            // lib/actions/clinic-settings.actions.ts
]);
const clinicName = settings?.clinicName || "Clinic";
```
Resolve the cashier name on the server from the current session (see Finding 6):
```ts
import { currentUser } from "@/lib/helpers/user.actions";
// ...
const user = await currentUser();               // cached; throws if unauthenticated — fine on this protected route
const cashierName = user?.fullName || "Cashier";
```
Then render a page shell (`<main className="min-h-screen bg-background py-6 px-4 md:px-6">`, max-w container, `<h1>Pharmacy Point of Sale</h1>`, `<Separator />`) and `<PharmacyPOS products={products} clinicName={clinicName} cashierName={cashierName} />`. Fetching on the server keeps the client bundle lean and matches the repo pattern.

**Finding 5 (clinic name source — decided):** the receipt's clinic name comes from `getClinicSettings()` only (`clinicName`, which defaults to `"Medira"` in the model). Do not reach for `ClinicSettings` directly or `lib/clinical/epos-receipt.ts`; `getClinicSettings()` is the single source. Fall back to the literal `"Clinic"` only if the call returns no `clinicName`.

**Finding 6 (cashier name source — decided):** `createPharmacySale` returns `JSON.parse(JSON.stringify(sale))` with a **non-populated** `soldBy` (raw ObjectId); only `listPharmacySales` populates it. So the receipt must NOT try to read a populated `soldBy` name from the create result. Instead, resolve the current user on the server in `page.tsx` via `currentUser()` from `lib/helpers/user.actions.ts` — the cached session helper that returns `{ id, role, fullName?, email?, profileImage?, isAuthenticated }` (verified export; `getCurrentUser()` is the null-returning variant). Use `const user = await currentUser(); const cashierName = user?.fullName || "Cashier";` and pass `cashierName` down through `<PharmacyPOS />` into `<Receipt />`. Note: the sibling `opd/page.tsx` does **not** resolve a user or name an auth helper, so do not look there for the pattern — `currentUser()` is the named source. This is the only reliable cashier-name source at receipt time for the create flow.

### `PharmacyPOS.tsx` (client, `"use client"`)

Two-pane layout inside a responsive grid (`grid lg:grid-cols-[1fr_380px] gap-4`), styled with `Card`s like `AccountingSettings.tsx`.

**Left — product catalog.** Search `Input` filters client-side over `name`, `genericName`, `barcode` (case-insensitive). A `ScrollArea` wraps a grid/list of product `Card`s showing name, strength/form, `salePrice`, on-hand (`product.quantity` / `sumBatchQuantity`), and `Badge`s: amber "Rx" when `prescriptionRequired`, red "Controlled" when `controlledSubstance`, "Out of stock" when available ≤ 0. Clicking adds to cart (disabled at 0 available). Keyboard-friendly: search autofocus, `Enter` adds the top filtered result, arrow navigation optional.

**Right — cart & checkout.** A `Table` of cart lines: name, qty stepper (`-`/input/`+`), unit price, line total, remove (`X`). **Client-side available-qty guard (R5):** the `+` stepper and manual entry clamp at the line's `available`; exceeding it shows a `sonner` warning "Only N in stock" — never silently accepts. Below the table:
- Totals block (subtotal = total).
- Optional `customerName` / `customerPhone` `Input`s.
- Optional patient attach: a small search `Input` calling `fetchPatientBySearch` (debounced) rendering matches in a `Popover`/list; selecting sets `patientId` and shows a removable chip. Never required.
- Payment: `Select` of `POS_PAYMENT_METHODS`; `paymentReference` `Input` (optional); when method is `cash`, an `amountTendered` `Input` with a live **change** readout (`tendered - total`, min 0) and a disabled Complete button until `tendered >= total`.
- **Authorization note:** a `Textarea` that is shown and **required** iff any cart line is `prescriptionRequired || controlledSubstance`; a warning `Badge`/alert explains why. Completion is blocked client-side until filled (and re-validated server-side).
- `Complete Sale` `Button`: disabled when cart empty, stock exceeded, cash-underpaid, or required auth note empty. On click, calls `createPharmacySale({...})`; on success `toast.success`, opens the receipt `Dialog`, and resets the cart; on throw `toast.error(err.message)` (surfaces the server's stock/validation messages).

State is local React state (`useState`): `cart: PosCartLine[]`, customer fields, payment fields, `authorizationNote`, `attachedPatient`, `submitting`. No external form lib needed (matches `OpdForm`'s hand-rolled state style). Money math uses integer-cent-safe rounding helpers to avoid float drift in change/total display.

### `Receipt.tsx` (client)

Rendered inside the success `Dialog`. Props: `sale` (the completed `PharmacySale` returned by `createPharmacySale`), `clinicName`, and `cashierName`. Shows `clinicName`, `saleNumber`, date/time, cashier (**from the `cashierName` prop only** — see Finding 6; never read a populated `soldBy` off the create result), customer name/phone (if any), line items (name, qty, unit, total), subtotal/total, payment method + reference, amount tendered + change (cash), and the authorization note if present.

**Print isolation (Finding 8 — single decided mechanism):** the receipt root is `<div id="pos-receipt">…</div>`, and a `Print` `Button` calls `window.print()`. Printing is scoped by a single `@media print` block keyed on `#pos-receipt`, placed in the app's existing global stylesheet (`app/globals.css`):
```css
@media print {
    body * { visibility: hidden; }
    #pos-receipt, #pos-receipt * { visibility: visible; }
    #pos-receipt { position: absolute; inset: 0; }
}
```
We use the global-stylesheet `@media print` approach and do **not** use `<style jsx global>` — one mechanism, no implementer guesswork. After closing the dialog the cart is already reset.

### Nav (`nav-main.tsx`)

Add the new child as the **third** item of the existing Pharmacy group, immediately after "Drug Inventory", with exactly this shape and **no `icon` key**:
```tsx
{
  title: "Point of Sale",
  url: "/dashboard/pharmacy/pos",
  roleField: "pharmacyManagement",
},
```
No import change is required. Verified: the Pharmacy group (`title: "Pharmacy"`, `roleField: "pharmacyManagement"`) has exactly two children (Prescription Queue, Drug Inventory), **neither carries a per-item `icon`** (only the group itself has `icon: Pill`), so the new item omits `icon` to match the siblings exactly. `ShoppingCart` is already imported (used by the top-level Procurement item), so even though R9 mentions a `ShoppingCart` icon, the children's established shape is iconless and we follow it — no icon, no new import.

---

## Validation rules (per external input)

| Input | Rule | On failure |
|---|---|---|
| `items` | non-empty; each `quantity` integer ≥ 1 | throw `"Cart is empty"` / skip non-positive |
| item `productId` | resolves to a product | throw `"Product not found"` |
| product | `isDrug === true` and not `del_flag` | throw `"<name> is not a sellable drug"` |
| requested qty | ≤ non-expired available (enforced by `depleteFefo`) | throw `"Not enough stock for <name>. Available: N"`; whole sale aborts |
| `authorizationNote` | required (non-empty trimmed) iff any Rx/controlled item | throw `"Authorization/prescriber note required..."` |
| `paymentMethod` | one of the 5 enum values (no insurance) | Mongoose enum rejects; action pre-checks against `POS_PAYMENT_METHODS` |
| `amountTendered` (cash) | ≥ total | throw `"Amount tendered is less than the total"` |
| `customerName` / `customerPhone` / `patientId` | all optional, free text; `patientId` optional ObjectId | coerced to `""`/`null`; never required |

All inputs are treated as untrusted at the action boundary (the action re-validates everything the UI checks). Numbers coerced via `Number(x) || 0`.

## Error handling (per operation)

| Operation | Failure | Recoverable? | Caller receives | Logged |
|---|---|---|---|---|
| `findById(product)` | not found / not a drug | fatal to sale | thrown `Error` (toast) | `console.error` in catch |
| `depleteFefo` | insufficient/expired stock | fatal to sale, **no partial writes** | thrown `Error` with available qty | caught & rethrown with friendly msg |
| `product.save()` (stock) | DB error | fatal to sale (runs before accounting) | thrown `Error` | `console.error` |
| cash underpayment | tendered < total | fatal to sale | thrown `Error` | — |
| `postLedgerEntry` (revenue) | missing mapping / settings / unbalanced | **recoverable** (best-effort) | sale completes, `journalEntryId` null | bridge logs via `console.error` |
| `postLedgerEntryLines` (COGS) | same | **recoverable** | sale completes, `cogsJournalEntryId` null | bridge logs |
| `reverseLedgerEntry` (void) | id missing/already reversed | recoverable no-op | void proceeds | bridge logs |
| `restoreStock` (void) | product deleted | recoverable (skip item) | void proceeds | `console.error` |

The top-level `try/catch` in each `_fn` mirrors the dispense action: `console.error(...); throw error;` for writes, `return []` for the read list.

## Invariants & ownership

- **Atomic FEFO staging (R3):** owned by `createPharmacySale` step 5–6. `depleteFefo` is pure and throws before mutating; nothing persists until every product's depletion is staged. Enforced at the action layer because only it holds the multi-product transaction scope. (Mongoose has no multi-doc transaction here — identical to the dispense flow — so the staging pattern is the atomicity mechanism.)
- **`product.quantity == sumBatchQuantity(batches)` (R6.1):** owned by the pure engine + the persist loop (step 6) and the void restore (step 3). Re-asserted on every save.
- **Exactly two JEs, no double-post (R4):** owned by `createPharmacySale` steps 8–9. Revenue posted once via `postLedgerEntry`; COGS once via `postLedgerEntryLines`; their ids stored for reversal. No visit/invoice path participates.
- **A sale with no successful payment never depletes stock or posts the ledger (R2):** structurally guaranteed by the single ordered algorithm above. The cash-sufficiency guard is **step 2b**, which runs on in-memory values **before** any FEFO staging (step 5) or stock persist (step 6). An underpaid cash sale therefore throws at step 2b with zero stock change and zero ledger post. There is exactly one ordering in this document (the step 1 → 11 sequence); the cash guard is never at step 7, and no other section prescribes a different order. A POS sale is paid-in-full at creation, so there is no separate payment document.

---

## Edge cases

- **Legacy scalar-quantity products (no batches):** `readProductBatches` coerces to an OPENING batch in-memory; first sale persists real batches via step 6. Identical to dispense.
- **Expired lots:** `depleteFefo` skips them; if only expired stock exists, it throws `InsufficientStockError` → sale aborts. Available qty surfaced to the cashier excludes expired stock (compute via `availableForFefo`/`sumBatchQuantity` when rendering on-hand for drugs, or show `product.quantity` with a note; design uses the engine's non-expired available for the cart guard to match server behavior).
- **Repeated product in cart:** quantities aggregated per product before depletion (step 4).
- **Zero/negative quantity lines:** skipped in pricing loop.
- **Revenue account routing (Finding 4):** a fresh clinic's `AccountingSettings` is created with `DEFAULT_ACCOUNT_MAP`, which this design extends to seed `revenueByCategory: { "Pharmacy Sales": "4300" }` (modify step 10). `pickCategoryCode(map.revenueByCategory, "Pharmacy Sales", map.revenue)` therefore resolves to code **4300 "Pharmacy Revenue"** (a seeded operating-revenue account already present in `lib/accounting/coa.ts`), so POS revenue is cleanly separated from Consultation Revenue (4000). Two documented non-default cases: (a) a clinic that explicitly remapped "Pharmacy Sales" in settings keeps its own choice; (b) a **pre-existing** clinic whose settings singleton was created before this change has an empty `revenueByCategory` and will fall back to the global `revenue` default (4000) until its settings are re-saved — acceptable, and the Accounting Settings UI already lets them map the category. If COGS/Inventory accounts don't resolve at all, COGS is skipped and the sale still completes (best-effort).
- **Revenue account 4300 absent (clinic deleted it):** if `4300` has been deactivated/deleted, `pickCategoryCode` still returns the code but `resolveCodeToAccountId` (inside the bridge) finds no active account and the post returns `null` — the sale completes with a null revenue JE (best-effort), same as any unresolved mapping. The dedicated account is seeded by the COA seeder, so this is an edge case, not the default path.
- **Void after accounts reconfigured:** `reverseLedgerEntry` reverses the stored JE ids regardless of current mapping.
- **Total is 0 (all free items):** `postLedgerEntry` returns null for non-positive amounts (bridge guard) — sale completes with null revenue JE; acceptable.

---

## Testability

- **Unit (no DB):** the pure engine (`depleteFefo`, `sumBatchQuantity`, `buildCogsReliefJournalLines`, `pickAccountCode`) is already covered by `batches.test.ts` / `account-resolution.test.ts`; the POS reuses them unchanged, so the stock/COGS math needs no new pure tests. New pure-ish logic worth a unit test: `saleNumber` formatting, change computation, the "requires auth note" predicate, per-product qty aggregation — extract these as small pure helpers in `lib/constants/pharmacy-pos.ts` (or a sibling pure module) so they test without Mongoose.
- **Integration (DB, via `vitest.integration.config.mts`):** `createPharmacySale` happy path (stock decremented, two JE ids set, change correct); insufficient-stock abort (no stock/ledger change); Rx-without-note rejection; `voidPharmacySale` (both JEs reversed, stock restored, status voided). These mirror existing inventory/accounting integration coverage.
- **Build verification:** `npx tsc --noEmit` and `npx next build` must pass (requires the prerequisite above). The `'use server'`-only-async-exports rule is verified by `next build` compiling `/dashboard/pharmacy/pos` without the prior "use server value" error — guaranteed by keeping constants/types in `lib/constants/pharmacy-pos.ts`.

A design note on testability: because the action composes already-tested pure engines and the only new stateful logic is orchestration, the risk surface is the orchestration order (validate → pay-check → stage → persist stock → sale → revenue → COGS). That order is the thing integration tests pin down, and it is small and linear — a sign the design is testable rather than over-coupled.

---

## Responses to design review (iteration 3 — current)

The iteration-3 review (`design-review.json`, verdict CHANGES_REQUESTED: 1 HIGH, 1 MEDIUM, 3 NIT) was resolved as follows. Each finding was re-verified against real source before responding.

**HIGH-1 (blocking prerequisite — worktree lacks every reference file) — ACKNOWLEDGED, re-verified, cannot be cleared by the design author.** This is an environment/sequencing gate, not a design defect; the review itself says "the authored design is correct against the canonical code, but the gate it defines has not passed." I independently re-ran the check in `.worktrees/pharmacy-pos` for this iteration: `Test-Path` returns **False** for `lib/inventory/batches.ts`, `lib/inventory/postings.ts`, `lib/inventory/account-resolution.ts`, `lib/actions/accounting/bridge.actions.ts`, and `lib/actions/accounting/accounting-settings.actions.ts`. The "Blocking prerequisite" section now states this re-verification explicitly and keeps the mandatory, numbered resolution (commit-then-merge preferred, or repoint the worktree) plus the hard-stop gate. Clearing it requires a git/worktree operation outside the scope of design authoring (I must not mutate the worktree's branch state), so it is surfaced for the orchestrator to perform before implementation. The design cannot and must not paper over it — the gate is reproduced faithfully.

**MEDIUM-1 (cashier-name source unverified / cited sibling reads no user) — ADDRESSED.** Verified `lib/helpers/user.actions.ts` in the worktree exports `currentUser` (cached, throws if unauthenticated) and `getCurrentUser` (cached, returns null), both backed by `getAuthenticatedUser(): Promise<User | null>` where `User` carries optional `fullName`. Rewrote the `page.tsx` section to name `currentUser()` concretely (`const user = await currentUser(); const cashierName = user?.fullName || "Cashier";`), added a dedicated "Cashier name (receipt)" row to the integration-points table naming the helper and its file, updated Finding-6 to name `currentUser()`/`getCurrentUser()`, and explicitly dropped the false claim that `opd/page.tsx` already reads a user (it does not — it only calls `getAllAttendances()`).

**NIT-1 (`method` on the revenue post is a silent no-op) — ADDRESSED.** Verified in `bridge.actions.ts` that `postBridgedJournalEntry` reads `type`, `category`, `amount`, `date`, `description`, `source`, `sourceId`, `vendorId` but **never** `method`; the income branch always debits the cash default account (code `1000`). Removed `method: paymentMethod` from the `postLedgerEntry` call in step 8 and added a note that the method is stored on the `PharmacySale` row only and the bridge ignores it.

**NIT-2 (nav icon guidance over-hedged) — ADDRESSED.** Rewrote the Nav section to state flatly that the new child is `{ title: "Point of Sale", url: "/dashboard/pharmacy/pos", roleField: "pharmacyManagement" }` with **no `icon` key**, inserted as the third child after "Drug Inventory", with **no import change**. Deleted the conditional "if icons are later added" wording.

**NIT-3 (COGS step restates engine behavior without pointing to the engine) — ADDRESSED.** Added a cross-reference in step 9: `computeCogsAmount` inside `buildCogsReliefJournalLines` applies the `costPerUnit == null ? fallbackPrice : costPerUnit` rule per row, so the action only stamps each product's `purchasePrice` as its row fallback and passes `fallbackPrice: 0` — exactly as `_dispenseVisitProducts` does, with no re-implemented math.

No finding was backlogged or ignored. HIGH-1 is an orchestration gate (acknowledged, re-verified, out of design-author scope); the rest are resolved in the design text in line with R1–R9 and the Definition of Done.

---

## Responses to design review (iteration 2 — prior)

All eight findings from the iteration-2 review (verdict: CHANGES_REQUESTED) are resolved below. Each was re-verified against the actual source in this iteration.

**Finding 1 (HIGH — History enum / required fields / audit isolation) — ADDRESSED.** Confirmed against `lib/models/history.models.ts`: `actionType` is enum-validated and `required`, `details` is `required`, and the Pharmacy block has only `PRESCRIPTION_*` values. Added `lib/models/history.models.ts` to the Modify list (step 9) with the two new enum values, specified the required `details`/`performedBy`/`entityId`/`entityType`/`message` on each write (matching the `visit-clinical.actions.ts` History shape), and wrapped both audit writes in their own `try/catch` so an audit failure can never fail a committed sale. See "Audit writes" and void step 5.

**Finding 2 (HIGH — blocking prerequisite / worktree lacks reference files) — ADDRESSED (re-verified, still real).** Re-ran the check: the worktree is on `feature/pharmacy-pos` at `f470c67`; `Test-Path` for `batches.ts`, `postings.ts`, and `bridge.actions.ts` all return False in the worktree, and `git log --all` shows the batch engine was never committed on any branch (it lives only as uncommitted files in main). Rewrote the "Blocking prerequisite" section into a mandatory, numbered resolution (commit-then-merge preferred, or repoint the worktree) with an explicit hard-stop gate: implementation may not begin until the four `Test-Path` checks return True in the worktree and `fetchDrugProducts` + the FEFO `_dispenseVisitProducts` are present. This is an environment/sequencing fix outside the design's authorship; flagged clearly so the orchestrator resolves it before implementation.

**Finding 3 (MEDIUM — payment-validation ordering conflict) — ADDRESSED.** Collapsed the two conflicting orderings into one authoritative algorithm with the cash guard as **step 2b** (before any FEFO staging/persist). Removed the step-7 cash-check wording (step 7 now only applies the pre-computed tendered/change and never re-validates) and rewrote the Invariants bullet to state there is exactly one ordering and the guard is never at step 7.

**Finding 4 (MEDIUM — revenue falls back to Consultation Revenue) — ADDRESSED (option a: seed a dedicated account).** Verified `DEFAULT_ACCOUNT_MAP.revenue = "4000"` (Consultation Revenue) and `revenueByCategory = {}`, and discovered `lib/accounting/coa.ts` already seeds **`4300 "Pharmacy Revenue"`**. Chose to seed `revenueByCategory: { "Pharmacy Sales": "4300" }` in `DEFAULT_ACCOUNT_MAP` (Modify step 10) so fresh clinics post POS revenue to its own account. Documented the two non-default cases (clinic already remapped; pre-existing clinic with empty map falling back to 4000 until re-save) in step 8 and Edge cases, so the behavior is explicit rather than implicit.

**Finding 5 (MEDIUM — clinic-name source unspecified) — ADDRESSED.** Verified `getClinicSettings()` in `lib/actions/clinic-settings.actions.ts` returns a JSON object with `clinicName`. Specified `const settings = await getClinicSettings(); const clinicName = settings?.clinicName || "Clinic";` in `page.tsx`, added it to the integration-points table, and named it as the single source (no `ClinicSettings` direct access, no `epos-receipt.ts`).

**Finding 6 (NIT — cashier name source) — ADDRESSED.** Confirmed `createPharmacySale` returns a non-populated `soldBy`. Dropped the "read from the returned populated sale" alternative for the create flow; the receipt now takes a single `cashierName` prop resolved from the current user's `fullName` on the server in `page.tsx`.

**Finding 7 (NIT — void permission scope) — ADDRESSED (documented, no stricter gate).** Documented explicitly that any `pharmacyManagement` holder may void any sale (matching `dispensePrescription`), with the `voidedBy`/`voidReason`/History audit trail as the control, and noted the one-line path to a supervisory gate if later required.

**Finding 8 (NIT — print CSS "or") — ADDRESSED.** Picked one mechanism: a single `@media print` block keyed on `#pos-receipt` in `app/globals.css`. Dropped the `<style jsx global>` alternative.

No findings were backlogged or ignored; all were resolved in line with the original requirements (R1–R9) and the Definition of Done.
