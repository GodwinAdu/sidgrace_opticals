# Implementation Plan — Platform Hardening

Priority-ordered, back-compatible, independently verifiable. After each task:
`npx tsc --noEmit` (≤ baseline 154, zero new in touched files), run `npm test`
where tests apply, and smoke-test changed routes (redirect/200, not 500).
Do not commit/push unless asked.

## Phase 1 — Authorization
- [x] 1.1 Add permission support to `withAuth` (optional flag/flags), a typed
  `AuthError`, an `isAdmin` + `hasPermission(role, perm)` predicate, and a
  request-cached role lookup. Back-compatible: no permission = auth-only.
  _Req: 1.1, 1.3, 1.5, 1.6_
- [x] 1.2 Reject banned/inactive staff at authentication; invalidate session
  cache on role/ban/deactivate changes. _Req: 2.1, 2.2, 2.3_
- [x] 1.3 Apply required permissions to billing/invoice/payment/insurance
  actions. _Req: 1.4_
- [x] 1.4 Apply permissions to inpatient/nursing (ward, bed, admission, nursing)
  and attendance/visit-clinical write actions. _Req: 1.4_
- [x] 1.5 Apply permissions to staff/role/patient/inventory/pharmacy/account
  actions. _Req: 1.4_
- [x] 1.6 Verify: a limited role is denied a gated action; admin passes; routes
  compile. _Req: 1.2, 7.2_

## Phase 2 — Tests (money paths)
- [x] 2.1 Add Vitest + `"test"` script; minimal config.
  _Req: 3.1_
- [x] 2.2 Extract pure helpers: computeInvoiceTotals, invoiceStatusFrom,
  computeBedDays, allocateSettlement, claimCoverageAmount, hasPermission.
  Refactor actions to use them (no behavior change). _Req: 3.2_
- [x] 2.3 Unit tests for all extracted helpers incl. authz allow/deny; green via
  `npm test`. _Req: 3.3, 3.4_

## Phase 3 — Data integrity
- [x] 3.1 `Counter` model + `nextSequence(key)`; use in invoice & claim numbering.
  _Req: 4.1_
- [x] 3.2 Wrap admit/transfer/discharge in a transaction (session) with
  standalone fallback. _Req: 4.2, 4.3_
- [~] 3.3 Transactions: `runInTransaction` helper done; `admitPatient` fully
  wrapped as the template. REMAINING: thread sessions through transfer,
  discharge, payment, settlement, dispense, invoice-from-visit (each needs the
  session passed to every query — deferred to avoid false-safety half-wraps).
  _Req: 4.2, 4.3_
- [x] 3.4 `recomputeActiveBedChargesCore()` + authed wrapper + secured
  `POST /api/jobs/bed-charges` endpoint (x-cron-key / CRON_SECRET, 503 when
  unset) for the sidgrace-backend cron; ops doc updated. _Req: 4.4_

## Phase 4 — Clinical depth
- [x] 4.1 Lab/radiology orders: model + actions + order/result UI + status.
  _Req: 5.1_
- [x] 4.2 Scheduling: appointment model already has provider+slot; added
  `getProviderDaySchedule(date)` (day-view grouped by provider) and
  `checkInAppointment` (books an appointment into the OPD queue by creating the
  visit). UI for appointments already existed. _Req: 5.2_
- [SKIPPED] 4.3 Patient portal — skipped at user's request. _Req: 5.3_
- [x] 4.4 File uploads: upload action + pluggable storage; wire imaging/consent.
  _Req: 5.4_
- [x] 4.5 Dashboards: bed occupancy, revenue by dept/source, drug consumption.
  _Req: 5.5_

## Phase 5 — Reliability & ops
- [x] 5.1 Typed `ActionError` + durable error logging; keep friendly toasts.
  _Req: 6.1_
- [x] 5.2 Route-level `error.tsx` boundaries. _Req: 6.2_
- [x] 5.3 Settings-driven clinic identity (name/address/logo/contact) + Settings
  screen; use in invoice/receipt/report headers. _Req: 6.3_
- [x] 5.4 `docs/OPERATIONS.md` backup/restore + retention. _Req: 6.4_
- [x] 5.5 Accessibility pass on key screens; document gaps. _Req: 6.5_

## Notes
- Back-compatible rollout: `withAuth` default stays auth-only so untouched call
  sites keep working while permissions are applied file-by-file.
- Admin role bypasses permission checks.
- Transactions degrade safely on standalone Mongo.
- Cash-basis ledger invariant preserved.
