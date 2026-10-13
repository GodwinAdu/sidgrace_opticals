# Design — Inpatient Management & Nursing

## Overview

Add inpatient management (wards, beds, admissions, transfer/discharge) and a
nursing workflow (shared-attendance nurse tabs + a nurse worklist dashboard),
with automatic per-day bed billing onto the existing invoice. The attendance
remains the single source of truth per encounter; inpatient data attaches via an
`Admission` document rather than forking the record.

Reuses established patterns:
- Tab-level permissions via `can(flag)` in `ConsultingPage.tsx`.
- Invoice sync from charges (`syncInvoiceIfExists` / visit billing) from the
  invoice-centric billing feature — bed charges become invoice line items.
- `withAuth`-wrapped server actions + `History` audit + `deleteDocument` trash
  pattern used across the codebase.

## Architecture

```
Attendance (visitType: outpatient | inpatient)        ← single source of truth
   │  (inpatient only)
   ▼
Admission ── ward → Ward ── beds → Bed (vacant|occupied|maintenance)
   │  admittedAt, dischargedAt, status, bedHistory[]
   ▼
Invoice (visit)  ← bed-day line item accrues from the stay

Nurse tabs (attNursing) live ON the attendance detail:
   Vitals (exists) · Nursing Notes · MAR · Intake/Output   (time-stamped logs)

Nurse dashboard  /dashboard/nursing   → worklist → links to attendance detail
Bed board        /dashboard/wards     → wards + beds + occupancy
Admissions       /dashboard/admission → admit / transfer / discharge
```

## Data models (new)

### Ward (`lib/models/ward.models.ts`, `IWard`)
- `name: string` (required), `type: enum(general|private|semi-private|icu|maternity|pediatric|other)`
- `dailyRate: number` (default 0), `isActive: boolean` (default true)
- audit fields (createdBy/modifiedBy/deletedBy, mod_flag, del_flag, action_type), timestamps.

### Bed (`lib/models/bed.models.ts`, `IBed`)
- `label: string` (required), `wardId: ObjectId→Ward` (required)
- `status: enum(vacant|occupied|maintenance)` (default vacant)
- `currentAdmissionId: ObjectId→Admission | null`
- index `{ wardId: 1 }`; audit + timestamps.
- Uniqueness: `{ wardId, label }` unique to avoid duplicate bed numbers.

### Admission (`lib/models/admission.models.ts`, `IAdmission`)
- `patientId: ObjectId→Patient` (required), `attendanceId: ObjectId→Attendance` (required)
- `admittingStaff: ObjectId→Staff`, `wardId`, `bedId`
- `admittedAt: Date`, `expectedDischarge: Date|null`, `reason: string`
- `status: enum(admitted|discharged)` (default admitted), `dischargedAt: Date|null`
- `dischargeSummary: string`
- `bedHistory: [{ wardId, bedId, from, to }]` — transfer trail
- index `{ patientId: 1, status: 1 }`, `{ attendanceId: 1 }`; audit + timestamps.

All three interfaces added to `lib/types.d.ts`.

## Server actions (new files)

### `lib/actions/ward.actions.ts`
`createWard`, `getAllWards` (with occupancy aggregation), `getWardById`,
`updateWard`, `deleteWard` (block if occupied beds). All `withAuth`.

### `lib/actions/bed.actions.ts`
`createBed`, `getBedsByWard`, `getBedBoard` (all wards+beds+current patient),
`updateBedStatus`, `deleteBed`. Enforce single-occupant invariant.

### `lib/actions/admission.actions.ts`
- `admitPatient({ patientId, attendanceId, wardId, bedId, reason, expectedDischarge })`
  — validates bed vacant + no active admission; creates Admission; sets bed
  occupied + `currentAdmissionId`; sets attendance.visitType=`inpatient`; audit.
- `transferBed(admissionId, newBedId)` — free old bed, occupy new, push bedHistory.
- `dischargePatient(admissionId, { dischargeSummary })` — status=discharged,
  dischargedAt=now, free bed, finalize bed-day charge on invoice.
- `getActiveAdmissions({ wardId? })` — nurse dashboard worklist.
- `getAdmissionByAttendance(attendanceId)` — header context on the detail page.

### Bed-day billing
Helper `computeBedDays(admittedAt, end)` = ceil of day span, min 1 while
admitted. A function `syncBedChargeOnInvoice(user, admission)` adds/updates a
"Bed charge — <ward> (<n> day(s))" line via the invoice edit path
(`updateInvoiceItems`-style merge that preserves other items + payments).
Called on discharge and on-demand when billing is viewed. No ledger post
(cash-basis).

## UI / routes

### Wards & bed board — `/dashboard/wards`
- Ward list with occupancy; create/edit ward dialog.
- Bed board: beds grouped by ward, color-coded by status, current patient shown;
  add/edit bed; set maintenance.

### Admissions — `/dashboard/admission` (replace the empty stub)
- List active admissions; "Admit patient" flow (search patient → pick existing
  open visit or create one → choose ward/bed → reason) ; transfer & discharge
  actions.

### Attendance detail (nurse tabs) — extend `ConsultingPage.tsx`
- Add `attNursing` to the `can` gating; add tabs: Nursing Notes, MAR,
  Intake/Output (Vitals already present). Each is an append-only timestamped
  log stored on the attendance (embedded arrays, mirroring the dental-notes
  pattern already in the file).
- Header: when `getAdmissionByAttendance` returns an active admission, show
  ward / bed / admitted date / day-of-stay chip.

### Nurse dashboard — `/dashboard/nursing`
- Worklist of active inpatients (filter by ward) + the nurse's outpatient queue;
  each row deep-links to `/dashboard/attendance/[id]`.

## Attendance model additions
Embedded time-stamped nurse logs on `AttendanceSchema`:
- `nursingNotes: [{ note, authoredBy, createdAt }]`
- `medicationAdmin: [{ drugName, dose, route, givenBy, givenAt, note }]`
- `intakeOutput: [{ type: enum(intake|output), kind, amountMl, recordedBy, recordedAt }]`
- `admissionId: ObjectId→Admission | null` (quick link; source of truth is Admission)

## Role flags
Add to `IRole`, role model, and `CreateRoleForm`: `wardManagement`,
`admissionManagement`, `attNursing`, `nursingDashboard`. Admin preset = all true.

## Error handling
- Bed assignment is transactional in spirit: re-check vacancy at admit/transfer
  time; reject if taken (race-safe guard, not just UI).
- Discharge of an already-discharged admission is a no-op with a clear message.
- Deleting a ward/bed with an active occupant is blocked.
- Bed-day computation guards against negative/zero spans (min 1 day while
  admitted; discharged same-day = 1 day).

## Testing strategy
No test framework. Verify each task with `npx tsc --noEmit` (≤ baseline, zero
new in touched files) and dev-server smoke tests on new routes (redirect/200).
Manual flow: create ward+beds → admit a patient (bed occupied, visitType flips)
→ nurse records vitals/notes/MAR → transfer → discharge (bed freed, bed charge
on invoice) → pay invoice (ledger posts once).

## Decisions / trade-offs
- **Shared attendance + Admission side-record** over a separate nurse page or a
  separate inpatient record: one source of truth per encounter; mirrors the
  billing cleanup.
- **Ward/Bed as entities** over free-text fields: enables occupancy, double-book
  prevention, capacity reporting.
- **Bed charge computed/synced onto the invoice** over a separate charge store:
  reuses invoice-centric billing; one bill per visit.
- **Whole-day accrual (each started day = 1)**: simplest defensible rule; can be
  refined later. Documented so it is intentional, not accidental.
- **Embedded nurse logs on the attendance** over standalone collections: matches
  the existing per-visit embedded-snapshot pattern; can be mirrored out later if
  cross-visit nursing reports are needed.

## Phasing (implementation order)
1. Models + types + role flags (no UI).
2. Ward/bed actions + bed board UI.
3. Admission actions + admissions UI + attendance header context + visitType flip.
4. Nurse tabs on the shared attendance.
5. Nurse dashboard worklist.
6. Automatic bed-day billing + discharge finalization.
7. Nav + role form + specialty-neutral/verification sweep.

## Out of scope (future)
- Shift handover notes, care plans, nursing assessments beyond the above.
- Bed reservations/waitlist, ward transfer approvals.
- Partial-day/hourly bed pricing; different rates by bed class within a ward.
- Mirroring nurse logs into standalone collections for cross-visit reporting.
