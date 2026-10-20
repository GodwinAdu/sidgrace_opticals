# Implementation Plan — Product Accounting and Batches

## Overview

Sequenced so the correctness-critical, dependency-free engines are built and property-tested FIRST
(batch math and account resolution), then the schema diffs, then the bridge helper, and only then the
action-layer wiring that depends on all of them. This front-loads the safety net: Properties 1–8 are
locked against pure functions before any DB/action code can call them, and Properties 9–10 are pinned
against the pure JE line-builders before the DB writes. Revenue stays in the existing payment path; the
only new accounting at dispense is the COGS-relief entry — the final sweep asserts revenue is NOT
double-posted.

Language: TypeScript (matches the existing repo and the design's code samples). Property tests use
vitest + `fast-check` at a minimum of 100 iterations each, one property → one test, tagged
`// Feature: product-accounting-and-batches, Property N: <text>`.

## Tasks

- [x] 1. Build the pure batch engine `lib/inventory/batches.ts`
  - [x] 1.1 Implement the batch engine functions and `Batch` interface
    - Create `lib/inventory/batches.ts` with the `Batch` interface and dependency-free functions:
      `sumBatchQuantity`, `coerceLegacyToOpeningBatch`, `availableForFefo`, `depleteFefo`,
      `restoreStock`, and `classifyExpiry` (default threshold 90 days), per the design's Batch engine
      section. No DB imports; all time-dependent logic takes an explicit `now: Date`.
    - FEFO precedence: skip expired batches (R8.5), consume earliest `expiryDate` first, sort no-expiry
      batches after dated batches. `depleteFefo` returns updated batches plus per-batch `consumed`
      rows (with `costPerUnit`) and throws a tagged `InsufficientStockError` when non-expired available
      is less than the request.
    - _Requirements: R5.1, R5.4, R5.5, R6.1, R6.3, R6.4, R7.1, R7.2, R8.1, R8.2, R8.3, R8.4, R8.5_

  - [ ]* 1.2 Property test — quantity equals sum of batches
    - **Property 1: Quantity equals sum of batches**
    - **Validates: Requirements 6.1**

  - [ ]* 1.3 Property test — FEFO depletion is quantity-conserving and ordered
    - **Property 2: FEFO depletion is quantity-conserving and ordered**
    - **Validates: Requirements 6.3**

  - [ ]* 1.4 Property test — over-request is rejected and leaves batches unchanged
    - **Property 3: Over-request is rejected**
    - **Validates: Requirements 6.4**

  - [ ]* 1.5 Property test — expired batches are never depleted
    - **Property 4: Expired batches are never depleted**
    - **Validates: Requirements 8.4, 8.5**

  - [ ]* 1.6 Property test — deplete-then-restore round-trips total quantity
    - **Property 5: Deplete-then-restore round-trips total quantity**
    - **Validates: Requirements 6.3**

  - [ ]* 1.7 Property test — legacy coercion preserves total quantity
    - **Property 6: Legacy coercion preserves total quantity**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 1.8 Property test — expiry classification partitions by threshold
    - **Property 7: Expiry classification partitions by threshold**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 2. Build the pure account-resolution engine `lib/inventory/account-resolution.ts`
  - [x] 2.1 Implement `pickAccountCode` and `ResolvedSide` type
    - Create `lib/inventory/account-resolution.ts` with the pure `pickAccountCode(productLinkCode,
      defaultCode)` returning the product link when set, else the default, else null (R2's
      product→default→skip order). No DB imports.
    - _Requirements: R2.1, R2.2, R2.3, R2.4_

  - [ ]* 2.2 Property test — account resolution follows product-then-default order
    - **Property 8: Account resolution follows product-then-default order**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 3. Apply schema and type diffs
  - [x] 3.1 Extend the `InventoryProduct` schema
    - In `lib/models/inventory-product.models.ts` add optional `inventoryAccountId`, `revenueAccountId`,
      `cogsAccountId` (ref `ChartAccount`, default null); the embedded `batches` subdocument array
      (`batchNumber`, `expiryDate`, `quantity` min 0, optional `manufactureDate`, `costPerUnit`,
      `supplierId`, `receivedAt`); and pharmacy fields `genericName`, `manufacturer`, `barcode`,
      `storageConditions` (default ""), `controlledSubstance` (default false). Keep `quantity` as the
      derived sum. All additions optional with safe defaults so existing docs stay valid.
    - _Requirements: R1.1, R1.7, R5.1, R5.2, R7.3, R9.1, R9.2, R9.3_

  - [x] 3.2 Extend the `InventoryPurchase` schema
    - In `lib/models/inventory-purchase.models.ts` add optional `journalEntryId` (ref `JournalEntry`,
      default null); keep the existing `transactionId` for backward compat.
    - _Requirements: R3.4, R7.4_

  - [x] 3.3 Extend `IInventoryProduct` / purchase types in `lib/types.d.ts`
    - Add the new product fields (account links, `batches`, pharmacy fields) and the purchase
      `journalEntryId` as optional so existing readers keep compiling.
    - _Requirements: R7.3, R9.1, R9.3_

- [x] 4. Add the `postLedgerEntryLines` bridge helper and its pure line-builder
  - [x] 4.1 Implement the pure JE line-builder(s)
    - Add pure builders (co-located with the inventory engines, e.g. `lib/inventory/postings.ts`) that
      compute the purchase JE lines (debit inventory, credit payable/cash) from a computed total, and
      the COGS-relief JE lines (debit COGS, credit inventory) from depleted-batch cost. These are
      DB-free so Properties 9–10 can be tested without a database. Purchase total =
      `Σ max(0, qty × (purchasePrice − discount))`; COGS amount = `Σ quantity × costPerUnit`
      (fallback product `purchasePrice`).
    - _Requirements: R3.1, R3.2, R3.7, R4.2, R4.3, R4.5_

  - [x] 4.2 Implement `postLedgerEntryLines` in `bridge.actions.ts`
    - Add `postLedgerEntryLines(user, input)` to `lib/actions/accounting/bridge.actions.ts` reusing the
      existing JE internals (`generateBridgeEntryNo`, `isBalanced` guard, `status: "posted"`, basis
      from settings, `History` write). Best-effort / non-throwing: returns the plain JE with a
      `journalEntryId` alias (= `_id`) on success, `null` on any skip (missing account, unbalanced,
      non-positive total). Reversal reuses the existing `reverseLedgerEntry` unchanged.
    - _Requirements: R2.4, R3.1, R3.6, R4.4, R10.3_

  - [ ]* 4.3 Property test — purchase posting is balanced and total-preserving
    - **Property 9: Purchase posting is balanced and total-preserving** (tested against the pure
      line-builder).
    - **Validates: Requirements 3.1, 3.7**

  - [ ]* 4.4 Property test — COGS relief is balanced and cost-preserving
    - **Property 10: COGS relief is balanced and cost-preserving** (tested against the pure
      line-builder).
    - **Validates: Requirements 4.2, 4.3, 4.5**

- [x] 5. Product actions: account-link validation + batch CRUD
  - [x] 5.1 Add account-link validation to `createProduct` / `updateProduct`
    - In `lib/actions/inventory-product.actions.ts` accept optional `inventoryAccountId`,
      `revenueAccountId`, `cogsAccountId` and the new pharmacy fields. Validate each supplied link
      resolves to an active, non-deleted `ChartAccount` of the correct `type` (asset / revenue /
      expense), throwing a field-identifying validation error otherwise; blank links persist as null.
      Keep `withAuth` gating on `inventoryManagement`.
    - _Requirements: R1.1, R1.2, R1.3, R1.4, R1.5, R1.6, R1.7, R9.1, R9.2, R10.1_

  - [x] 5.2 Add batch read/mutation helpers keeping the quantity=sum invariant
    - Add `listProductBatches(productId)` and `addOrUpdateBatch` (and any batch-mutating helpers),
      each recomputing `product.quantity = sumBatchQuantity(batches)` on every change (R6.1), rejecting
      negative quantity (R5.4) and `expiryDate < manufactureDate` (R5.5). Lazily coerce a legacy scalar
      quantity to an opening batch when a batch-aware op first runs. `withAuth` on `inventoryManagement`.
    - _Requirements: R5.3, R5.4, R5.5, R6.1, R7.1, R7.2, R10.1_

  - [ ]* 5.3 Unit/example tests for link validation and batch CRUD
    - Accept a correct-type account; reject each wrong type and a deleted/missing account with the
      correct field named; batch mutation keeps `quantity` equal to the batch sum.
    - _Requirements: R1.3, R1.4, R1.5, R1.6, R6.1_

- [x] 6. Rewrite purchase posting in `inventory-purchase.actions.ts`
  - [x] 6.1 Post an inventory-asset debit on purchase and add received stock as a batch
    - Rewrite `_createPurchase`: resolve the inventory debit account (product link → default inventory)
      and the credit side (Accounts Payable when a supplier is recorded, else Cash); post the balanced
      JE via `postLedgerEntryLines` for the computed total; store the returned JE id on
      `journalEntryId`. Add received stock as a batch (R6.2), not just a scalar increment. Remove the
      hardcoded `"Dental Supplies"` expense posting. Skip-and-complete if accounts don't resolve.
    - _Requirements: R3.1, R3.2, R3.3, R3.4, R3.6, R3.7, R6.2_

  - [x] 6.2 Reverse the purchase JE on delete/reverse
    - Rewrite `_deletePurchase` to reverse the stored `journalEntryId` via `reverseLedgerEntry`,
      falling back to any legacy stored id so previously posted purchases stay reversible.
    - _Requirements: R3.5, R7.4_

  - [ ]* 6.3 Integration test — purchase posts and reverses a balanced inventory-debit JE
    - A purchase posts a balanced inventory-debit JE, stores `journalEntryId`, adds a batch, and
      delete reverses that JE; skip-and-complete when no account resolves (no JE written).
    - _Requirements: R3.1, R3.4, R3.5, R3.6_

- [x] 7. Dispense integration in `visit-clinical.actions.ts`
  - [x] 7.1 FEFO deplete/restore mirroring the scalar delta logic
    - Extend `_dispenseVisitProducts` to reconcile stock through the batch engine (`depleteFefo` /
      `restoreStock`) by the DELTA vs the previously-dispensed quantity on the visit, keeping
      `product.quantity = sumBatchQuantity`. Surface insufficient-stock and expired-stock errors
      without any stock/ledger change.
    - _Requirements: R6.3, R6.4, R8.4, R8.5_

  - [x] 7.2 Post the COGS-relief JE only (no second revenue JE)
    - Post a single balanced COGS-relief JE (debit COGS, credit Inventory) via `postLedgerEntryLines`
      for the depleted-batch cost. Do NOT post a revenue JE here — revenue stays with the existing
      `recordVisitPayment` payment path. Skip-and-complete if COGS/Inventory don't resolve.
    - _Requirements: R4.2, R4.3, R4.4, R4.5, R10.3_

  - [ ]* 7.3 Integration test — dispense posts one COGS JE and never double-posts revenue
    - A dispense depletes FEFO, posts exactly one COGS-relief JE, writes no revenue JE; a quantity
      decrease restores batch stock; expired batches are never consumed.
    - _Requirements: R4.2, R4.4, R6.3, R8.4_

- [x] 8. Expiry reporting action `lib/actions/inventory-expiry.actions.ts`
  - [x] 8.1 Implement expired and near-expiry listings
    - Create `inventory-expiry.actions.ts` with `listExpiredBatches()` and
      `listNearExpiryBatches(thresholdDays?)` (default 90) using `classifyExpiry`; lazily coerce legacy
      quantity for classification; return flattened batch rows with product context. `withAuth` on
      `inventoryManagement`.
    - _Requirements: R8.1, R8.2, R8.3, R10.1_

- [x] 9. ProductForm UI — account selects, pharmacy fields, batch entry
  - [x] 9.1 Add three account selects gated by accountingManagement
    - In `ProductForm.tsx` add Inventory / Revenue / COGS `Select`s populated from
      `listChartAccounts(activeOnly=true)` filtered client-side by `type`. The parent server component
      attempts the gated fetch and passes the list (or empty array); when empty the selects render
      disabled with a hint and the product still saves via default-account fallback. Extend the Zod
      schema with the account fields.
    - _Requirements: R1.1, R10.2_

  - [x] 9.2 Add pharmacy fields and preserve the isDrug conditional reveal
    - Add `genericName`, `manufacturer`, `barcode`, `storageConditions` inputs and a
      `controlledSubstance` checkbox; keep drug-specific fields inside the existing `{isDrug && (...)}`
      block (hidden when not a drug, revealed when a drug). Extend the Zod schema.
    - _Requirements: R9.1, R9.2, R9.3, R9.4, R9.5_

  - [x] 9.3 Add batch entry rows
    - Add a repeatable batch row group (lot number, expiry, quantity, optional manufacture date, cost)
      following the existing grid layout; extend the Zod schema with `batches`.
    - _Requirements: R5.1, R5.2_

- [x] 10. Final verification + regression sweep
  - Run `npx tsc --noEmit`, `npx vitest run`, the integration suite, and `npx next build`.
  - Confirm all property tests (Properties 1–10) run at ≥100 iterations and pass; confirm a dispense
    posts exactly one COGS-relief JE and NO second revenue JE (explicit double-post assertion); confirm
    legacy products (scalar quantity, no links, no batches) still read and display without error.
  - _Requirements: R2.4, R3.6, R4.4, R7.3, R7.4, R10.3_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.2", "3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "6.1", "7.1", "8.1", "9.1", "9.2", "9.3"] },
    { "id": 5, "tasks": ["6.2", "7.2"] },
    { "id": 6, "tasks": ["6.3", "7.3"] },
    { "id": 7, "tasks": ["10"] }
  ]
}
```

## Notes
- Tasks marked with `*` are optional (property/unit/integration tests) and can be skipped for a faster
  MVP, but they are the correctness safety net for the pure engines — skipping them forfeits the
  guarantees behind Properties 1–10.
- Pure engines (waves 0–1) carry no DB dependency and lock Properties 1–8 before any action wiring.
- Properties 9–10 are pinned against the pure line-builders in wave 2–3 before the DB writes exist.
- Revenue is recognized exactly once by the existing `recordVisitPayment` payment path; the dispense
  work adds only the COGS-relief entry (verified by the double-post assertion in task 10).
- Nothing is committed or pushed by task execution unless explicitly requested.
