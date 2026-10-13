# Implementation Plan — Invoice-Centric Billing

Each task is incremental and independently verifiable. Verify after each with
`npx tsc --noEmit` (error count must not rise above baseline; zero new errors in
touched files) and, where routes change, a dev-server smoke test (redirect/200,
not 500). Do not commit/push unless the user asks.

- [x] 1. Extend the Invoice model with a visit link
  - Added `attendanceId` (ref `Attendance`, default null) and `source`
    (`"visit"|"manual"|"plan"`, default `"manual"`) to `InvoiceSchema`; added
    index `{ attendanceId: 1 }`.
  - Updated `IInvoice` in `lib/types.d.ts` with the two optional fields.
  - _Requirements: 1_

- [x] 2. Add `ensureVisitInvoice` + auto-create at check-in
  - Added `ensureVisitInvoice` in `visit-clinical.actions.ts` (idempotent, never
    throws on no-charges — creates a draft) and set `attendanceId`/`source` on
    the invoice created by `createInvoiceFromVisit`.
  - `_createAttendance` now calls `ensureVisitInvoice` after save in try/catch;
    writes `billing.invoiceId`/`invoiceNumber`/`balance` back; never blocks
    check-in on failure.
  - `syncInvoiceIfExists` self-heals `attendanceId`/`source` on older invoices.
  - _Requirements: 2, 3.1, 3.2_

- [x] 3. New action: `updateInvoiceItems`
  - Added `updateInvoiceItems(invoiceId, items, tax, discount, path)` in
    `invoice.actions.ts` — recompute subtotal/total/balance/status, preserve
    `amountPaid`, reject cancelled, write History, revalidate.
  - _Requirements: 6.2_

- [x] 4. Invoice detail: custom line-item editor
  - Added `InvoiceItemsEditor.tsx`; mounted on `invoices/[invoiceId]/page.tsx`.
    Specialty-neutral copy; recomputes totals; calls `updateInvoiceItems`.
  - _Requirements: 6.2, 8.1, 8.4_

- [x] 5. Invoice detail: settle previous outstanding
  - `PaymentPanel` gained a settle section (amount + method) calling
    `settlePatientOutstanding(..., excludeInvoiceId=thisInvoice)`; page passes
    `getPatientOutstanding(patientId, thisInvoiceId)`.
  - _Requirements: 6.4_

- [x] 6. Invoice detail: back-link + print/receipt
  - Detail page shows "View Visit" link when `attendanceId` present. Print +
    Download PDF already existed in `InvoiceView`; de-dentalised its copy.
  - _Requirements: 6.1, 6.5, 6.6_

- [x] 7. Invoice list: source column + summary stats
  - Added `source` badge column and Total Billed / Collected / Outstanding stat
    cards computed from `getAllInvoices`; currency from settings.
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 8. Attendance Billing tab → read-only summary
  - `ConsultingPage.tsx` Billing tab now renders a read-only summary card with an
    "Open invoice" deep link; removed `CustomChargesPanel` + `VisitPaymentPanel`
    and their imports. `VisitProceduresPanel` stays in the Treatment Plan tab.
    `attBilling` still gates the summary tab.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Retire the mock billing page
  - `dashboard/account/page.tsx` now redirects to `/dashboard/billing/invoices`.
  - _Requirements: 7a.1, 7a.2_

- [x] 10. Specialty-neutral copy pass + final verification
  - De-dentalised invoice view header copy. tsc at baseline (154) with zero new
    errors in touched files. Smoke test: billing list/detail, attendance, opd,
    account redirect all return 307 (compile clean, not 500).
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

## Notes
- Reuse, don't rebuild: list/detail/create pages and `recordPayment`/
  `settlePatientOutstanding`/`postLedgerEntry` already existed and were reused.
- Cash-basis invariant holds: income posts only on payment.
- `attendance.billing` stays as a display mirror this round (no data migration).

## Follow-ups not done this round (future)
- Drop `attendance.billing` entirely once the mirror is no longer read.
- Per-visit-type consultation fees / follow-up exemptions.
- Clinic name/address pulled from settings into the invoice/receipt header
  (currently a constant in `InvoiceView`).
- Harden invoice numbering against concurrency (atomic counter) — two
  count-based generators still exist.
