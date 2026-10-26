# Design — Platform Hardening

## Overview

Five phases, priority-ordered. Each is back-compatible and independently
shippable. Phases 1–2 are the security/correctness foundation; 3 hardens data;
4 adds clinical depth; 5 covers ops.

## Phase 1 — Server-side authorization

### `withAuth` gains a permission argument
Current: `withAuth(handler)` → authenticates only.
New (back-compatible): `withAuth(handler, permission?)` where `permission` is a
flag name or array of flag names from `IRole`.

```
export function withAuth<...>(handler, permission?: PermOrPerms) {
  return async (...args) => {
    const user = await currentUser()
    if (!user) throw AuthError("Authentication required")
    if (permission) {
      const role = await currentUserRoleCached()      // IRole for this user
      if (!isAdmin(role) && !hasAll(role, permission)) {
        logAuthDenied(user, permission)
        throw AuthError("Not permitted")
      }
    }
    return handler(user, ...args)
  }
}
```

- `isAdmin(role)`: role whose `name === "admin"` OR has a sentinel super flag.
- Role is fetched via a request-cached helper (`react.cache`) to avoid repeated
  DB hits within one request.
- `AuthError` is a typed error so the UI can distinguish "not permitted" from
  generic failure.

### Rollout
Each action file declares the flag it needs at the `export const x = await
withAuth(_x, "flag")` site. Reads that are broadly safe stay authentication-only.
Mapping follows the existing nav `roleField`s (e.g. invoice writes →
`billingManagement`, ward/bed → `wardManagement`, admit/discharge →
`admissionManagement`, nursing writes → `attNursing`, staff → `staffManagement`,
etc.). Done file-by-file so each step verifies independently.

## Phase 2 — Session correctness
- On role update / ban / deactivate (`role.actions`, `staff.actions`), call the
  existing `clearUserCache(userId)` / `clearAllUserCache()`.
- At authentication, reject when `isActive === false` or `isBanned === true`.
- Keep the 15-min TTL but document it; role-changing actions clear the cache so
  changes apply immediately for the affected user.

## Phase 2 (tests) — Harness + money-path unit tests
- Add **Vitest** (fast, TS-native, no DB needed) + `"test": "vitest run"`.
- Extract pure functions into a testable module where they are currently inlined
  in actions:
  - `computeInvoiceTotals(items, tax, discount)`
  - `computeBedDays(admittedAt, end)`
  - `allocateSettlement(amount, invoices)` (oldest-first)
  - `claimCoverageAmount(invoiceTotal, coveragePercent)`
  - `invoiceStatusFrom(amountPaid, total)`
  - `hasPermission(role, perm)` (authz predicate)
- Tests live in `tests/` or co-located `*.test.ts`. No live DB; DB code stays in
  actions and calls the pure functions.

## Phase 3 — Data integrity & concurrency

### Atomic numbering
Add a `Counter` model `{ _id: string, seq: number }`. A `nextSequence(key)`
helper does `findOneAndUpdate({_id:key},{$inc:{seq:1}},{upsert,new})`.
`generateInvoiceNumber` / `generateClaimNumber` use it →
`INV-<year>-<seq>` / `CLM-<year>-<seq>`. Removes the `countDocuments()+1` race.

### Transactions
Wrap multi-doc operations in `mongoose.startSession()` + `withTransaction`:
- admit, transfer, discharge (incl. bed-charge sync)
- recordPayment / recordVisitPayment, settlePatientOutstanding
- dispenseVisitProducts (stock + bill), createInvoiceFromVisit
Guard: detect standalone Mongo (no replica set) and fall back to the current
sequential writes with a logged warning, so dev/standalone still works.

### Scheduled bed-day recompute
Expose `recomputeAllActiveBedCharges()` (iterates active admissions, calls the
existing sync). Document how to run it from a cron/scheduled task; no in-app
scheduler added.

## Phase 4 — Clinical depth (sub-features, each shippable)
1. **Lab/radiology orders**: `LabOrder` model (patientId, attendanceId, type,
   tests[], status ordered|collected|resulted, results, orderedBy, resultedBy).
   Order from the visit; results entry screen; status badges. Existing free-text
   lab/scan fields remain.
2. **Scheduling**: extend appointments with provider + slot; a day view; feed
   the OPD check-in. Reuse recall/notification for reminders.
3. **Portal**: patient-facing views for invoices/balance, lab results, and an
   appointment request, via the existing `portal.actions` surface.
4. **Uploads**: an upload action storing files (local `/public/uploads` or a
   pluggable adapter) returning a URL; wire into imaging/consent/attachments.
5. **Dashboards**: bed occupancy, revenue by department/source, drug
   consumption — from aggregation queries.

## Phase 5 — Reliability & ops
- **Errors**: a typed `ActionError`; a durable log sink (an `ErrorLog` collection
  or structured logger) instead of bare `console.error`; friendly toasts keep
  working.
- **Error boundaries**: `error.tsx` at dashboard and route-group level.
- **Settings-driven identity**: extend clinic settings with name/address/logo/
  contact; invoice/receipt/report headers read from it (replaces the `"Medira"`
  constant). A Settings screen to edit it.
- **Backups**: a `docs/OPERATIONS.md` with mongodump/restore and retention
  guidance; no secrets committed.
- **A11y**: pass over key screens (labels, focus rings, contrast, keyboard);
  record remaining gaps.

## Testing strategy
- Unit tests (Vitest) for pure logic each phase adds/extracts.
- `npx tsc --noEmit` ≤ baseline (154), zero new in touched files, every phase.
- Dev-server smoke tests for any changed route (redirect/200, not 500).
- Manual authz check: a limited role is denied a gated action; admin passes.

## Decisions / trade-offs
- **Permission arg on `withAuth`** over a separate guard: one choke point, every
  action already uses it, back-compatible default.
- **Vitest** over Jest: TS-native, fast, minimal config for a Next app.
- **Counter collection** over timestamp/UUID numbers: keeps human-readable
  sequential invoice numbers accountants expect, without the race.
- **withTransaction with standalone fallback**: correctness where supported,
  no crash in dev/standalone Mongo.
- **Keep existing free-text clinical fields**: add structured orders alongside,
  no destructive migration.

## Out of scope (future)
- SSO/MFA, full audit-trail UI, multi-tenant isolation, real object storage
  (S3) beyond a pluggable adapter, native mobile, FHIR/HL7 interop.
