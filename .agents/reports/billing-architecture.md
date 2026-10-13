# Billing / Invoice Architecture — Findings Report

Read-only investigation of the billing + invoice stack in the Next.js 16 + Mongoose + TypeScript hospital app at `c:\Users\Jr\Desktop\sidgrace_opticals`. No files were modified.

---

## 1. Summary answer (TL;DR for the migration)

The user wants to move **all billing out of the attendance detail page** (`ConsultingPage.tsx` + `clinical-tab-panels.tsx`) and into a **dedicated billing/invoice page where accountants manage invoices and payments**. The key facts that shape that move:

- **A real, server-wired billing page tree already exists** at `app/(dashboard)/(routes)/dashboard/billing/` with Invoices (list / new / detail), Insurance, and Claims. It uses real server actions (`getAllInvoices`, `getInvoiceById`, `createInvoice`, `recordPayment`, `getPaymentsByInvoice`). **This is the migration target** — the destination largely exists; it mainly needs a visit-aware way to find/open the invoice for a visit, plus the "previous outstanding / settle" UI that currently lives in the attendance panel.
- **The `/dashboard/account/page.tsx` is a separate, fully MOCK page** ("Billing & Payments" with hardcoded `invoices`/`payments`/`insuranceClaims` arrays). It is **not linked from the nav** and is **not** the same as the real `/dashboard/billing` tree. It is dead/placeholder UI. The nav's "Accounting" group points to `/dashboard/account/account-list`, `/income-statement`, `/transactions`, etc. — NOT to `/dashboard/account` itself.
- **The invoice is auto-generated on demand, not automatically.** It is created the first time someone clicks "Generate Invoice" OR records a payment on the visit (`recordVisitPayment` lazily calls `createInvoiceFromVisit`). Charges accumulate on `attendance.billing` first; the `Invoice` document is created later and then kept in sync.
- **Billing today is spread across 5 panels inside the attendance Billing/Treatment tabs** plus a header summary and an OPD-time consultation auto-charge. Moving it out means relocating charge-capture + payment UI and re-pointing the single source of truth (currently `attendance.billing` + a lazily-created `Invoice`).

The cleanest migration: make the **`Invoice` the single source of truth** (it already can be — `syncInvoiceIfExists` keeps it current), auto-generate an invoice when a visit starts accumulating charges, and surface charge/payment management on the `/dashboard/billing` page keyed by patient/visit. The attendance page keeps **read-only charge capture** (procedures the doctor selects, drugs pharmacy dispenses) that feed the invoice, while **payments, custom charges, settlement, and the balance UI leave the attendance page**.

---

## 2. INVOICE MODEL — `lib/models/invoice.models.ts`

Schema `InvoiceSchema` (model name `Invoice`, exported default). Interface `IInvoice` is declared in `lib/types.d.ts`.

Top-level fields:
- `invoiceNumber: string` (required, unique) — format `INV-<year>-<5-digit-seq>` (see §3).
- `patientId: ObjectId → "Patient"` (required). **This is the only patient link; there is NO direct `attendanceId`/`visitId` field on the invoice.**
- `treatmentPlanId: ObjectId → "TreatmentPlan"` (default null).
- `items: [InvoiceItemSchema]` (default `[]`).
- `subtotal, tax, discount, total, amountPaid, balance: number` (all default 0).
- `status: enum ["draft","unpaid","partial","paid","cancelled"]` (default `"unpaid"`).
- `dueDate: Date | null`, `notes: string`.
- Audit: `createdBy / modifiedBy / deletedBy → "Staff"`, `mod_flag`, `del_flag`, `action_type: enum ["created","updated","deleted","restored"]`.
- `timestamps: true` (createdAt / updatedAt).
- Index: `{ patientId: 1, createdAt: -1 }`.

Line item sub-schema `InvoiceItemSchema` (`_id: false`):
- `description: string` (required), `procedureId: ObjectId → "Procedure" | null`, `tooth: number | null`, `quantity: number` (default 1), `unitPrice: number`, `amount: number`.

**The visit → invoice link is one-directional and lives on the Attendance side:** `attendance.billing.invoiceId` + `attendance.billing.invoiceNumber` point to the Invoice. There is no back-reference from the Invoice to the attendance. This is the single most important fact for the migration — to list "invoices by visit" on the billing page you either add an `attendanceId` to the Invoice or continue to resolve through the Attendance document.

### Attendance `billing` sub-document — `lib/models/attendance.models.ts`
`AttendanceSchema.billing` (the current combined per-visit bill, cash-basis):
- `invoiceId: ObjectId → "Invoice"`, `invoiceNumber: string`.
- `consultationFee: number`.
- `proceduresTotal: number`.
- `otherCharges: [{ label, amount }]`.
- `dispensedProducts: [{ productId → "InventoryProduct", name, quantity, unitPrice, total }]`.
- `totalCharged, amountPaid, balance: number`.
- `payments: [{ amount, method(enum cash/card/mobile-money/bank-transfer/insurance/other/""), transactionId → "Transaction", receivedBy → "Staff", receivedAt }]` — NOTE: this embedded `payments[]` array exists in the schema but the current payment path writes to the standalone `Payment` collection, not here. It appears legacy/unused by the live flow.

Other relevant attendance fields: `patientId`, `date`, `dentalProcedures: [{ procedureId, procedureName, tooth, surface, cost, note, performedAt }]` (the priced procedures that feed the bill), `status`, `visitType`, `paymentType` (cash/insurance/nhis), `linkedTreatmentPlans`.

---

## 3. INVOICE ACTIONS — `lib/actions/invoice.actions.ts`

All actions are wrapped with `await withAuth(...)` (injects `user: User` as first arg; call sites omit it). Helpers (module-private): `generateInvoiceNumber()` → `INV-<year>-<count+1 padded 5>`, `computeTotals(items, tax, discount)` → `{ withAmounts, subtotal, total }`.

Exported server actions:

- **`createInvoice(values: InvoiceValues)`** — manual create. `InvoiceValues = { patientId, treatmentPlanId?, items: InvoiceItemInput[], tax?, discount?, dueDate?, notes? }`; `InvoiceItemInput = { description, procedureId?, tooth?, quantity, unitPrice }`. Computes totals, generates number, saves Invoice + a `History` (`INVOICE_CREATED`). `status = total>0 ? "unpaid" : "paid"`, `balance = total`. Returns the invoice (JSON). **Used by `InvoiceBuilder.tsx` (the billing-page "New Invoice" form).**
- **`createInvoiceFromPlan(treatmentPlanId)`** — builds items from a `TreatmentPlan.items[]` (one line per plan item, `unitPrice = it.cost`) and delegates to `createInvoice`.
- **`getAllInvoices()`** — `Invoice.find({ del_flag:false }).populate("patientId","fullName patientId").sort({createdAt:-1})`. **Used by `/dashboard/billing/invoices/page.tsx`.**
- **`getInvoicesByPatient(patientId)`** — list for one patient, newest first.
- **`getInvoiceById(id)`** — populates `patientId` with `fullName patientId phone email address`. **Used by invoice detail page.**
- **`updateInvoiceStatus(id, status, path)`** — sets status + mod flags, `revalidatePath(path)`.
- **`deleteInvoice(id)`** — soft-delete via `deleteDocument(...)` (trash), writes history. Returns `{success,message}`.
- **`getPatientOutstanding(patientId, excludeInvoiceId?)`** — sums `balance` across invoices with `status in ["unpaid","partial"]` and `del_flag:false`, optionally excluding one invoice. Returns `{ total, count }`. **This is what powers "Previous Outstanding" in both the attendance header and the VisitPaymentPanel.**

**No `generateInvoiceFromVisit` lives here.** The visit→invoice generator is `createInvoiceFromVisit` in `visit-clinical.actions.ts` (see §3b).

### 3b. Visit-scoped invoice/charge/payment actions — `lib/actions/visit-clinical.actions.ts`
This file is the heart of the attendance-page billing. All exports `await withAuth(...)`. Key internal helpers:
- `loadVisit(attendanceId)` — loads Attendance, lazily initializes `billing` subdoc if missing.
- `recomputeVisitBilling(visit)` — recomputes `consultationFee + proceduresTotal(from dentalProcedures) + otherTotal + productsTotal` → `totalCharged`, recomputes `balance = max(0, totalCharged - amountPaid)`; replaces the whole `billing` subtree and `markModified("billing")`. Mutates, does not save.
- `generateInvoiceNumber()` — duplicate of the invoice.actions helper (same `INV-...` format).
- `buildVisitInvoiceItems(visit)` → `{ items, total }` — turns consultation + dentalProcedures + dispensedProducts + otherCharges into invoice line items.
- `syncInvoiceIfExists(user, visit)` — if `visit.billing.invoiceId` set, refreshes the Invoice's items/subtotal/total/balance/status from current charges (preserving `amountPaid`), then mirrors `amountPaid`/`balance` back onto the visit. **This is the auto-sync that keeps the invoice current as charges change.** Caller saves the visit.

Exported visit actions:
- **`addVisitDentalNote`, `saveVisitPerioExam`, `addVisitImaging`, `getVisitClinical`** — clinical (non-billing); mirror to standalone collections.
- **`setConsultationFee(attendanceId, amount, path)`** — sets `billing.consultationFee`, recompute, `syncInvoiceIfExists`, save. No ledger post.
- **`saveVisitProcedures(attendanceId, procedures[], path)`** — full-replace `dentalProcedures` (each `{procedureId,procedureName,tooth,surface,cost,note}`), recompute, sync invoice, save. Returns `{dentalProcedures, billing}`.
- **`setVisitOtherCharges(attendanceId, charges[], path)`** — full-replace `billing.otherCharges`, recompute, sync, save. Returns `billing`.
- **`dispenseVisitProducts(attendanceId, items[{productId,quantity}], path)`** — prices each line at `InventoryProduct.salePrice`, reconciles stock by DELTA vs previously dispensed (guards against overselling), sets `billing.dispensedProducts`, recompute, sync, save. Also `revalidatePath("/dashboard/inventory/products")`. Returns `billing`.
- **`createInvoiceFromVisit(attendanceId, path)`** — the real "generate invoice from visit". recomputeVisitBilling → buildVisitInvoiceItems; throws if no items. If `billing.invoiceId` exists, refreshes that invoice; else creates a new `Invoice` (`notes:"Generated from clinic visit"`) + `History` (`INVOICE_CREATED`). Writes `invoiceId/invoiceNumber/amountPaid/balance` back onto the visit, saves, `revalidatePath("/dashboard/billing/invoices")`. Returns the invoice.
- **`getVisitInvoice(attendanceId)`** — returns the Invoice linked to the visit (populated `patientId`) or null.
- **`recordVisitPayment(attendanceId, amount, method, path)`** — THE visit payment path. recompute; if no `invoiceId`, lazily calls `createInvoiceFromVisit` first; validates amount ≤ outstanding; creates a `Payment` (dynamic import of `payment.models`); recomputes invoice `amountPaid/balance/status` from all its Payments; posts income to the ledger ONCE via `postLedgerEntry` (category = Procedure if proceduresTotal>0 else Consultation else Other Income, account `"Clinic Revenue"`); mirrors `amountPaid/balance` onto the visit; `revalidatePath` for `/dashboard/billing/invoices`, the invoice detail, `/dashboard/account/transactions`, `/income-statement`. Returns `{ billing, invoice }`.

---

## 4. PAYMENT FLOW

### `lib/actions/payment.actions.ts`
`PaymentValues = { patientId, invoiceId?, amount, method, reference?, note? }`. Helper `recomputeInvoice(invoiceId)` sums the invoice's `Payment` docs → `amountPaid`, `balance = max(0, total-amountPaid)`, status (unless cancelled).

- **`recordPayment(values, path)`** — creates a `Payment`, writes `History` (`PAYMENT_CREATED`), if `invoiceId` recomputes that invoice, then **posts income to the ledger** via `postLedgerEntry` (category = `"Insurance Reimbursement"` if method insurance else `"Procedure"`, account `"Clinic Revenue"`, source `"payment"`). **Used by the billing-page `PaymentPanel.tsx`.**
- **`getPaymentsByInvoice(invoiceId)`** — populates `receivedBy.fullName`. **Used by invoice detail page.**
- **`getPaymentsByPatient(patientId)`** — populates `invoiceId.invoiceNumber`.
- **`settlePatientOutstanding(patientId, amount, method, excludeInvoiceId?, path?)`** — settles PREVIOUS outstanding invoices oldest-first. Loads unpaid/partial invoices (`sort createdAt:1`, excluding `excludeInvoiceId`), allocates the amount across them, creating one `Payment` per invoice touched, recomputing each, and posting income to the ledger once per payment. Writes `History` (`OUTSTANDING_SETTLED`). Returns `{ applied, settledCount, unallocated }`. `revalidatePath("/dashboard/billing/invoices")` + `/dashboard/account/transactions`. **This is the "Settle Previous Outstanding" action in VisitPaymentPanel.**

### `lib/actions/visit-clinical.actions.ts`
`recordVisitPayment` and `recomputeVisitBilling` — documented in §3b.

### Ledger / accounting — `lib/actions/transaction.actions.ts`
- **`postLedgerEntry(user, values: TxnInput)`** — plain exported (NOT withAuth-wrapped) helper for other actions that already have a user. Wraps `_postTransaction` (returns null on error).
- `_postTransaction(user, values, path?)` — creates a `Transaction` (`Transaction` model), `getOrCreateAccount(accountName)` (default income→`"Clinic Revenue"`, expense→`"Operating Expenses"`), `adjustAccountBalance` (+amount income / −amount expense), `$addToSet` txn onto `deposits[]`/`expenses[]`, writes `History` (`TRANSACTION_CREATED`).
- `TxnInput = { type:"income"|"expense", category, amount, accountName?, date?, description?, method?, source?:"manual"|"payment"|"invoice"|"purchase"|"attendance", sourceId?, patientId? }`.
- Also exports `recordIncome`, `recordExpense` (withAuth). (A ledger reversal helper exists further down the file.)

**Cash-basis invariant (consistently commented in code): charges only BUILD the bill; revenue posts to the ledger only when a `Payment` is recorded.** Both `recordPayment` and `recordVisitPayment` post exactly once per payment.

---

## 5. BILLING UI TODAY — `app/(dashboard)/(routes)/dashboard/attendance/_components/clinical-tab-panels.tsx`

All are `"use client"`. The billing-related exported components and the actions they call:

- **`ConsultationBillingPanel`** — props `{ attendanceId?, consultation?:{amount?}, currency?, onBillingChange?, readOnly? }`. Calls `getClinicSettings` (default fee + currency) and `setConsultationFee`. NOTE: per the Billing tab comment, consultation fee is now applied at OPD check-in; this panel is **not rendered in the current Billing tab** (see §ConsultingPage below) though it is still exported.
- **`CustomChargesPanel`** — props `{ attendanceId?, charges?:OtherCharge[], currency?, onBillingChange?, readOnly? }`. Free-form `{label,amount}` line items. Calls `setVisitOtherCharges`, `getClinicSettings`. **Rendered in the Billing tab.**
- **`VisitProductsPanel`** — props `{ attendanceId?, dispensed?:DispensedRow[], currency?, onBillingChange?, readOnly? }`. Dispense inventory/drugs. Calls `fetchAllProducts`, `getClinicSettings`, `dispenseVisitProducts`. (Exported; mounting point is the dispense flow.)
- **`VisitProceduresPanel`** — props `{ attendanceId?, procedures?:VisitProc[], currency?, onBillingChange?, onProceduresChange?, readOnly? }`. Pick procedures from catalog; **auto-charges on add/remove** (calls `saveVisitProcedures` immediately). Calls `getAllProcedures`, `getClinicSettings`. **Rendered inside the Treatment-Plan tab** (not the Billing tab) — this is where "doctors select procedure at treatment plan tab, which auto bills".
- **`VisitPaymentPanel`** — props `{ attendanceId?, patientId?, billing?:Billing, procedures?:VisitProc[], currency?, onBillingChange?, readOnly? }`. The money hub. Calls `getVisitInvoice`, `getPatientOutstanding`, `getClinicSettings`, `createInvoiceFromVisit` (Generate Invoice), `recordVisitPayment` (Record Payment), `settlePatientOutstanding` (Settle Previous Outstanding). Shows itemized breakdown, Total/Paid/This-Visit-Balance/Previous-Outstanding/Grand-Total, status badge, and a link to `/dashboard/billing/invoices/{invoice._id}`. **Rendered in the Billing tab.**

Other (non-billing) panels in this file: `VisitDentalNotesPanel`, `VisitPerioPanel`, `VisitImagingPanel`, `DentalChartTabPanel`, `DentalPlanTabPanel`, `LabCaseTabPanel`.

### Attendance page wiring — `ConsultingPage.tsx`
- Imports `CustomChargesPanel`, `VisitProceduresPanel`, `VisitPaymentPanel` (NOT `ConsultationBillingPanel` or `VisitProductsPanel`).
- Header "Billing summary" card shows Previous Bill (`getPatientOutstanding`), Current Bill (`billing.balance`), Balance Due.
- Shared state `attendanceData.billing` is the single client source of truth; `handleBillingChange` / `handleProceduresChange` reconcile optimistic updates with server returns.
- **Treatment-Plan tab** renders `VisitProceduresPanel` (auto-charging procedures).
- **Billing tab** (`can("attBilling")`, value `"billing"`) renders only `CustomChargesPanel` + `VisitPaymentPanel`. The comment states: consultation fee auto-applied at OPD; procedures charged in Treatment tab; drugs billed by Pharmacy; Billing tab holds accountant custom charges + running balance/payments.
- The "Consultation Fee" tab the user asked to remove is already gone; its auto-charge happens at OPD check-in. There is no standalone consultation-fee tab in the current file.

---

## 6. EXISTING BILLING PAGES

### Real tree (server-wired) — `app/(dashboard)/(routes)/dashboard/billing/`
Confirmed on disk:
- `invoices/page.tsx` — list; `getAllInvoices()` → `DataTable` (searchKey `invoiceNumber`); "New Invoice" → `/dashboard/billing/invoices/new`.
- `invoices/new/page.tsx` — renders `InvoiceBuilder` (patient search via `fetchPatientBySearch`, catalog via procedures, calls `createInvoice`).
- `invoices/[invoiceId]/page.tsx` — detail; `getInvoiceById` + `getPaymentsByInvoice` + `getClinicSettings`; renders `InvoiceView` + `PaymentPanel`.
- `invoices/_components/`: `InvoiceBuilder.tsx`, `InvoiceView.tsx`, `PaymentPanel.tsx` (calls `recordPayment`), `cell-action.tsx`, `column.tsx`.
- `invoices/loading.tsx`.
- `insurance/page.tsx`, `insurance/[patientId]/page.tsx`, `insurance/_components/InsuranceManager.tsx`.
- `claims/page.tsx`, `claims/_components/ClaimsManager.tsx`.

**This tree is real and should be the migration destination.** It already does list / create / view / record-payment with real actions and ledger posting.

### Mock page — `app/(dashboard)/(routes)/dashboard/account/page.tsx`
A `"use client"` "Billing & Payments" page built entirely on **hardcoded mock arrays** (`invoices`, `payments`, `insuranceClaims`), USD `$` formatting, tabs **Invoices / Payments / Insurance Claims**, client-side search/status filter, and stat cards. Its links point to `/dashboard/billing/invoices/{id}` and `/dashboard/patients/{patientId}` (note: `/dashboard/patients/...` is NOT a real route — real patient routes are under `/dashboard/manage-patient/...`). **It is not wired to any server action and is not referenced by the nav.** Treat it as dead placeholder UI; the migration should either delete it or ignore it — do NOT build on it.

### Route existence
- `/dashboard/billing/invoices`, `/invoices/new`, `/invoices/[invoiceId]`, `/billing/insurance`, `/billing/insurance/[patientId]`, `/billing/claims` — **all exist.**
- `/dashboard/billing/invoices/new` is linked from `dashboard-overview.tsx` and `global-search.tsx` too.
- `/dashboard/account/*` exists as a full accounting tree (account-list, income-statement, trial-balance, balance-sheet, expenses, transactions) — these are legitimate and nav-linked. `/dashboard/account` (the page itself, the mock) is NOT nav-linked.

---

## 7. NAV — `components/dashboad-layout/nav-main.tsx`

Items are gated by `role[item.roleField]`; items with no `roleField` show for everyone (the group), and sub-items with `roleField` are individually filtered.

Relevant entries:
- **"Accounting"** group (`roleField: "accountManagement"`): sub-items → `/dashboard/account/account-list` (accountManagement), `/income-statement` (AccountReport), `/trial-balance` (AccountReport), `/balance-sheet` (AccountReport), `/expenses` (accountManagement), `/transactions` (accountManagement).
- **"Billing"** group (**no top-level roleField — group always visible**): sub-items →
  - "Invoices" → `/dashboard/billing/invoices` (`roleField: "billingManagement"`)
  - "Insurance" → `/dashboard/billing/insurance` (`roleField: "insuranceManagement"`)
  - "Claims" → `/dashboard/billing/claims` (`roleField: "insuranceManagement"`)
- There is **no nav entry for `/dashboard/account` (the mock billing page)**.

For an accountant-facing billing hub, the "Billing" group is the right home; it is gated per-sub-item by `billingManagement` / `insuranceManagement`.

---

## 8. ROLE FLAGS — `lib/types.d.ts` (`IRole`)

Attendance tab-level flags (gate ConsultingPage tabs via `can(flag)`):
- `attClinical`, `attLabScan`, `attEyeTest`, `attTreatment`, `attPrescribe`, **`attBilling`** (gates the attendance "Billing" tab).

Accounting / billing-related role flags already present:
- Top-level module: `accountManagement`, plus `addAccount`, `manageAccount`, `viewAccount`, `editAccount`, `deleteAccount`, and `AccountReport`.
- Dental/clinic feature flags: **`billingManagement`** and **`insuranceManagement`** (used by the Billing nav group), also `procedureManagement`, `treatmentPlanManagement`, `clinicalManagement`, `pharmacyManagement`, etc.

So the destination billing page is gated by `billingManagement`; the attendance billing tab is gated by `attBilling`. **A migration that removes billing from attendance should drop/retire the `attBilling` tab (or repurpose it to a read-only charge view) and rely on `billingManagement` for the dedicated page.**

---

## 9. ATTENDANCE → INVOICE: auto-generated or on-demand?

**On demand, not automatic.** Trace:
1. Charges accumulate onto `attendance.billing` (consultation at OPD; procedures via `saveVisitProcedures`; drugs via `dispenseVisitProducts`; custom via `setVisitOtherCharges`). Each recomputes `billing.totalCharged/balance` but does NOT create an Invoice.
2. An `Invoice` document is first created when EITHER:
   - the user clicks **Generate Invoice** → `createInvoiceFromVisit`, OR
   - the user **records a payment** → `recordVisitPayment` lazily calls `createInvoiceFromVisit` when `billing.invoiceId` is null.
3. Once created, `billing.invoiceId` + `billing.invoiceNumber` link the visit to the Invoice, and every later charge change calls `syncInvoiceIfExists` to refresh the Invoice (preserving `amountPaid`).
4. Payments live in the standalone `Payment` collection (`invoiceId` set); the embedded `attendance.billing.payments[]` array is effectively unused by the live path.
5. Revenue posts to the ledger (`Transaction` via `postLedgerEntry`) only at payment time (cash-basis).

So the visit→invoice relationship is: **`attendance.billing.invoiceId → Invoice._id`** (one-way), lazily materialized, kept in sync by `syncInvoiceIfExists`.

---

## 10. Conclusions & recommendations (for design, not implemented)

1. **Reuse the existing `/dashboard/billing` tree as the accountant hub.** It already has list/create/detail/record-payment wired to real actions. The migration is mostly about (a) moving charge-capture + payment + settlement UI off the attendance page and (b) making invoices discoverable per visit/patient on the billing page.
2. **Make the Invoice the single source of truth and auto-generate it early.** Today `attendance.billing` is the primary store and the Invoice is lazy. For an accountant-managed model, generate the Invoice as soon as the first charge is recorded (e.g. have `saveVisitProcedures` / `dispenseVisitProducts` / OPD consultation auto-charge call `createInvoiceFromVisit` instead of only `syncInvoiceIfExists`). Then the billing page always has an invoice to manage.
3. **Add a visit link to the Invoice.** There is no `attendanceId`/`visitId` on `Invoice`. Add one (e.g. `attendanceId: ObjectId → "Attendance"`, indexed) so the billing page can show "invoices for this visit" and so pharmacy/doctor charge-capture can target the right invoice without round-tripping through the Attendance doc. Backfill is trivial (visits already store `invoiceId`).
4. **Relocate `VisitPaymentPanel` + `CustomChargesPanel` + settlement UI to the billing page** (invoice detail or a new per-patient billing view). The attendance page can retain read-only charge capture that feeds the invoice:
   - Doctor's procedure selection (Treatment-Plan tab) → auto-charge is fine to keep as a charge source, but it should write to the invoice.
   - Pharmacy dispense already bills on dispense (`dispenseVisitProducts`) — keep as a charge source triggered from Pharmacy, not the attendance Billing tab.
   - Accountant custom charges + payments + "settle previous outstanding" → move to billing page.
5. **Retire the `attBilling` tab** (or make it a read-only summary with a deep link to `/dashboard/billing/...`). Gate the destination with `billingManagement`.
6. **Delete or clearly deprecate the mock `/dashboard/account/page.tsx`.** It duplicates "Billing & Payments" with fake data, uses `$`/USD, and links to a non-existent `/dashboard/patients/...` route. Leaving it risks confusion with the real billing tree.
7. **Mind the two generators.** `generateInvoiceNumber` is duplicated in `invoice.actions.ts` and `visit-clinical.actions.ts` (both `INV-<year>-<count+1>`). The count-based sequence is race-prone under concurrency; consider a single shared numbering helper if invoices start being created automatically.
8. **Currency inconsistency.** Real components use `formatMoney(..., currency)` from clinic settings; the mock page hardcodes `$`. Keep `getClinicSettings().currency` as the single currency source — important for the "all hospital types" generalization the user mentioned.

### Key file index
- Models: `lib/models/invoice.models.ts`, `lib/models/attendance.models.ts` (`billing` subdoc), `lib/models/payment.models.ts`, `lib/models/transaction.models.ts`.
- Types: `lib/types.d.ts` (`IInvoice`, `IPayment`, `ITransaction`, `IRole`).
- Actions: `lib/actions/invoice.actions.ts`, `lib/actions/payment.actions.ts`, `lib/actions/visit-clinical.actions.ts`, `lib/actions/transaction.actions.ts`.
- Attendance UI: `app/(dashboard)/(routes)/dashboard/attendance/_components/ConsultingPage.tsx`, `.../clinical-tab-panels.tsx`.
- Billing UI (destination): `app/(dashboard)/(routes)/dashboard/billing/invoices/{page,new/page,[invoiceId]/page}.tsx`, `.../_components/{InvoiceBuilder,InvoiceView,PaymentPanel,column,cell-action}.tsx`; `.../billing/insurance/*`, `.../billing/claims/*`.
- Mock (ignore/retire): `app/(dashboard)/(routes)/dashboard/account/page.tsx`.
- Nav: `components/dashboad-layout/nav-main.tsx` ("Billing" group → `/dashboard/billing/*`).

### Build/test commands (no test harness present)
From `package.json` (name `grace`): `npm run build` (`next build`), `npm run lint` (`next lint`), `npm run dev` (`next dev --turbopack`). **There is NO test framework, no AGENTS.md/CONTRIBUTING.md, and no `.kiro/steering/` docs.** Verification for any change should be `npm run build` + `npm run lint`.
