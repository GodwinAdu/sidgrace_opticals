# Walk-in Pharmacy POS — implementation review

The change adds an over-the-counter pharmacy sale flow so the clinic can sell drugs to walk-in (non-patient) customers with an optional patient link. It introduces a `PharmacySale` model, a `'use server'` action module (`createPharmacySale`/`listPharmacySales`/`voidPharmacySale`), a shared non-server constants/helpers module, a two-pane POS UI with a printable receipt, and additive edits to the History enum, the accounting default map, the nav, and the global print CSS. Stock and accounting mechanics mirror the canonical `_dispenseVisitProducts` flow verbatim, so the FEFO math and posting semantics stay identical across the app. Watch for: the prior `'use server'` crash is the highest-risk area, and it is **resolved** here — the action module exports only async `withAuth` consts and all constants/types live in the plain `lib/constants/pharmacy-pos.ts` module (confirmed).

**Verdict**: APPROVED

## High-level view

The sale orchestration follows one linear order: validate and price the cart, run the cash-sufficiency guard on in-memory values, gate Rx/controlled items on an authorization note, stage every product's FEFO depletion into a `pending[]` buffer, and only then persist stock. Because `depleteFefo` throws `InsufficientStockError` before mutating anything and nothing is saved until the whole buffer is staged, one short item aborts the entire sale with zero stock or ledger change. The cash guard sits before the staging loop, so an underpaid cash sale never touches stock.

Exactly two journal entries are posted per completed sale: one revenue entry via `postLedgerEntry` (category `"Pharmacy Sales"`, no `method` passed — the bridge ignores it) and one COGS relief via `postLedgerEntryLines`, each guarded by `if (consumedByProduct.size > 0)` / non-null returns. Both posts are best-effort: a null return leaves the corresponding JE id null and never fails the already-committed sale. The two JE ids are stored so a void reverses exactly those entries.

The `'use server'` boundary is clean — the action file's only exports are three `await withAuth(...)` async consts; every constant, type, and pure helper lives in the non-server `lib/constants/pharmacy-pos.ts`. This is the direct fix for the prior "A 'use server' file can only export async functions" crash.

Supporting edits are additive and backward compatible: two new History enum values, a seeded `revenueByCategory: { "Pharmacy Sales": "4300" }` default, a nav child with no icon key, and a `#pos-receipt`-scoped `@media print` block. No existing model field or the prescription-dispense flow is altered.

<details>
<summary>Issues (0 blocking)</summary>

No blocking findings. Two non-blocking observations are recorded in the details below (bundled unrelated accounting changes in the shared diff, and a duplicate global print block that is correctly scoped and non-conflicting). Neither affects the Pharmacy POS feature's correctness.

</details>

<details>
<summary>Details</summary>

### Atomic FEFO staging holds

`_createPharmacySale` aggregates requested quantity per product, then loops staging each depletion: `depleteFefo(currentBatches, qty, now)` into a `pending[]` array, recording `consumed` and the first-seen COGS/inventory account links. Persistence (`product.batches = ...; product.quantity = sumBatchQuantity(next); save()`) runs in a separate loop *after* the staging loop completes. `depleteFefo` computes non-expired availability up front and throws `InsufficientStockError` before touching any batch, and the insufficient branch rethrows a friendly `Not enough stock for <name>. Available: <n>` message. Nothing persists on that path, so the atomic-abort invariant is satisfied (confirmed by reading both the action and `lib/inventory/batches.ts`).

### Exactly two journal entries, no double-post

Revenue is posted once at step 8 via `postLedgerEntry(user, { type: "income", category: "Pharmacy Sales", amount: total, source: "payment", sourceId, patientId, description })`. `method` is deliberately not passed — verified against `TxnInput` in `bridge.actions.ts` where `method?` is accepted by the type but never read, and the income branch always debits the cash default. COGS relief is posted once at step 9 via `postLedgerEntryLines`, gated on `consumedByProduct.size > 0` and on both account ids resolving. Each product's `purchasePrice` is folded into its own consumed rows before a single `buildCogsReliefJournalLines({ ..., fallbackPrice: 0 })` call, matching the dispense flow's per-row cost handling. There is no visit/invoice path in a POS sale, so no second revenue entry can occur (confirmed).

### Cash guard precedes any depletion

The payment-method normalization and the `amountTendered < total` check for cash run at step 2b, immediately after pricing and before the FEFO staging loop. They operate on in-memory values only, so an underpaid cash sale throws with zero stock and zero ledger change. Non-cash methods set `amountTendered = total`, `change = 0` (confirmed).

### Best-effort accounting never blocks the sale

Both `postLedgerEntry` and `postLedgerEntryLines` return `null` on any internal failure, and the action only assigns `sale.journalEntryId`/`sale.cogsJournalEntryId` when the return is non-null. The posts are not wrapped in extra try/catch beyond the top-level handler, matching the dispense flow — a null post leaves the sale completed with a null JE id. Stock and the sale row are persisted before either post runs, so a failed post cannot corrupt stock (confirmed).

### 'use server' boundary — the prior crash is fixed

The action module's only exports are `createPharmacySale`, `listPharmacySales`, `voidPharmacySale`, each `export const X = await withAuth(_fn, "pharmacyManagement")`, which resolve to async functions. Local input shapes are declared as non-exported `interface`s. All constants, the `PosPaymentMethod`/`PosCartLine` types, and the pure helpers (`formatSaleNumber`, `computeChange`, `requiresAuthNote`, `aggregateQtyByProduct`) live in `lib/constants/pharmacy-pos.ts`, which carries no `"use server"` directive. A grep for `^export (const|type|interface|function|class|default)` in the action file returns only the three `withAuth` consts (confirmed). The plan records `next build` compiling `/dashboard/pharmacy/pos` with no "use server value" error.

### Void path reverses both JEs and restores stock symmetrically

`_voidPharmacySale` is idempotent (returns early if already voided), reverses both stored JE ids via `reverseLedgerEntry` (safe no-op on missing/already-reversed ids), and restores stock per `batchBreakdown` row via `restoreStock(..., { batchNumber, costPerUnit })`, falling back to a plain `restoreStock(next, item.quantity)` when a row has no breakdown. It re-asserts `product.quantity = sumBatchQuantity(next)` on save and writes a `PHARMACY_SALE_VOIDED` audit row in its own try/catch (confirmed).

### Audit writes isolated; History enum extended

Both the create and void audit `History.create` calls are wrapped in their own try/catch that only `console.error`s on failure, so an audit write can never turn a committed sale into a caller-visible error. The required `details`/`performedBy`/`entityId`/`entityType`/`message` fields are supplied, and `PHARMACY_SALE_CREATED`/`PHARMACY_SALE_VOIDED` are present in the `actionTypes` enum, so the writes pass Mongoose enum validation (confirmed).

### Model, types, defaults, nav, and print CSS

The `PharmacySale` schema matches the design — embedded `_id:false` item and batch-line sub-schemas, the five-value payment enum, `completed`/`voided` status, the two JE-id refs, standard audit flags, `timestamps: true`, and the `{ createdAt: -1 }` / `{ patientId: 1, createdAt: -1 }` indexes with `saleNumber` unique. `IPharmacySale` (plus item and batch-line interfaces) mirrors every field in `types.d.ts`. `DEFAULT_ACCOUNT_MAP.revenueByCategory` is seeded `{ "Pharmacy Sales": "4300" }`, routing fresh-clinic POS revenue to Pharmacy Revenue. The nav gains a `Point of Sale` child under the Pharmacy group with `roleField: "pharmacyManagement"` and no icon key, matching its siblings. `app/globals.css` carries an `@media print` block scoped to `#pos-receipt` that hides everything else (confirmed).

### UI wiring

`page.tsx` resolves products, clinic name, and cashier name on the server (cashier from `currentUser().fullName`, per the design's Finding 6) and passes them into the client component. `PharmacyPOS.tsx` enforces the same guards the action re-validates — stock clamp, cash-underpaid, required auth note — and calls `createPharmacySale`, surfacing server errors via `toast.error(err.message)`. `Receipt.tsx` reads the cashier from its `cashierName` prop only (never from a populated `soldBy`), consistent with the non-populated create result (confirmed).

### Non-blocking observations

The working tree bundles a large amount of unrelated accounting work (new `account/` routes, `lib/accounting/`, `lib/actions/accounting/`, deleted legacy `account`/`transaction` models and actions, and many History enum additions beyond the two pharmacy values). These are outside the Pharmacy POS scope and out of scope for this review, but reviewers landing this diff should be aware the commit is not isolated to the POS feature.

`app/globals.css` also contains a pre-existing `#receipt-print-area` / `printing-receipt` print block in addition to the new `#pos-receipt` block. The two are scoped to different ids and do not conflict; the pharmacy receipt correctly uses its own `#pos-receipt` scope.

</details>

<details>
<summary>File map</summary>

Created:
- `lib/models/pharmacy-sale.models.ts` — `PharmacySale` Mongoose model.
- `lib/actions/pharmacy-sale.actions.ts` — `'use server'`; create/list/void actions.
- `lib/constants/pharmacy-pos.ts` — non-server constants, types, pure helpers.
- `app/(dashboard)/(routes)/dashboard/pharmacy/pos/page.tsx` — server page.
- `app/(dashboard)/(routes)/dashboard/pharmacy/pos/_components/PharmacyPOS.tsx` — client POS.
- `app/(dashboard)/(routes)/dashboard/pharmacy/pos/_components/Receipt.tsx` — printable receipt.

Modified (pharmacy-pos scope):
- `lib/types.d.ts` — `IPharmacySale` + item/batch-line interfaces.
- `lib/models/history.models.ts` — `PHARMACY_SALE_CREATED`/`PHARMACY_SALE_VOIDED`.
- `lib/actions/accounting/accounting-settings.actions.ts` — seeded `revenueByCategory`.
- `components/dashboad-layout/nav-main.tsx` — `Point of Sale` nav child.
- `app/globals.css` — `#pos-receipt` `@media print` block.

Full diff: `git diff` in the repo root (note: contains unrelated accounting changes alongside the POS files).

</details>
