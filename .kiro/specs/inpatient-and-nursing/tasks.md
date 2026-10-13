# Implementation Plan — Inpatient Management & Nursing

Incremental, independently verifiable. After each task: `npx tsc --noEmit`
(error count ≤ baseline, zero new errors in touched files) and, for route
changes, a dev-server smoke test (redirect/200, not 500). Do not commit/push
unless the user asks.

- [x] 1. Models, types, role flags
  - Create `ward.models.ts`, `bed.models.ts`, `admission.models.ts` per design;
    add `IWard`, `IBed`, `IAdmission` to `lib/types.d.ts`.
  - Add embedded nurse logs + `admissionId` to `AttendanceSchema`.
  - Add `wardManagement`, `admissionManagement`, `attNursing`,
    `nursingDashboard` to `IRole`, `role.models.ts`, and `CreateRoleForm`
    (schema + interface + admin preset + a new checkbox group).
  - _Requirements: 1.1, 2.1, 3.1, 5.2, 5.3, 8.1, 8.3_

- [x] 2. Ward + bed actions and bed board UI
  - `ward.actions.ts` (create/get/update/delete + occupancy) and
    `bed.actions.ts` (create/getBedsByWard/getBedBoard/updateStatus/delete) with
    single-occupant invariant and delete guards.
  - Route `/dashboard/wards`: ward list w/ occupancy + bed board grouped by ward.
  - _Requirements: 1.1-1.4, 2.1-2.4_

- [x] 3. Admission actions + admissions UI + attendance header context
  - `admission.actions.ts`: `admitPatient`, `transferBed`, `dischargePatient`,
    `getActiveAdmissions`, `getAdmissionByAttendance`. Enforce no-double-active,
    bed vacancy, visitType flip to `inpatient`, bed occupy/free.
  - Replace the empty `/dashboard/admission` stub with admit/transfer/discharge
    UI + active-admissions list.
  - Attendance detail header shows ward/bed/admitted/day-count when admitted.
  - _Requirements: 3.1-3.5, 4.1-4.3, 5.5_

- [x] 4. Nurse tabs on the shared attendance
  - Extend `ConsultingPage.tsx` with `attNursing` gating and tabs: Nursing
    Notes, MAR, Intake/Output (append-only timestamped). Add backing actions in
    a `nursing.actions.ts` (or extend visit-clinical) that push embedded log
    entries. Vitals tab already exists.
  - _Requirements: 5.1-5.4_

- [x] 5. Nurse dashboard worklist
  - Route `/dashboard/nursing`: active inpatients (filter by ward) + the nurse's
    outpatient queue; rows deep-link to the attendance detail.
  - _Requirements: 6.1-6.4_

- [x] 6. Automatic bed-day billing + discharge finalization
  - `computeBedDays` + `syncBedChargeOnInvoice` (merge a bed-charge line onto the
    visit invoice via the invoice edit path, preserving items + payments).
  - Call on discharge and when billing/invoice is viewed. No ledger post.
  - _Requirements: 7.1-7.5, 4.4_

- [x] 7. Nav + roles wiring + final verification
  - Add nav entries (Wards/Bed board, Admissions, Nursing) gated by the new
    flags; confirm admin preset includes them.
  - Specialty-neutral copy sweep. Final tsc ≤ baseline, zero new in touched
    files; smoke-test `/dashboard/wards`, `/dashboard/admission`,
    `/dashboard/nursing`, `/dashboard/attendance/[id]`, `/dashboard/opd`.
  - _Requirements: 8.1-8.3, 9.1-9.5_

## Notes
- One source of truth per encounter: nurse + doctor edit the same Attendance;
  inpatient data lives on the Admission.
- Bed charge rule: whole-day accrual, each started day = 1 (documented, refinable).
- Cash-basis preserved: bed charges build the bill; income posts on payment.
- Reuse `can(flag)`, invoice sync, `withAuth` + History + trash patterns.

## Open questions resolved by the user (this session)
- Build scope: ALL phases (wards/beds + admission/discharge + nurse tabs +
  nurse dashboard + auto bed billing).
- Nurse edits the SHARED attendance (no separate nurse editing page).
- Bed charges accrue AUTOMATICALLY per day.
