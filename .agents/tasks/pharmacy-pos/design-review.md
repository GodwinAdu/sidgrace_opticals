# Design Review — Professional Walk-in Pharmacy POS

Reviewed fresh against the real source in the main working tree
(`c:\Users\Jr\Desktop\sidgrace_opticals`) and the worktree
(`c:\Users\Jr\Desktop\sidgrace_opticals\.worktrees\pharmacy-pos`). Every
"the existing helper does X" claim in the design was checked by reading the
cited file, not taken on the design's word.

## Verdict

**CHANGES_REQUESTED** — 1 HIGH, 1 MEDIUM, plus NITs.

The design is unusually thorough and its accounting/stock mechanics are
faithful to `_dispenseVisitProducts`. The blocking item is an environment/
sequencing gate the design itself documents and cannot clear; one medium item
is a real type-safety gap in the COGS id persistence.

---

## Findings

### HIGH-1 — Implementation cannot build: the worktree lacks every reference file the action imports
**Where:** "Blocking prerequisite" section; the whole `lib/actions/pharmacy-sale.actions.ts` import block.

The design is written against canonical files that exist **only in the main
working tree and are uncommitted**. I re-ran the check inside
`.worktrees/pharmacy-pos` (branch `feature/pharmacy-pos`, tip `f470c67`):

```
lib/inventory/batches.ts                         = False
lib/inventory/postings.ts                        = False
lib/inventory/account-resolution.ts              = False
lib/actions/accounting/bridge.actions.ts         = False
lib/actions/accounting/accounting-settings.actions.ts = False
lib/actions/inventory-product.actions.ts         = True  (but pre-batch version)
lib/actions/visit-clinical.actions.ts            = True  (but pre-FEFO version)
```

Every one of the five core files the action imports is absent on the
implementation branch. `npx tsc --noEmit` / `npx next build` cannot pass because
every import in the new action module resolves to a nonexistent file, and the
`_dispenseVisitProducts` the design copies from is the pre-batch version here.
This is a real, live blocker, not a design defect.

**Concrete fix (pick one, perform before any implementation):**
1. **Commit-then-merge (preferred):** in the main tree, commit the
   inventory-accounting + batch-engine + pharmacy-inventory work to its source
   branch, then `git -C .worktrees/pharmacy-pos merge <that-branch>`.
2. **Repoint the worktree** at the branch/commit that already carries those
   files.

**Gate (must all return `True` in the worktree before coding):**
`Test-Path lib/inventory/batches.ts`, `lib/inventory/postings.ts`,
`lib/actions/accounting/bridge.actions.ts`,
`lib/actions/accounting/accounting-settings.actions.ts`, **and**
`inventory-product.actions.ts` exports `fetchDrugProducts`, **and**
`visit-clinical.actions.ts` contains the FEFO `_dispenseVisitProducts`
(grep `depleteFefo`).

This remains blocking regardless of how correct the design text is. A design
that references source that doesn't exist on the target branch is not ready for
the coder.

### MEDIUM-1 — COGS journal-entry id assignment is `unknown`-typed and will not type-check cleanly
**Where:** Step 9, "set `sale.cogsJournalEntryId = cogsEntry._id` when non-null".

Verified in `bridge.actions.ts`: `postLedgerEntryLines` is typed
`Promise<Record<string, unknown> | null>`. So `cogsEntry._id` is typed
`unknown`. Assigning an `unknown` to the typed Mongoose field
`cogsJournalEntryId?: Types.ObjectId | null` is not a safe assignment under
`strict` TS and risks a build error (the Definition of Done requires
`tsc --noEmit` to pass). By contrast `postLedgerEntry` (step 8) returns a value
whose `_id` is reachable through `JSON.parse(JSON.stringify(...))` but is still
loosely typed — and critically, `_dispenseVisitProducts` **never stores the COGS
JE id**, so there is no existing precedent proving this assignment compiles.

**Concrete fix:** narrow/cast at the assignment and guard on presence, e.g.

```ts
const cogsEntry = await postLedgerEntryLines(user, { lines: built.lines, /* ... */ });
if (cogsEntry && (cogsEntry as { _id?: unknown })._id) {
    sale.cogsJournalEntryId = String((cogsEntry as { _id: unknown })._id) as unknown as Types.ObjectId;
}
```

Apply the same explicit `String(...)` coercion to the revenue id in step 8
(`revEntry._id`) for symmetry, since that return is also a plain JSON object, not
a typed document. State the cast pattern in the design so the coder doesn't
guess.

### NIT-1 — `currentUser()` return shape is described inaccurately
**Where:** Finding 6 and the "Cashier name (receipt)" integration row:
"returns `{ id, role, fullName?, email?, profileImage?, isAuthenticated }`".

Verified in `lib/helpers/user.actions.ts`: `currentUser()` returns
`getAuthenticatedUser()`'s value, which is the full serialized Staff object from
`fetchStaffById(id)` (it carries `_id`, `fullName`, etc. plus an index
signature). The trimmed `{ id, role, fullName, profileImage, isAuthenticated }`
shape is `getSession()`'s return, not `currentUser()`'s. The operative claim —
that `user?.fullName` is readable — holds, and `user._id` is also readable (the
action relies on it), so this does not change behavior.

**Concrete fix:** reword to "returns the authenticated Staff object (carries
`_id`, `fullName?`, `role`, …); read `user?.fullName || "Cashier"`." Drop the
`isAuthenticated`/`id`-only shape, which belongs to `getSession()`.

### NIT-2 — Revenue id persistence relies on the `journalEntryId` alias without noting the `_id` is a string
**Where:** Step 8, "`revEntry.journalEntryId` alias equals `_id`".

Verified: `postLedgerEntry` returns `JSON.parse(JSON.stringify(entry))` then sets
`plain.journalEntryId = plain._id`, so both are **string** values, not
`ObjectId`s. The design is correct that the alias exists, but should state the
value is a string being cast back to an ObjectId ref on `sale.save()` (Mongoose
casts it), so the coder doesn't expect an `ObjectId` instance. Pair this with the
MEDIUM-1 cast guidance.

**Concrete fix:** add a one-line note: "`revEntry._id`/`revEntry.journalEntryId`
are strings; assign directly — Mongoose casts to ObjectId on save."

### NIT-3 — `listPharmacySales` populate of `patientId` assumes a `patientId` display field on Patient
**Where:** `listPharmacySales` — `.populate("patientId", "fullName patientId")`.

The design selects `"fullName patientId"` on the populated Patient. This was not
verified against the Patient model in this review (the populate is cosmetic for a
read list and `[]`-on-error swallows failures, so it cannot corrupt a sale). Still,
selecting a non-existent field silently returns `undefined`, which is a latent
display bug.

**Concrete fix:** confirm the Patient model field used for the human identifier
(e.g. `fullName` and/or a `patientId`/MRN field) before implementation, and
select exactly those names; otherwise the chip/receipt patient label renders
blank.

---

## Verified Assumptions (checked against real source)

1. **`lib/inventory/batches.ts`** exports `depleteFefo`, `sumBatchQuantity`,
   `coerceLegacyToOpeningBatch`, `restoreStock`, `availableForFefo`,
   `InsufficientStockError`, `isInsufficientStockError`, and types `Batch` /
   `ConsumedBatch`. `depleteFefo` throws `InsufficientStockError` **before
   mutating** (computes available, throws, only then builds result) and returns
   `{ batches, consumed }`. This underwrites the atomic-staging invariant (R3)
   exactly as the design claims.
2. **`lib/inventory/postings.ts`** exports `buildCogsReliefJournalLines`
   (returns `{ lines, amount } | null`, null when amount ≤ 0), `ConsumedBatchCost`,
   and `computeCogsAmount`, which applies the per-row
   `costPerUnit == null ? fallbackPrice : costPerUnit` rule. The design's
   "fold each product's purchasePrice into its rows, pass engine `fallbackPrice: 0`"
   approach is therefore correct for multi-product cost.
3. **`lib/inventory/account-resolution.ts`** exports
   `pickAccountCode(productLinkCode, defaultCode)` with precedence product-link →
   default → null. Matches the design's resolution precedence.
4. **`lib/actions/accounting/bridge.actions.ts`** exports `postLedgerEntry`,
   `postLedgerEntryLines`, `reverseLedgerEntry` — all async, all best-effort
   (catch internally, return `null`/`{success}`). `pickCategoryCode(byCategory,
   category, fallback)` routes `category: "Pharmacy Sales"` through
   `revenueByCategory["Pharmacy Sales"]` (case-insensitive) → global `revenue`
   default. **`method` is accepted on `TxnInput` but never read**; the income
   branch always debits `map.cash` (code `1000`). The design's NIT-1 resolution
   (drop `method` from the revenue post) is correct.
5. **`postLedgerEntry` / `postLedgerEntryLines` return shape:** both return
   `JSON.parse(JSON.stringify(entry))` with `journalEntryId = _id` (strings).
6. **`lib/actions/accounting/accounting-settings.actions.ts`** exports
   `getSettingsInternal()` (returns the Mongoose doc, so `settings?.defaultAccounts`
   works) and the internal `DEFAULT_ACCOUNT_MAP` with `revenue: "4000"`
   (Consultation Revenue), `expense: "6900"`, `inventory: "1200"`,
   `revenueByCategory: {}`. `updateSettings` deep-merges `revenueByCategory`. The
   design's modify-step-10 seed of `{ "Pharmacy Sales": "4300" }` is consistent
   with this structure and merge behavior.
7. **`lib/accounting/coa.ts`** seeds `4300 "Pharmacy Revenue"` (operating-revenue)
   — the dedicated account the design routes POS revenue to.
8. **`_dispenseVisitProducts` (`visit-clinical.actions.ts`, main tree)** contains
   the exact helpers the design copies: `toIso`, `toDateOrNull`, `toPureBatch`,
   `toSchemaBatch`, `readProductBatches`, `resolveCodeToAccountId`,
   `resolveLinkIdToCode`, and the FEFO stage→persist→COGS flow with
   first-seen link codes, per-product fallback folding, and
   `postLedgerEntryLines(..., source: "bridge")`. The POS algorithm mirrors it;
   the one correct divergence is that POS posts revenue itself (dispense relies on
   `recordVisitPayment`).
9. **`InventoryProduct` model** has `isDrug`, `prescriptionRequired`,
   `controlledSubstance`, `inventoryAccountId`, `revenueAccountId`,
   `cogsAccountId`, `salePrice`, `purchasePrice`, `barcode`, `genericName`,
   `batches`, `del_flag`, `quantity`. All fields the action and UI reference exist.
10. **`fetchDrugProducts`** exists (`inventory-product.actions.ts`), filters
    `isDrug: true, del_flag != true`, returns the full serialized products, and is
    `withAuth`-gated (authentication only, no permission flag).
11. **`History` model** validates `actionType` against a fixed enum
    (`required: true`), and `details` + `performedBy` are `required: true`. The
    Pharmacy block has only `PRESCRIPTION_*` values — so `PHARMACY_SALE_CREATED` /
    `PHARMACY_SALE_VOIDED` are absent and a write would throw without the additive
    enum change. The design's Finding-1 (add enum values + supply `details` +
    wrap in try/catch) is correct and necessary. `entityId`/`entityType` are
    `required: false`.
12. **`lib/helpers/user.actions.ts`** exports `currentUser` (cached, throws if
    unauthenticated) and `getCurrentUser` (cached, returns null). Both back onto
    `getAuthenticatedUser(): Promise<User | null>`; `User` has an index signature
    allowing both `user._id` (action) and `user.fullName` (receipt).
13. **`getClinicSettings()`** (`clinic-settings.actions.ts`) exists and returns a
    JSON object with `clinicName`. Single source for the receipt name.
14. **`nav-main.tsx` Pharmacy group** has exactly two iconless children
    (Prescription Queue, Drug Inventory); the group carries `icon: Pill`. Adding a
    third iconless child `{ title, url, roleField: "pharmacyManagement" }` matches
    the sibling shape and needs no import change.
15. **`pharmacyManagement`** is a valid permission flag (`role.models.ts`,
    `IRole` in `types.d.ts`) and `RequiredPermission = keyof IRole | ...`, so
    `withAuth(_fn, "pharmacyManagement")` type-checks. `dispensePrescription`
    already uses it identically, validating the "any pharmacyManagement holder may
    void" scope decision (Finding 7).
16. **`nextSequence`** (`counter.models.ts`) and **`fetchPatientBySearch`**
    (`patient.actions.ts`) exist and are exported as described.
17. **'use server' export constraint:** moving all constants/types to the non-
    `'use server'` module `lib/constants/pharmacy-pos.ts` and exporting only async
    functions from `pharmacy-sale.actions.ts` is the correct fix for the prior
    "A 'use server' file can only export async functions" crash (message #10).
18. **No existing `pharmacy/pos` route** — `Test-Path` on the route dir is False,
    so there is no collision with the new page.

## Unverified / Wrong Assumptions

1. **`currentUser()` return shape (WRONG, cosmetic)** — the design describes it
   as `{ id, role, fullName?, email?, profileImage?, isAuthenticated }`, but that
   is `getSession()`'s trimmed shape; `currentUser()` returns the full Staff
   object. Behavior-safe; corrected in NIT-1.
2. **`postLedgerEntryLines` return typing vs. id assignment (GAP)** — the design
   assumes `cogsEntry._id` can be assigned to a typed ObjectId field, but the
   return is `Record<string, unknown>`, so `_id` is `unknown`. See MEDIUM-1.
3. **Patient display fields in `listPharmacySales` populate (UNVERIFIED)** — the
   `.populate("patientId", "fullName patientId")` field selection was not checked
   against the Patient model. See NIT-3.
4. **Integration/unit test harness presence (UNVERIFIED in worktree)** — the
   design cites `vitest.integration.config.mts`, `batches.test.ts`,
   `account-resolution.test.ts`. These live with the uncommitted inventory work;
   their presence on the implementation branch depends on resolving HIGH-1 and was
   not separately confirmed in the worktree.

---

## Summary

Counts: HIGH = 1, MEDIUM = 1 → **CHANGES_REQUESTED**.

The design's core invariants — two-JE revenue+COGS with no double post, atomic
FEFO staging, product→settings→code account resolution, optional/never-required
patient, Rx/controlled auth-note gate, and the 'use server' export rule — are all
correct against the canonical source. What blocks approval is (HIGH-1) the target
branch not actually containing the code the design imports, and (MEDIUM-1) a real
type-safety gap in persisting the COGS journal-entry id. Resolve both, apply the
NITs, and this is ready to implement.
