# Requirements — Inpatient Management & Nursing

## Introduction

Today every clinical encounter is a single `Attendance` document edited on one
detail page, and `visitType` already includes `outpatient` / `inpatient` in its
enum — but nothing downstream distinguishes them. There are no wards, no beds,
no admission/discharge, and no nurse-specific workflow. The `admission` route is
an empty stub.

This feature adds inpatient management and a nursing workflow while keeping the
system's core principle intact: **one attendance record per encounter, shared by
doctor and nurse, differentiated by role-scoped tabs** — not separate pages that
would fork the record (the same anti-pattern we removed from billing).

Design pillars:
- Outpatient vs inpatient is driven by `attendance.visitType`.
- An **Admission** document hangs off the attendance for inpatient stays and
  carries ward, bed, admit/discharge data — the attendance is not forked.
- **Ward** and **Bed** are first-class entities so occupancy can be shown,
  double-booking prevented, and capacity reported.
- Nurses edit the **shared attendance** via nurse tabs gated by a new
  `attNursing` role flag; a **nurse dashboard/worklist** is a landing page that
  links into those records (not a parallel editor).
- Inpatient accrues an **automatic per-day bed charge** onto the visit invoice,
  integrating with the invoice-centric billing already built.

Specialty-neutral throughout (general hospital, not dental-only).

## Glossary
- **Admission**: an inpatient stay linked to one attendance.
- **Ward**: a physical unit (e.g. General, Private, ICU, Maternity) with beds.
- **Bed**: a single bed within a ward; at most one active occupant.
- **MAR**: Medication Administration Record — nurse log of doses given.
- **Bed-day**: one calendar day (or part) a bed is occupied, billed at the
  ward's daily rate.

---

## Requirement 1 — Ward management

**User story:** As an admin, I want to define wards so that beds and inpatients
can be organized by unit.

### Acceptance Criteria
1. WHEN an admin creates a ward THEN the system SHALL store name, type
   (general / private / semi-private / icu / maternity / pediatric / other),
   an optional daily rate, and active flag.
2. WHEN wards are listed THEN each SHALL show its bed count and current
   occupancy (occupied / total).
3. WHEN a ward with occupied beds is deactivated/deleted THEN the system SHALL
   prevent it (or require the beds be empty first) to avoid orphaning patients.
4. Ward management SHALL be gated by a role flag (`wardManagement`).

## Requirement 2 — Bed management & occupancy

**User story:** As a ward manager, I want to manage beds and see which are free
so that I can place incoming patients.

### Acceptance Criteria
1. WHEN a bed is created THEN it SHALL have a label/number, belong to a ward,
   and have status `vacant | occupied | maintenance` (default vacant).
2. A bed SHALL have at most one active occupant at any time; assigning an
   occupied bed SHALL be rejected.
3. WHEN a patient is admitted to a bed THEN the bed SHALL become `occupied`;
   WHEN discharged/transferred THEN the bed SHALL return to `vacant`.
4. A bed board SHALL show all beds grouped by ward with status and current
   patient (if any).

## Requirement 3 — Admission

**User story:** As a doctor/nurse, I want to admit a patient to a ward and bed
so that their inpatient stay is tracked.

### Acceptance Criteria
1. WHEN a patient is admitted THEN the system SHALL create an `Admission` linked
   to the patient and their attendance, recording admitting staff, ward, bed,
   `admittedAt`, optional expected discharge, reason, and status `admitted`.
2. WHEN an admission is created THEN the linked attendance `visitType` SHALL be
   set to `inpatient` and the chosen bed SHALL be marked occupied.
3. A patient SHALL NOT have two concurrent active admissions.
4. Admission SHALL be possible from the attendance detail (promote an existing
   visit to inpatient) and from a dedicated admission screen.
5. Admission SHALL be gated by a role flag (`admissionManagement`).

## Requirement 4 — Transfer & discharge

**User story:** As a nurse, I want to move a patient between beds and discharge
them so that bed state and stay records stay accurate.

### Acceptance Criteria
1. WHEN a patient is transferred THEN the old bed SHALL become vacant, the new
   bed occupied, and the admission SHALL record the new ward/bed (with history).
2. WHEN a patient is discharged THEN the admission status SHALL become
   `discharged`, `dischargedAt` set, the bed freed, and an optional discharge
   summary stored.
3. A discharged admission SHALL remain in the record for history and reporting;
   it SHALL NOT be deleted by discharge.
4. WHEN discharge occurs THEN outstanding bed-day charges SHALL be finalized on
   the invoice (see Requirement 7).

## Requirement 5 — Shared attendance, role-scoped nurse tabs

**User story:** As a nurse, I want to record nursing care on the same visit the
doctor uses so that there is one source of truth per encounter.

### Acceptance Criteria
1. Nurses and doctors SHALL edit the SAME `Attendance` record; no separate
   per-visit nurse editing page SHALL be introduced.
2. A new role flag `attNursing` SHALL gate nurse tabs on the attendance detail.
3. Nurse tabs SHALL include: Vitals (reuse existing), Nursing Notes,
   Medication Administration Record (MAR), and Intake/Output. Each SHALL append
   time-stamped entries (inpatient care is a timeline, not a single snapshot).
4. Nurse tabs SHALL be visible to users with `attNursing`; doctor-only tabs
   SHALL remain gated by their existing flags. The `can(flag)` pattern already
   in `ConsultingPage.tsx` SHALL be reused.
5. For inpatients the attendance detail header SHALL show admission context
   (ward, bed, admitted date, day count) when an active admission exists.

## Requirement 6 — Nurse dashboard / worklist

**User story:** As a nurse starting a shift, I want a worklist of my patients so
that I can see who needs attention.

### Acceptance Criteria
1. A nurse dashboard route SHALL list current inpatients (optionally filtered by
   ward), each row showing patient, ward/bed, admitting doctor, day of stay, and
   quick status (vitals due / meds due where modeled).
2. Each row SHALL deep-link to that patient's attendance detail (the shared
   editor), not to a separate page.
3. The dashboard SHALL also surface today's outpatient queue the nurse is
   assigned to (reuse existing attendance/OPD data) so nurses in clinics are
   served too.
4. The dashboard SHALL be gated by `attNursing` (or a `nursingDashboard` flag).

## Requirement 7 — Automatic bed-day billing

**User story:** As accounts, I want inpatient bed charges to accrue
automatically so that the invoice reflects the stay without manual entry.

### Acceptance Criteria
1. WHEN an inpatient stay spans one or more bed-days THEN the visit invoice
   SHALL carry a bed-charge line item priced at the ward's daily rate × days.
2. Bed-day charges SHALL be computed from `admittedAt` to now (ongoing) or to
   `dischargedAt` (discharged), using whole-day accrual (define rounding: each
   started day counts as one).
3. The bed charge SHALL be recomputed and synced onto the invoice at discharge,
   and on demand when the invoice/billing is viewed, reusing the invoice sync
   path from the billing feature.
4. Bed billing SHALL NOT post ledger income on its own; income still posts only
   when the patient pays (cash-basis invariant preserved).
5. WHEN a ward has no daily rate set THEN no bed charge SHALL be added (0).

## Requirement 8 — Navigation & roles

**User story:** As an admin, I want the new areas in the nav gated to the right
roles so that staff see only what they should.

### Acceptance Criteria
1. New role flags SHALL be added to `IRole`, the role model, and the role
   creation form: `wardManagement`, `admissionManagement`, `attNursing`
   (and optionally `nursingDashboard`).
2. Nav SHALL expose: Wards/Beds (bed board), Admissions, and a Nursing
   dashboard, each gated by the matching flag.
3. The admin role preset SHALL include the new flags.

## Requirement 9 — Non-regressive & specialty-neutral

### Acceptance Criteria
1. Outpatient flow SHALL be unchanged for users who do not use inpatient
   features; an outpatient visit SHALL never require ward/bed.
2. All copy SHALL be specialty-neutral.
3. TypeScript error count SHALL not exceed the current baseline; touched files
   SHALL introduce zero new errors.
4. All new routes SHALL compile (dev server returns redirect/200, not 500).
5. Cash-basis ledger invariant SHALL be preserved.
