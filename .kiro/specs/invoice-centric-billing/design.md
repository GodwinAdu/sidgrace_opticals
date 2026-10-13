# Design — Invoice-Centric Billing

## Overview

Make the `Invoice` the single financial source of truth and relocate all money
management from the attendance detail page to the already-existing
`/dashboard/billing` tree. Charge capture stays in clinical workflow (procedures
in Treatment Plan, drugs at Pharmacy, consultation at check-in) but every charge
flows onto a visit invoice that is created at check-in. Payment, settlement, and
custom-charge editing live on the invoice detail page, gated by
`billingManagement`.

This design deliberately reuses existing infrastructure identified in
`.agents/reports/billing-architecture.md`:
- Invoice list / detail / create pages under `app/.../dashboard/billing/`.
- `invoice.actions.ts`, `payment.actions.ts`, `visit-clinical.actions.ts`,
  `transaction.actions.ts` (ledger).
- `createInvoiceFromVisit` + `syncInvoiceIfExists` (visit→invoice build/sync).

## Architecture

```
OPD check-in ─► createAttendance ─► createVisitInvoice (NEW, early)
                                        │  seeds consultation line
                                        ▼
                            Invoice (source="visit", attendanceId set)
                                        ▲
        Treatment Plan tab ─ saveVisitProcedures ─┐
        Pharmacy dispense  ─ dispenseVisitProducts ─┼─► syncInvoiceIfExists
        (invoice always exists, so sync always runs)┘

/dashboard/billing/invoices        list (getAllInvoices)         [billingManagement]
/dashboard/billing/invoices/[id]   detail = payment workspace     [billingManagement]
     ├─ InvoiceView (line items, totals, print)
     ├─ custom line editor  ─► updateInvoiceItems (NEW action)
     ├─ PaymentPanel        ─► recordPayment (existing)
     └─ Settle outstanding  ─► settlePatientOutstanding (existing)

Attendance Billing tab  ─►  READ-ONLY summary + deep link to invoice
```

### Source-of-truth rule
The `Invoice` is authoritative for money. `attendance.billing` is kept only as a
denormalized mirror for quick header/summary display (populated by the existing
`recomputeVisitBilling` + `syncInvoiceIfExists` mirror-back). No UI writes money
through `attendance.billing` anymore.

## Components and changes

### 1. Data model (`lib/models/invoice.models.ts`, `lib/types.d.ts`)
- Add to `InvoiceSchema`:
  - `attendanceId: { type: ObjectId, ref: "Attendance", default: null }`
  - `source: { type: String, enum: ["visit","manual","plan"], default: "manual" }`
  - index `{ attendanceId: 1 }`.
- Update `IInvoice` with `attendanceId?: Types.ObjectId | null` and
  `source?: "visit" | "manual" | "plan"`.
- Backward compatible: existing invoices read as `source:"manual"`,
  `attendanceId:null`.

### 2. Early invoice creation
Two options considered:
- **(A) Create at check-in** inside `createAttendance`.
- (B) Create on first charge.

**Chosen: (A).** The user explicitly wants consultation auto-charged at
check-in; creating the invoice there means the billing page always has
something to show and every later charge syncs onto a guaranteed invoice. Risk:
a visit with zero charges still gets an invoice — acceptable (it carries the
consultation line; if fee is 0 it is a draft with no lines, which accountants
can cancel).

Implementation:
- Add `createVisitInvoice(user, { attendanceId, patientId, consultationFee })`
  helper (in `visit-clinical.actions.ts`, reusing `generateInvoiceNumber` +
  `buildVisitInvoiceItems`). Sets `source:"visit"`, `attendanceId`.
- `_createAttendance` (in `attendance.actions.ts`) calls it after saving the
  attendance, wrapped in try/catch so billing failure never blocks check-in,
  and writes `billing.invoiceId`/`invoiceNumber` back.
- Replace the current inline `billing` seed with: seed consultation locally for
  the mirror, then let the invoice be the truth.

### 3. Charge capture keeps flowing (minimal change)
- `saveVisitProcedures`, `dispenseVisitProducts`, `setVisitOtherCharges`,
  `setConsultationFee` already call `syncInvoiceIfExists`. Because the invoice
  now always exists, these just work. **Make `syncInvoiceIfExists` also set
  `invoice.attendanceId`/`source` if missing** (self-heal for older visits).
- Unify invoice numbering: have `visit-clinical.actions.ts` reuse one numbering
  helper (keep both call-sites but point to a shared function) to reduce the
  duplicate-sequence race noted in the report. (Low priority; document only if
  not done.)

### 4. Invoice detail = payment workspace (`billing/invoices/[invoiceId]`)
- Keep `InvoiceView` + `PaymentPanel`.
- Add a **custom line-item editor** component that calls a NEW action
  `updateInvoiceItems(invoiceId, items, tax, discount, path)` in
  `invoice.actions.ts` (recompute subtotal/total/balance/status, preserve
  `amountPaid`). This replaces attendance `CustomChargesPanel`.
- Add a **Settle previous outstanding** control (amount + method) calling the
  existing `settlePatientOutstanding(patientId, amount, method, excludeInvoiceId=thisInvoice, path)`.
- Add a back-link to `/dashboard/attendance/[attendanceId]` when `attendanceId`
  is present (resolve from invoice).
- Print/receipt: reuse `InvoiceView` with a print stylesheet / `window.print()`
  trigger (no new route needed).

### 5. Attendance Billing tab → read-only (`ConsultingPage.tsx`)
- Remove `CustomChargesPanel` and `VisitPaymentPanel` from the Billing tab.
- Replace with a compact read-only summary card: consultation, procedures,
  drugs, other, Total / Paid / Balance, status badge, and a button
  "Open invoice" → `/dashboard/billing/invoices/[invoiceId]` (shown when linked;
  otherwise "No invoice yet").
- Keep `VisitProceduresPanel` in the Treatment Plan tab (clinical charge source).
- `attBilling` flag now gates visibility of this read-only summary tab (not an
  edit surface). Keep the flag; its meaning narrows to "can see visit billing
  summary".

### 6. Retire mock (`dashboard/account/page.tsx`)
- Replace file contents with a server redirect to
  `/dashboard/billing/invoices`, or delete the route. Chosen: **redirect**
  (safer against any stray links). Verify nothing imports it.

## Data flow — payment (unchanged engine)
1. Accountant opens invoice detail, clicks Record Payment.
2. `recordPayment({patientId, invoiceId, amount, method}, path)`.
3. `recomputeInvoice` updates amountPaid/balance/status.
4. `postLedgerEntry` posts income once (cash-basis) to Clinic Revenue.
5. `syncInvoiceIfExists` mirror keeps `attendance.billing` display current on
   next visit load.

## Error handling
- Invoice creation at check-in is best-effort: failure logs and continues.
- `updateInvoiceItems` rejects edits to a `cancelled` invoice.
- Settling validates amount > 0 and that outstanding exists (existing behavior).
- Payment cannot exceed balance (existing validation in record paths).

## Testing strategy
No test framework exists. Verification per the project norm:
- `npx tsc --noEmit` — error count must not exceed current baseline; touched
  files introduce zero new errors.
- Dev server smoke test: `/dashboard/billing/invoices`,
  `/dashboard/billing/invoices/[id]`, `/dashboard/attendance/[id]`,
  `/dashboard/opd` return redirect/200 (not 500).
- Manual: create a visit → confirm an invoice exists with consultation line;
  add a procedure → confirm invoice line appears; record payment on billing page
  → confirm balance + ledger; settle outstanding → confirm oldest-first.

## Decisions / trade-offs
- **Invoice-centric over visit-bill**: professional standard; the payment/ledger
  layer is already invoice-based, so this is lower risk than it looks.
- **Early invoice creation** over lazy: guarantees the billing page always has a
  target and that charge sync always runs; cost is possible zero-charge drafts.
- **Keep `attendance.billing` as a mirror** rather than deleting it now: avoids a
  risky schema/data migration; it becomes display-only. A later cleanup can drop
  it.
- **Reuse existing billing pages** rather than building `/dashboard/account`:
  the real tree already exists and is wired; the mock is retired.

## Out of scope (future)
- Dropping `attendance.billing` entirely.
- Per-visit-type consultation fees / follow-up exemptions.
- Insurance claim auto-generation from invoices.
- Hardening invoice numbering against concurrency (atomic counter).
