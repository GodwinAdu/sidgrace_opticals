# Requirements — Platform Hardening

## Introduction

Medira has broad feature coverage but gaps in cross-cutting concerns:
authorization is enforced only in the UI (not in server actions), there are no
automated tests, several multi-document operations lack transactions and use
race-prone counters, some clinical workflows are shallow (lab/radiology as
free-text, no scheduling depth, thin portal, no uploads), and operational
concerns (durable error logging, settings-driven identity, backups, a11y) are
unaddressed.

This spec hardens the platform across five areas, in priority order:
1. **Authorization** — enforce role permissions inside server actions.
2. **Automated tests** — a harness plus tests for the money paths.
3. **Data integrity** — atomic numbering + transactions for multi-doc ops.
4. **Clinical depth** — lab/radiology orders, scheduling, portal, uploads, dashboards.
5. **Reliability & ops** — error handling/logging, settings-driven identity, backups, a11y.

Each area is independently shippable; later areas depend on earlier ones only
where noted. Specialty-neutral throughout.

---

## Requirement 1 — Server-side authorization

**User story:** As a hospital, I want every privileged action checked against the
caller's role so that UI gating cannot be bypassed.

### Acceptance Criteria
1. `withAuth` SHALL support an optional required-permission argument (one or
   more `IRole` flag names). WHEN provided, the wrapped action SHALL load the
   caller's role and reject the call if the flag is not set.
2. WHEN a user without the required flag invokes a gated action THEN it SHALL
   throw an authorization error and perform no writes.
3. Admin/superuser SHALL pass all checks (a role with all flags, or an explicit
   admin bypass).
4. Every write/delete action in `lib/actions/*` SHALL declare the permission it
   requires; read actions MAY remain authentication-only where appropriate.
5. The role lookup SHALL be efficient (cached per request) and SHALL NOT break
   existing call sites that pass no permission (back-compatible default:
   authentication-only).
6. Authorization failures SHALL be auditable (logged with user + action).

## Requirement 2 — Session correctness

**User story:** As an admin, I want role/ban changes to take effect promptly so
that revoked access does not linger.

### Acceptance Criteria
1. The in-memory session cache SHALL be invalidated when a staff member's role,
   active status, or ban status changes.
2. A banned or inactive staff SHALL be rejected at authentication, not just hidden
   in the UI.
3. Cache TTL SHALL be short enough that stale permissions are bounded (document
   the window); role-changing actions SHALL clear the affected user's cache.

## Requirement 3 — Automated tests for money paths

**User story:** As a maintainer, I want the financial logic covered by tests so
that a wrong number is caught before release.

### Acceptance Criteria
1. A test runner SHALL be set up with a `test` script in `package.json`.
2. Pure financial logic SHALL be extracted where needed to be unit-testable
   (invoice totals, bed-day accrual, settlement allocation, claim coverage).
3. Tests SHALL cover: invoice total/tax/discount/balance; `recomputeInvoice`
   status transitions; `settlePatientOutstanding` oldest-first allocation and
   partial coverage; bed-day whole-day accrual; claim coverage % computation;
   authorization allow/deny.
4. Tests SHALL run green locally via the `test` script and SHALL NOT require a
   live database (logic is unit-tested; DB-bound code is isolated).

## Requirement 4 — Data integrity & concurrency

**User story:** As accounts, I want invoice/claim numbers unique and multi-step
operations all-or-nothing so that records never corrupt under load.

### Acceptance Criteria
1. Invoice and claim numbering SHALL be atomic (a counter document or equivalent)
   so concurrent creation cannot produce duplicate numbers.
2. Multi-document operations SHALL run in a transaction (Mongoose session) so a
   mid-way failure rolls back: admit (admission + bed + attendance), transfer,
   discharge (+ bed charge), payment (payment + invoice + ledger),
   settle-outstanding, dispense (stock + visit bill).
3. WHEN the deployment's MongoDB does not support transactions (standalone)
   THEN the code SHALL degrade safely (documented) rather than crash.
4. Bed-day charges SHALL have a way to stay current without a UI view (a callable
   recompute endpoint/action suitable for a scheduled job), documented.

## Requirement 5 — Clinical depth

**User story:** As clinical staff, I want lab/radiology orders, real scheduling,
a usable patient portal, file uploads, and operational dashboards.

### Acceptance Criteria
1. **Lab/radiology orders**: a lab order SHALL have status (ordered → collected →
   resulted), result entry, and link to the visit/patient — replacing free-text
   only where added (existing fields remain for back-compat).
2. **Scheduling**: appointments SHALL support provider + time slot and feed the
   OPD queue; reminders reuse existing recall/notification.
3. **Patient portal**: a patient SHALL be able to view their invoices/balance and
   results, and request an appointment, through the existing portal surface.
4. **File uploads**: imaging/consent/attachments SHALL support an upload pipeline
   storing a retrievable URL (pluggable storage; local/dev acceptable first).
5. **Dashboards**: operational views SHALL exist for bed occupancy, revenue by
   department/source, and drug consumption, from real data.
6. Each sub-feature is independently shippable; partial delivery SHALL not break
   existing flows.

## Requirement 6 — Reliability & operations

**User story:** As an operator, I want consistent error handling, configurable
clinic identity, backup guidance, and accessible UI.

### Acceptance Criteria
1. Server actions SHALL surface typed, user-safe errors; failures SHALL be logged
   durably (not only `console.error`) with enough context to diagnose.
2. The app SHALL have route-level error boundaries so a failure shows a friendly
   screen, not a crash.
3. Clinic/hospital identity (name, address, logo, contact) SHALL come from a
   Settings record and be used in invoices/receipts/report headers instead of a
   hardcoded constant.
4. A documented backup/restore and data-retention strategy SHALL exist in the repo.
5. Key screens SHALL be reviewed for accessibility (labels, focus, contrast,
   keyboard nav); known gaps SHALL be documented. Full WCAG validation requires
   manual testing with assistive tech and expert review.

## Requirement 7 — Non-regressive

### Acceptance Criteria
1. TypeScript error count SHALL not exceed the current baseline (154); touched
   files SHALL introduce zero new errors.
2. All affected routes SHALL compile (dev server returns redirect/200, not 500).
3. The cash-basis ledger invariant SHALL be preserved.
4. Existing call sites SHALL keep working as each phase lands (back-compatible
   changes; no big-bang break).
