# Requirements — Invoice-Centric Billing

## Introduction

Billing is currently split across two parallel systems: a bill embedded in each
attendance (`attendance.billing`) that clinical staff manage inside the
consulting screen, and a standalone `Invoice` model with its own payment and
ledger plumbing. This duality lets financial data drift and mixes money
management into the clinical record.

This feature makes the **Invoice the single financial source of truth** and
moves all billing work out of the attendance detail onto a dedicated,
role-gated Billing page under `/dashboard/billing`. Clinical staff record care
(and the charges that flow from it) in their normal workflow; the invoice is
built automatically from those charges; accountants manage invoices and
payments on the Billing page.

The destination largely already exists. A fully server-wired billing tree is on
disk at `app/(dashboard)/(routes)/dashboard/billing/`: invoice list
(`getAllInvoices`), create (`InvoiceBuilder` → `createInvoice`), detail
(`getInvoiceById` + `getPaymentsByInvoice` + `PaymentPanel` → `recordPayment`),
plus insurance and claims sub-trees. The nav "Billing" group points at it,
gated by the existing `billingManagement` / `insuranceManagement` role flags.
The payment/ledger layer already runs against invoices (`recordPayment`,
`recomputeInvoice`, `settlePatientOutstanding`, `postLedgerEntry`), and
`visit-clinical.actions.ts` already contains `createInvoiceFromVisit` /
`syncInvoiceIfExists` that build and keep an invoice in sync from a visit's
charges.

Therefore this feature is a **migration into existing infrastructure**, not a
greenfield build. The real work is: (a) give the Invoice a direct link to its
visit, (b) create the visit invoice early (at check-in) instead of lazily, (c)
move the payment / settle-outstanding / custom-charge UI off the attendance
Billing tab onto the existing invoice detail page, (d) make the attendance
Billing tab a read-only summary with a deep link, and (e) retire the dead mock
page at `/dashboard/account/page.tsx` (not nav-linked, hardcoded data).

This is a general-hospital system (not dental-only); all UI copy and data must
stay specialty-neutral.

## Glossary
- **Visit / attendance**: one `Attendance` document — a clinical encounter.
- **Visit invoice**: the `Invoice` auto-created for a visit (`source: "visit"`).
- **Charge**: a line item (consultation, procedure, dispensed product, custom charge).
- **Settle outstanding**: pay down a patient's older unpaid/partial invoices.

---

## Requirement 1 — Invoices link to the originating visit

**User story:** As an accountant, I want each visit to have its own invoice so
that I can trace every charge back to the encounter that produced it.

### Acceptance Criteria
1. WHEN the `Invoice` model is extended THEN it SHALL carry an optional
   `attendanceId` (ref `Attendance`) and a `source` field with values
   `"visit" | "manual" | "plan"` defaulting to `"manual"`.
2. WHEN an existing invoice without `attendanceId`/`source` is read THEN it
   SHALL continue to load and behave as a `"manual"` invoice (backward
   compatible; no migration of old data required).
3. WHEN invoices are queried for a visit THEN the system SHALL find at most one
   active (`del_flag:false`) invoice per `attendanceId`.
4. The `IInvoice` TypeScript interface SHALL be updated to include the new
   fields as optional.

## Requirement 2 — Visit invoice is created automatically at check-in

**User story:** As a clinic, I want the consultation fee charged automatically
when a patient checks in so that no visit goes un-billed.

### Acceptance Criteria
1. WHEN an attendance is created at OPD check-in THEN the system SHALL create a
   linked visit invoice (`source:"visit"`, `attendanceId` set) seeded with the
   clinic's `defaultConsultationFee` as a "Consultation" line item (omitted when
   the fee is 0), and store `billing.invoiceId` + `billing.invoiceNumber` back
   on the attendance.
2. IF invoice creation fails THEN attendance creation SHALL still succeed and
   the failure SHALL be logged (check-in is never blocked by billing).
3. WHEN the consultation fee default is 0 THEN a visit invoice SHALL still be
   created (with no consultation line) so later charges attach to it.
4. The auto-created invoice status SHALL be `"unpaid"` when total > 0 and
   `"draft"`/`"paid"` consistent with existing invoice rules when total is 0.

## Requirement 3 — Clinical charges flow onto the visit invoice

**User story:** As a doctor/pharmacist, I want the procedures I record and the
drugs I dispense to appear on the patient's invoice automatically so that I
never touch money or a billing screen.

### Acceptance Criteria
1. WHEN a doctor records procedures in the Treatment Plan tab THEN those
   procedures SHALL be reflected as invoice line items on the visit invoice.
2. WHEN a pharmacist dispenses a prescription linked to the visit THEN the
   dispensed drugs SHALL be reflected as invoice line items on the visit
   invoice (existing pharmacy → `dispenseVisitProducts` path, now guaranteed to
   sync because the invoice always exists).
3. WHEN any charge changes THEN existing payments on the invoice SHALL be
   preserved and the invoice `total`/`balance`/`status` SHALL be recomputed.
4. The attendance SHALL retain a denormalized mirror of totals
   (`billing.totalCharged`/`amountPaid`/`balance`) for quick display only; the
   invoice remains the source of truth.

## Requirement 4 — Attendance detail billing becomes read-only

**User story:** As a clinician, I want to see the patient's balance without
being able to take payments so that money handling stays with accounts.

### Acceptance Criteria
1. WHEN the attendance detail page is viewed THEN it SHALL NOT present any
   control to record payments, settle outstanding, or add custom charges.
2. WHEN the attendance detail page is viewed THEN it SHALL show a compact,
   read-only billing summary (consultation + procedures + drugs + other,
   total charged, amount paid, balance) with a link to the full invoice on the
   Billing page.
3. The Treatment Plan tab SHALL keep the procedure-recording panel (procedures
   are clinical work that auto-charges), but it SHALL NOT show payment controls.
4. The former "Billing" tab's payment/custom-charge/consultation panels SHALL be
   removed from the attendance detail.

## Requirement 5 — Billing invoice list surfaces visit invoices

**User story:** As an accountant, I want the existing invoice list to show every
invoice including the auto-created visit invoices so that I can find any
patient's bill in one place.

### Acceptance Criteria
1. WHEN a user with `billingManagement` opens `/dashboard/billing/invoices`
   THEN the existing list (`getAllInvoices`) SHALL include visit invoices and
   SHALL surface each invoice's `source` (visit / manual / plan) and status.
2. The list SHALL continue to support its existing search; it SHALL add summary
   stats (total billed, collected, outstanding) using real data.
3. Access SHALL remain gated by `billingManagement` consistent with the app's
   existing role-gating pattern. No change to how gating works.
4. Currency SHALL come from clinic settings (`getClinicSettings`), never a
   hardcoded symbol.

## Requirement 6 — Invoice detail becomes the full payment workspace

**User story:** As an accountant, I want to open an invoice to add charges, take
payment, and settle previous outstanding so that I manage the whole bill where
the invoice lives — not inside the clinical screen.

### Acceptance Criteria
1. The existing `/dashboard/billing/invoices/[invoiceId]` detail page
   (`InvoiceView` + `PaymentPanel`) SHALL remain the invoice workspace and
   SHALL continue to show patient details, line items, totals, balance, status,
   and payment history.
2. The detail page SHALL gain a custom line-item editor (add/remove free-form
   charges, set tax/discount) that recomputes totals — relocating the behavior
   of the attendance `CustomChargesPanel`.
3. Recording a payment SHALL continue to use the existing `recordPayment` path
   (recompute invoice + post ledger income once; cash-basis preserved).
4. The detail page SHALL gain a "Settle previous outstanding" control that uses
   the existing `settlePatientOutstanding` path (relocating that behavior from
   the attendance `VisitPaymentPanel`).
5. WHEN an invoice has `attendanceId` THEN the detail page SHALL link back to
   the originating attendance.
6. A print/receipt view SHALL be available (may reuse/extend `InvoiceView`).

## Requirement 7a — Retire the dead mock billing page

**User story:** As a maintainer, I want the fake billing page gone so that no
one confuses it with the real billing tree.

### Acceptance Criteria
1. The mock page `app/(dashboard)/(routes)/dashboard/account/page.tsx`
   (hardcoded invoices/payments/claims, `$`/USD, links to non-existent
   `/dashboard/patients/...`) SHALL be removed (or replaced with a redirect to
   `/dashboard/billing/invoices`).
2. No nav entry or link SHALL point to the removed mock after this change.

## Requirement 8 — Specialty-neutral & non-regressive

**User story:** As any hospital using this system, I want billing to read
neutrally and not break existing accounting.

### Acceptance Criteria
1. All new/ًchanged UI copy SHALL avoid dental-only terms (prefer "Procedure",
   "Site" over "Tooth" where surfaced in billing).
2. Ledger postings SHALL remain cash-basis (income posts on payment, not on
   charge) — unchanged from today.
3. The TypeScript error count SHALL not increase above the current baseline, and
   touched files SHALL introduce zero new errors.
4. The billing routes SHALL compile (verified via the running dev server
   returning a redirect/200, not a 500).
