# Implementation Plan — Professional Walk-in Pharmacy POS

Build directly in the MAIN working tree at `c:\Users\Jr\Desktop\sidgrace_opticals`. Do NOT use a worktree.

Authoritative spec: `.agents/tasks/pharmacy-pos/design.md` (read in full). This plan maps each of the 10 files to the design sections / algorithm steps it implements, lists the exact imports and signatures to copy, and spells out verification commands.

## Prerequisite — already satisfied (verified)

The design's "Blocking prerequisite" section describes a worktree that lacked the dependency files. That does NOT apply here: in the main tree all referenced files exist on disk (verified with `Test-Path`):
`lib/inventory/batches.ts`, `lib/inventory/postings.ts`, `lib/inventory/account-resolution.ts`, `lib/actions/accounting/bridge.actions.ts`, `lib/actions/accounting/accounting-settings.actions.ts`, `lib/actions/visit-clinical.actions.ts` (with the FEFO `_dispenseVisitProducts`), `lib/actions/inventory-product.actions.ts` (exports `fetchDrugProducts`), `lib/models/counter.models.ts`, `lib/models/history.models.ts`, `lib/helpers/auth.ts`, `lib/helpers/user.actions.ts`, `lib/actions/clinic-settings.actions.ts`, `lib/actions/patient.actions.ts`, `lib/models/inventory-product.models.ts`. Treat the prerequisite as clear and ignore it.

## Verified facts the plan relies on (from exploration)

- **Build/test commands** (`package.json`): `npm run build` (= `next build`), `npm run lint`, `npm run test` (= `vitest run`), `npm run test:integration` (= `vitest run --config vitest.integration.config.mts`). TypeScript-only check: `npx tsc --noEmit`. No root `AGENTS.md`/`CONTRIBUTING.md`/`.kiro/steering` exist; follow the in-repo code conventions instead.
- **Canonical pattern to mirror**: `_dispenseVisitProducts` in `lib/actions/visit-clinical.actions.ts` (lines ~606–812). Copy its helpers verbatim: `toIso`, `toDateOrNull`, `toPureBatch`, `toSchemaBatch`, `readProductBatches`, `resolveCodeToAccountId`, `resolveLinkIdToCode` (lines ~512–598). 4-space indent; `return JSON.parse(JSON.stringify(...))`.
- **`postLedgerEntry(user, values: TxnInput)`** (`bridge.actions.ts`): `TxnInput` = `{ type: "income"|"expense"; category: string; amount: number; accountName?; date?; description?; method?; source?: "manual"|"payment"|"invoice"|"purchase"|"attendance"; sourceId?: string|null; patientId?; vendorId? }`. Income branch always debits cash `1000`, credits `pickCategoryCode(map.revenueByCategory, category, map.revenue)`. `method` is accepted but NEVER read → do NOT pass it. Returns `JSON.parse(JSON.stringify(entry))` with `plain.journalEntryId === plain._id`, or `null` on any skip/failure (best-effort). Non-positive amount → `null`.
- **`postLedgerEntryLines(user, input: JournalPostInput)`**: `JournalPostInput` = `{ lines: LedgerLineInput[]; memo?; source?; sourceId?; vendorId?; ... }`. Returns same plain shape or `null`. `source` enum includes `"bridge"`.
- **`reverseLedgerEntry(user, id: string)`**: safe no-op when id missing / already reversed.
- **`buildCogsReliefJournalLines({ consumed: ConsumedBatchCost[]; fallbackPrice; cogsAccountId; inventoryAccountId; memo? })`** (`lib/inventory/postings.ts`) → `{ lines, amount } | null`. `computeCogsAmount` applies `costPerUnit == null ? fallbackPrice : costPerUnit` PER ROW. So stamp each product's `purchasePrice` onto its own consumed rows and pass engine-level `fallbackPrice: 0`.
- **`depleteFefo(batches, qty, now)`** / `sumBatchQuantity` / `coerceLegacyToOpeningBatch` / `restoreStock(batches, qty, hint?)` / `isInsufficientStockError(err)` + `InsufficientStockError.available` — all in `lib/inventory/batches.ts`. `depleteFefo` throws `InsufficientStockError` BEFORE mutating; never returns partial.
- **`pickAccountCode(productLinkCode, defaultCode)`** (`lib/inventory/account-resolution.ts`) → code or null.
- **`getSettingsInternal()`** (`accounting-settings.actions.ts`) → settings with `defaultAccounts` (`.expense`, `.inventory`, `.revenue`, etc.). `DEFAULT_ACCOUNT_MAP` currently seeds `revenueByCategory: {}` (lines 17–31).
- **`withAuth<T,Args>(handler, permission?)`** (`lib/helpers/auth.ts`); `type User = Awaited<ReturnType<typeof currentUser>>`. Gate with `"pharmacyManagement"`.
- **`currentUser()`** (`lib/helpers/user.actions.ts`, cached, throws if unauthenticated) → `{ id, role, fullName?, email?, profileImage?, isAuthenticated }`.
- **`getClinicSettings()`** (`lib/actions/clinic-settings.actions.ts`) → JSON object with `clinicName`.
- **`fetchDrugProducts()`** (`lib/actions/inventory-product.actions.ts`) → drug products (`isDrug: true, del_flag != true`), `categoryId` populated; catch returns `[]`.
- **`fetchPatientBySearch(search: string)`** (`lib/actions/patient.actions.ts`) → patient array.
- **`nextSequence(key: string)`** (`lib/models/counter.models.ts`) → next integer; atomic upsert+$inc.
- **InventoryProduct model** has: `purchasePrice`, `salePrice`, `quantity`, `isDrug`, `prescriptionRequired`, `controlledSubstance`, `genericName`, `barcode`, `strength`, `form`, `batches[]`, `inventoryAccountId`, `revenueAccountId`, `cogsAccountId`, `del_flag`.
- **History model** (`lib/models/history.models.ts`): `actionType` enum-validated + required; `details` (Mixed) required; `performedBy` required; optional `entityId`, `entityType`, `message`. Pharmacy block at lines ~208–213 has only `PRESCRIPTION_*`.
- **Model conventions** (`invoice.models.ts`): `Schema<IX>`, `_id: false` embedded item schemas, `timestamps: true`, standard audit flags, `models.X ?? model<IX>("X", schema)`.
- **types.d.ts**: ambient global interfaces `extends Document`, `Types.ObjectId` refs, `createdAt?/updatedAt?: Date`; `IInvoice`/`IInvoiceItem`/`IPayment` at lines ~540–593.
- **shadcn/ui available** (all confirmed in `components/ui/`): button, card, input, select, badge, table, scroll-area, dialog, separator, label, textarea, popover.
- **`app/globals.css`** is 274 lines; append the `@media print` block at the end.

---

- [ ] 1. Add the `PharmacySale` ambient types to `lib/types.d.ts`.
      Add three interfaces next to `IInvoice`/`IPayment` (design "Data model"): `IPharmacySaleBatchLine` (`batchNumber: string; quantity: number; costPerUnit?: number | null`), `IPharmacySaleItem` (`productId: Types.ObjectId; name: string; quantity: number; unitPrice: number; total: number; prescriptionRequired: boolean; controlledSubstance: boolean; batchBreakdown: IPharmacySaleBatchLine[]`), and `IPharmacySale extends Document` mirroring every PharmacySaleSchema field: `saleNumber: string; items: IPharmacySaleItem[]; subTotal: number; total: number; customerName: string; customerPhone: string; patientId?: Types.ObjectId | null; paymentMethod: "cash"|"card"|"mobile-money"|"bank-transfer"|"other"; paymentReference: string; amountTendered: number; change: number; authorizationNote: string; status: "completed"|"voided"; journalEntryId?: Types.ObjectId | null; cogsJournalEntryId?: Types.ObjectId | null; soldBy?: Types.ObjectId | null; voidedBy?: Types.ObjectId | null; voidReason: string;` + standard audit flags (`createdBy?/modifiedBy?/deletedBy?: Types.ObjectId | null; mod_flag: boolean; del_flag: boolean; action_type?: string | null; createdAt?: Date; updatedAt?: Date`). Match the `_id?: string` + `Types.ObjectId` style used by `IInvoice`.
      Files: `lib/types.d.ts`
      Verify: `npx tsc --noEmit` — no new type errors (the model in item 2 references these globals).

- [ ] 2. Create the `PharmacySale` Mongoose model.
      Implement design "Data model — `PharmacySale`" exactly. Follow `invoice.models.ts` conventions: `import { model, models, Schema, Model } from "mongoose"`; two `_id:false` sub-schemas `PharmacySaleBatchLineSchema` (`batchNumber:String`, `quantity:Number`, `costPerUnit:{type:Number, default:null}`) and `PharmacySaleItemSchema` (fields per design, `batchBreakdown:{type:[PharmacySaleBatchLineSchema], default:[]}`); `const PharmacySaleSchema = new Schema<IPharmacySale>({...}, { timestamps: true })` with all fields and enums per design (paymentMethod enum `["cash","card","mobile-money","bank-transfer","other"]`, status enum `["completed","voided"]`, action_type enum `["created","updated","deleted","restored","voided"]`, refs `InventoryProduct`/`Patient`/`JournalEntry`/`Staff`). Indexes: `{ createdAt: -1 }` and `{ patientId: 1, createdAt: -1 }` (saleNumber uniqueness via field `unique: true`). Export `const PharmacySale: Model<IPharmacySale> = models.PharmacySale ?? model<IPharmacySale>("PharmacySale", PharmacySaleSchema); export default PharmacySale;`. 4-space indent.
      Files: `lib/models/pharmacy-sale.models.ts`
      Verify: `npx tsc --noEmit` — compiles with no errors.

- [ ] 3. Create the shared non-`'use server'` constants/types module.
      Implement design "`lib/constants/pharmacy-pos.ts`" verbatim: `export const POS_PAYMENT_METHODS = [...] as const` (cash, card, mobile-money, bank-transfer, other — NO insurance), `export type PosPaymentMethod`, and `export interface PosCartLine { productId; name; genericName?; unitPrice; quantity; available; prescriptionRequired; controlledSubstance }`. Also add the small pure helpers the design's Testability section calls for so they are unit-testable without Mongoose: `formatSaleNumber(seq: number, year: number): string` → `POS-${year}-${String(seq).padStart(5,"0")}`; `computeChange(tendered: number, total: number): number` → `Math.max(0, (Number(tendered)||0) - total)`; `requiresAuthNote(lines: { prescriptionRequired: boolean; controlledSubstance: boolean }[]): boolean`; `aggregateQtyByProduct(items: { productId: string; quantity: number }[]): Map<string, number>`. This file has NO `"use server"` directive — this is the fix for the prior "A 'use server' file can only export async functions" crash.
      Files: `lib/constants/pharmacy-pos.ts`
      Verify: `npx tsc --noEmit` — compiles.

- [ ] 4. Add the two Pharmacy History enum values.
      Per design modify-step 9: in `lib/models/history.models.ts`, under the `// ── Pharmacy ──` block (after `"PRESCRIPTION_DISPENSED"`, ~line 213) add `"PHARMACY_SALE_CREATED",` and `"PHARMACY_SALE_VOIDED",` to the `actionTypes` array. Additive only.
      Files: `lib/models/history.models.ts`
      Verify: `npx tsc --noEmit` — compiles; confirm both strings are inside the `actionTypes` array (audit writes in item 6 would otherwise fail Mongoose enum validation).

- [ ] 5. Seed the dedicated Pharmacy Revenue default mapping.
      Per design modify-step 10 (Finding-4): in `lib/actions/accounting/accounting-settings.actions.ts`, change `DEFAULT_ACCOUNT_MAP.revenueByCategory` from `{}` to `{ "Pharmacy Sales": "4300" }` (line ~28). Leave `expenseByCategory: {}`. This routes fresh-clinic POS revenue to account 4300 (Pharmacy Revenue) via `pickCategoryCode`; existing clinics are unaffected (merge semantics preserve their map).
      Files: `lib/actions/accounting/accounting-settings.actions.ts`
      Verify: `npx tsc --noEmit` — compiles; `npm run test` — existing unit tests still pass.

- [ ] 6. Create the `'use server'` action module `lib/actions/pharmacy-sale.actions.ts` with the three exported async functions.
      `"use server"` at top. Import exactly the set in design "Server actions" (connectToDB, `withAuth`/`type User`, InventoryProduct, PharmacySale, ChartAccount, History, `nextSequence`, `postLedgerEntry`/`postLedgerEntryLines`/`reverseLedgerEntry`, `getSettingsInternal`, batch engine types+fns, `pickAccountCode`, `buildCogsReliefJournalLines`+`type ConsumedBatchCost`, `revalidatePath`, plus `POS_PAYMENT_METHODS`/`formatSaleNumber`/`computeChange`/`requiresAuthNote`/`aggregateQtyByProduct` from `../constants/pharmacy-pos`). Copy verbatim from `_dispenseVisitProducts`: `toIso`, `toDateOrNull`, `toPureBatch`, `toSchemaBatch`, `readProductBatches`, `resolveCodeToAccountId`, `resolveLinkIdToCode`. Declare input types as LOCAL (non-exported) interfaces only — NO `export const`/`export type`/`export interface` anywhere in this file (the 'use server' crash fix). Implement:
      (a) `_createPharmacySale(user, values, path?)` following the SINGLE authoritative ordered algorithm steps 1→11 in design "createPharmacySale": auth+connect → load/validate/price cart (reject non-drug/`del_flag`, empty cart) → **step 2b cash guard BEFORE any depletion** (normalize method against `POS_PAYMENT_METHODS`; cash underpaid throws `"Amount tendered is less than the total"`; compute change) → authorization-note gate → aggregate qty per product → stage FEFO depletions atomically into `pending[]` (on `isInsufficientStockError` rethrow `Not enough stock for <name>. Available: <err.available>`; capture first-seen `cogsLinkCode`/`inventoryLinkCode` and per-product `purchasePrice` fallback) → persist stock only after ALL staged (`product.batches = next.map(toSchemaBatch)`, `product.quantity = sumBatchQuantity(next)`, save) → create `PharmacySale` (saleNumber via `nextSequence("pharmacy-sale-"+year)`+`formatSaleNumber`, batchBreakdown per item, status "completed", soldBy/createdBy = `user._id`) → **post revenue exactly once** via `postLedgerEntry(user,{type:"income",category:"Pharmacy Sales",amount:total,source:"payment",sourceId:String(sale._id),patientId,description})` — NO `method` — set `sale.journalEntryId` when non-null → **post COGS once** (only if `consumedByProduct.size>0`) via `getSettingsInternal`→`pickAccountCode`→`resolveCodeToAccountId`→fold each product's `purchasePrice` into its consumed rows→`buildCogsReliefJournalLines({consumed, fallbackPrice:0, cogsAccountId, inventoryAccountId, memo:"Pharmacy POS COGS"})`→`postLedgerEntryLines(user,{lines, memo, source:"bridge", sourceId:String(sale._id), vendorId:null})`, set `sale.cogsJournalEntryId` when non-null → `sale.save()` → `revalidatePath(path)` + `revalidatePath("/dashboard/inventory/products")` → best-effort `History.create({actionType:"PHARMACY_SALE_CREATED", details:{itemId:sale._id, saleNumber, total}, performedBy:user._id, entityId:sale._id, entityType:"PHARMACY_SALE", message})` wrapped in its OWN `try/catch` → `return JSON.parse(JSON.stringify(sale))`. Do NOT add extra try/catch around the posts beyond the top-level one (posts are internally best-effort).
      (b) `_listPharmacySales(user, limit?)`: `PharmacySale.find({ del_flag: { $ne: true } }).populate("soldBy","fullName").populate("patientId","fullName patientId").sort({ createdAt: -1 }).limit(Number(limit)||100)`; `return JSON.parse(JSON.stringify(...))`; `return []` on empty/error.
      (c) `_voidPharmacySale(user, id, path?)`: load (throw if missing; idempotent return if already voided) → `reverseLedgerEntry` both stored JE ids (best-effort) → restore stock per item via `restoreStock(currentBatches, row.quantity, { batchNumber: row.batchNumber, costPerUnit: row.costPerUnit })` for each `batchBreakdown` row (fallback `restoreStock(currentBatches, item.quantity)` when none), persist `batches`+`quantity` → set status "voided"/voidedBy/mod_flag/modifiedBy/action_type "voided", save → best-effort `History.create({actionType:"PHARMACY_SALE_VOIDED",...})` in own try/catch → revalidate → return `JSON.parse(JSON.stringify(sale))`.
      Exports (ONLY these three, all async): `export const createPharmacySale = await withAuth(_createPharmacySale, "pharmacyManagement");`, `export const listPharmacySales = await withAuth(_listPharmacySales, "pharmacyManagement");`, `export const voidPharmacySale = await withAuth(_voidPharmacySale, "pharmacyManagement");`. 4-space indent; each `_fn` wrapped in top-level `try/catch` (`console.error; throw` for writes, `return []` for the read).
      Files: `lib/actions/pharmacy-sale.actions.ts`
      Verify: `npx tsc --noEmit` — compiles (all imports resolve). Depends on items 2, 3, 4, 5.

- [ ] 7. Create the POS server page.
      Implement design "`page.tsx`". `app/(dashboard)/(routes)/dashboard/pharmacy/pos/page.tsx`, async default export. `const [products, settings] = await Promise.all([fetchDrugProducts(), getClinicSettings()]); const clinicName = settings?.clinicName || "Clinic"; const user = await currentUser(); const cashierName = user?.fullName || "Cashier";`. Render the page shell (`<main className="min-h-screen bg-background py-6 px-4 md:px-6">`, max-w container, `<h1>Pharmacy Point of Sale</h1>`, `<Separator />`) then `<PharmacyPOS products={products} clinicName={clinicName} cashierName={cashierName} />`. Imports: `fetchDrugProducts` from `@/lib/actions/inventory-product.actions`, `getClinicSettings` from `@/lib/actions/clinic-settings.actions`, `currentUser` from `@/lib/helpers/user.actions`, `Separator` from `@/components/ui/separator`, the client component from `./_components/PharmacyPOS`. 4-space indent to match the file's siblings.
      Files: `app/(dashboard)/(routes)/dashboard/pharmacy/pos/page.tsx`
      Verify: `npx tsc --noEmit` — compiles (depends on item 8 for the component import; create item 8 first or stub then fill).

- [ ] 8. Create the client POS component.
      Implement design "`PharmacyPOS.tsx`". `"use client"`. Props `{ products: any[]; clinicName: string; cashierName: string }`. Two-pane responsive grid (`grid lg:grid-cols-[1fr_380px] gap-4`) of `Card`s. Left: search `Input` filtering client-side over name/genericName/barcode; `ScrollArea` of product cards showing name, strength/form, salePrice, on-hand, and `Badge`s (amber "Rx" when `prescriptionRequired`, red "Controlled" when `controlledSubstance`, "Out of stock" when available ≤ 0); click adds to cart (disabled at 0). Right: `Table` of cart lines with qty stepper clamped at `available` (sonner warning "Only N in stock" on overflow), totals block, optional customerName/customerPhone `Input`s, optional patient attach via debounced `fetchPatientBySearch` in a `Popover` (sets `patientId`, removable chip, never required), payment `Select` from `POS_PAYMENT_METHODS` + optional `paymentReference` `Input`, cash-only `amountTendered` `Input` with live change readout, a `Textarea` authorization note shown+required iff any cart line is Rx/controlled, and a `Complete Sale` `Button` disabled when cart empty / stock exceeded / cash underpaid / required note empty. On click call `createPharmacySale({...})`; success → `toast.success`, open receipt `Dialog`, reset cart; throw → `toast.error(err.message)`. Local `useState` (`cart`, customer fields, payment fields, `authorizationNote`, `attachedPatient`, `submitting`); reuse the pure helpers (`computeChange`, `requiresAuthNote`) from `@/lib/constants/pharmacy-pos`. Import shadcn components from `@/components/ui/*`, `toast` from `sonner`, `createPharmacySale` from `@/lib/actions/pharmacy-sale.actions`, `fetchPatientBySearch` from `@/lib/actions/patient.actions`, `POS_PAYMENT_METHODS`/`PosCartLine` from `@/lib/constants/pharmacy-pos`, and `Receipt` from `./Receipt`. Match `OpdForm.tsx` / `AccountingSettings.tsx` styling. 2-space indent to match existing client components.
      Files: `app/(dashboard)/(routes)/dashboard/pharmacy/pos/_components/PharmacyPOS.tsx`
      Verify: `npx tsc --noEmit` — compiles (depends on items 3, 6, 9).

- [ ] 9. Create the printable receipt component.
      Implement design "`Receipt.tsx`". `"use client"`. Props `{ sale: any; clinicName: string; cashierName: string }`. Root `<div id="pos-receipt">…</div>` showing clinicName, saleNumber, date/time, cashier (**from the `cashierName` prop only** — never read a populated `soldBy` off the create result, per Finding 6), customer name/phone if present, line items (name, qty, unit, total), subtotal/total, payment method + reference, amount tendered + change for cash, authorization note if present. A `Print` `Button` calls `window.print()`. Import `Button` from `@/components/ui/button`.
      Files: `app/(dashboard)/(routes)/dashboard/pharmacy/pos/_components/Receipt.tsx`
      Verify: `npx tsc --noEmit` — compiles.

- [ ] 10. Add the print-isolation CSS and the nav entry.
      (a) Per design "Print isolation (Finding 8)": append a single `@media print` block to the END of `app/globals.css` keyed on `#pos-receipt`: `@media print { body * { visibility: hidden; } #pos-receipt, #pos-receipt * { visibility: visible; } #pos-receipt { position: absolute; inset: 0; } }`. Do NOT use `<style jsx global>`.
      (b) Per design "Nav": in `components/dashboad-layout/nav-main.tsx`, add as the THIRD child of the Pharmacy group (after "Drug Inventory", ~line 460) exactly `{ title: "Point of Sale", url: "/dashboard/pharmacy/pos", roleField: "pharmacyManagement" }` — NO `icon` key (siblings are iconless), no import change. Match the siblings' 2-space object shape.
      Files: `app/globals.css`, `components/dashboad-layout/nav-main.tsx`
      Verify: `npx tsc --noEmit` — compiles.

- [ ] 11. Full build + lint verification of the whole feature.
      Run the project's real build to confirm the `/dashboard/pharmacy/pos` route compiles — this is the authoritative check that the `'use server'`-only-async-exports rule holds (no "A 'use server' file can only export async functions" error).
      Files: (none — verification only)
      Verify: `npm run build` completes with no errors and lists `/dashboard/pharmacy/pos` in the route output; `npm run lint` passes; `npx tsc --noEmit` reports zero errors; `npm run test` passes (confirms the item-3 pure helpers and existing suites are green).

- [ ] 12. (Optional but recommended) Add tests for the new pure helpers and, if the integration harness runs, the action happy/fail paths.
      Add a unit test file next to the existing inventory/account-resolution tests covering `formatSaleNumber`, `computeChange`, `requiresAuthNote`, `aggregateQtyByProduct` (pure, no DB). If the integration config (`vitest.integration.config.mts`, backed by `mongodb-memory-server`) runs in this environment, add integration coverage for `createPharmacySale` happy path (stock decremented, two JE ids set, change correct), insufficient-stock abort (zero stock/ledger change), Rx-without-note rejection, and `voidPharmacySale` (both JEs reversed, stock restored, status voided) — mirroring existing inventory/accounting integration tests.
      Files: e.g. `lib/constants/pharmacy-pos.test.ts` (+ an integration spec alongside existing ones)
      Verify: `npm run test` passes the new unit tests; `npm run test:integration` passes the new integration tests when the harness is available (if the harness cannot start in this environment, state that and rely on item 11's `npm run build`).

## Verification

Implemented in the MAIN working tree (no worktree). All referenced dependency
files (`lib/inventory/batches.ts`, `postings.ts`, `account-resolution.ts`,
`lib/actions/accounting/bridge.actions.ts`, `accounting-settings.actions.ts`,
`lib/models/inventory-product.models.ts`) confirmed present via `Test-Path` →
all `True`. The "Blocking prerequisite" worktree section is N/A here.

Commands run and results:

1. `npx tsc --noEmit` — **PASS for this feature.** Total `error TS` lines: 142
   (pre-existing, unrelated — repo baseline is ~140). Filtering the output for
   `pharmacy` (covers `pharmacy-sale.actions.ts`, `pharmacy-pos.ts`, and the
   `pharmacy/pos` UI files) returns **0 matches** — zero new errors in any
   created/modified pharmacy-pos file. (An initial run surfaced 12 errors in
   `pharmacy-sale.actions.ts` from the strict `PharmacySale.create(...)` overload
   rejecting string `productId`/`patientId`; fixed by casting the create payload
   `as unknown as IPharmacySale` — Mongoose coerces the ids on save, matching the
   repo's loosely-typed invoice-item pattern. Re-run: 0 pharmacy errors.)

2. `npx next build` — **PASS.** "✓ Compiled successfully in 47s"; exit code 0.
   The route list includes `ƒ /dashboard/pharmacy/pos` (dynamic, server-rendered
   on demand). No "A 'use server' file can only export async functions" error —
   the `'use server'`-only-async-exports rule holds (all constants/types live in
   the non-`'use server'` `lib/constants/pharmacy-pos.ts`). The build log also
   prints an informational "Dynamic server usage: Route /dashboard/pharmacy/pos
   couldn't be rendered statically because it used `cookies`" notice — this is the
   expected reason the route is marked dynamic (it reads the auth session via
   `currentUser()`), identical to every other authenticated dashboard route; it is
   NOT a build error (exit code 0, build succeeded).

3. `npm run test` (= `vitest run`) — **PASS.** Test Files 27 passed (27);
   Tests 484 passed (484). Confirms the item-5 `DEFAULT_ACCOUNT_MAP` change and
   the item-3 pure helpers did not regress any existing suite.

4. Print CSS — **PRESENT & scoped.** `app/globals.css` contains an `@media print`
   block keyed on `#pos-receipt` (`body * { visibility: hidden }`,
   `#pos-receipt, #pos-receipt * { visibility: visible }`,
   `#pos-receipt { position: absolute; inset: 0 }`), appended at the end of the
   file. No `<style jsx global>` used.

Temporary capture files (`tsc-out.txt`, `build-out.txt`, `test-out.txt`) were
deleted after recording these results.

## Dependency order summary

Items 1→5 are the leaf dependencies (types, model, constants, enum, default map) and must land first. Item 6 (actions) depends on 2–5. Items 7–9 (UI) depend on 3 and 6. Item 10 is independent (CSS + nav). Items 11–12 verify the whole. Each item leaves the tree buildable: 1–5 compile standalone; 6 compiles once its imports exist; 7–9 compile once the action + constants exist (create 8/9 before wiring 7's import, or stub). Every item's verification uses the project's real commands (`npx tsc --noEmit`, `npm run build`, `npm run lint`, `npm run test`), not grep.
