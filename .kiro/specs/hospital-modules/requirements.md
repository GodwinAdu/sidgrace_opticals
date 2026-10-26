# Requirements — Hospital Modules (Clinical + Operational)

## Introduction

Medira has a solid HMS core (OPD, inpatient, pharmacy, lab/radiology orders,
invoice-centric billing, inventory, scheduling, roles/authz, ops dashboard).
To become a full general-hospital system it needs additional clinical
departments and back-office modules. This spec covers twelve modules, each
independently shippable and consistent with existing patterns (Mongoose models,
`withAuth`-gated server actions, `History` audit, role flags, specialty-neutral
UI, invoice-centric billing where charges arise).

Build order is risk/value-ordered in tasks.md. Each module reuses existing
infrastructure (patient, attendance, invoice, counter, upload, authz) rather
than duplicating it.

## Glossary
- **CPOE**: Computerized Provider Order Entry — a unified order surface.
- **GRN**: Goods Received Note (procurement receiving step).
- **ANC**: Antenatal Care. **Triage**: emergency severity sorting.

---

## Requirement 1 — Emergency / A&E
**User story:** As ER staff, I want triage and an emergency board so that the
sickest patients are seen first.
### Acceptance Criteria
1. An emergency visit SHALL capture a triage level (e.g. ESI 1-5 or
   immediate/urgent/standard) and chief complaint, linked to the patient and an
   attendance.
2. An ER board SHALL list active cases sorted by triage severity then arrival.
3. ER cases SHALL support assignment to a bay/space and a disposition
   (admit / discharge / refer / transfer), feeding admission or OPD as needed.
4. Gated by a new `emergencyManagement` role flag.

## Requirement 2 — Operating theatre / surgery
**User story:** As a surgical team, I want to schedule and record theatre cases.
### Acceptance Criteria
1. A surgery booking SHALL capture patient, procedure, surgeon(s), theatre/room,
   scheduled date/time, and status (scheduled → in-progress → completed /
   cancelled).
2. An OR schedule view SHALL show bookings per theatre per day and prevent
   double-booking a theatre slot.
3. Pre-op and post-op notes SHALL be recordable against the case.
4. Completed surgery SHALL be billable onto the patient's invoice.
5. Gated by `theatreManagement`.

## Requirement 3 — Maternity / obstetrics
**User story:** As maternity staff, I want ANC, delivery and newborn records.
### Acceptance Criteria
1. An ANC record SHALL track visits, gestational age, and key observations over
   a pregnancy episode.
2. A delivery record SHALL capture mode, outcome, and link mother to newborn(s).
3. A newborn SHALL be registrable (optionally creating a patient record).
4. Gated by `maternityManagement`.

## Requirement 4 — ICU charting
**User story:** As ICU staff, I want frequent structured charting.
### Acceptance Criteria
1. An ICU chart SHALL record time-stamped observations (vitals, ventilator
   settings, GCS, fluids) against an admission.
2. Entries SHALL be append-only and viewable as a timeline.
3. Gated by `icuManagement` (or reuse `attNursing` for recording).

## Requirement 5 — Blood bank & specimen tracking
**User story:** As lab/blood-bank staff, I want to track blood units and specimens.
### Acceptance Criteria
1. Blood units SHALL be registrable with group, component, expiry, and status
   (available / reserved / issued / discarded).
2. A crossmatch/issue SHALL reserve/issue a unit to a patient.
3. Lab specimens SHALL have a tracked lifecycle (collected → in-transit →
   received → processed) linked to a lab order.
4. Gated by `bloodBankManagement` / reuse `labManagement` for specimens.

## Requirement 6 — Referrals (in/out)
**User story:** As a clinician, I want to refer patients in and out.
### Acceptance Criteria
1. A referral SHALL capture direction (in/out), from/to facility or provider,
   reason, and status (pending → accepted/declined → completed).
2. Referrals SHALL be linked to the patient and (optionally) a visit.
3. Gated by `referralManagement`.

## Requirement 7 — Structured EMR: problems, allergies, immunizations
**User story:** As a clinician, I want longitudinal structured clinical data.
### Acceptance Criteria
1. A patient SHALL have a structured **problem list** (condition, status
   active/resolved, onset), **allergy list** (substance, reaction, severity),
   and **immunization record** (vaccine, date, dose) — distinct from the
   existing free-text fields, which remain for back-compat.
2. These lists SHALL be viewable on the patient/attendance and editable by
   permitted roles.
3. Allergies SHALL surface as a safety banner on the attendance (reuse existing
   banner where present).
4. Gated by `clinicalManagement`.

## Requirement 8 — CPOE (unified orders + basic decision support)
**User story:** As a clinician, I want one place to place all orders.
### Acceptance Criteria
1. A unified order surface SHALL let a clinician place lab, radiology, and drug
   orders from one screen, delegating to the existing lab-order and prescription
   actions.
2. Order sets (named bundles) SHALL be selectable to place multiple orders at
   once.
3. Basic decision support SHALL warn on a known patient allergy when prescribing
   a matching drug (uses the structured allergy list).
4. Gated by existing clinical/prescribe flags.

## Requirement 8b — Clinical coding (ICD-10)
**User story:** As a clinician/coder, I want coded diagnoses.
### Acceptance Criteria
1. Diagnoses SHALL support an optional ICD-10 code + description alongside the
   existing free-text, from a searchable code list.
2. Coding SHALL not be mandatory (back-compatible).

## Requirement 9 — HR & payroll
**User story:** As HR, I want leave, attendance and payroll.
### Acceptance Criteria
1. Staff leave requests SHALL have a type, date range, and approval workflow
   (pending → approved/rejected).
2. Staff time/attendance SHALL be recordable (clock-in/out or daily entries).
3. A basic payroll run SHALL compute pay per staff for a period from salary +
   adjustments and post the expense to the ledger.
4. Gated by `hrManagement` / `payrollManagement`.

## Requirement 10 — Procurement / supply chain
**User story:** As stores/procurement, I want requisition → PO → GRN.
### Acceptance Criteria
1. A requisition SHALL be raised and approved before a purchase order.
2. A purchase order SHALL be issued to a supplier (reuse existing supplier +
   purchase where possible) and received via a GRN that updates stock.
3. Approvals SHALL be role-gated; the flow SHALL be auditable.
4. Gated by `procurementManagement` (and existing `inventoryManagement`).

## Requirement 11 — Equipment / biomedical assets
**User story:** As biomedical staff, I want an asset register and maintenance.
### Acceptance Criteria
1. Assets SHALL be registrable (name, tag, location/ward, status).
2. Maintenance schedules and service records SHALL be trackable, with due/overdue
   status.
3. Gated by `assetManagement`.

## Requirement 12 — Queue management & bed-transfer approvals
**User story:** As floor staff, I want queues/tokens and controlled transfers.
### Acceptance Criteria
1. OPD/pharmacy/lab queues SHALL issue a token/number and show a called/serving
   state suitable for a display screen.
2. Bed transfers SHALL support an approval step before the move completes
   (extends the existing transfer flow).
3. Gated by existing OPD/attendance/admission flags.

## Requirement 13 — Document management (DMS)
**User story:** As staff, I want to attach and retrieve patient documents.
### Acceptance Criteria
1. Documents (scanned records, signed consents, uploads) SHALL be stored via the
   existing upload pipeline and listed per patient with type and date.
2. Signed consent archive SHALL be retrievable from the patient record.
3. Gated by `clinicalManagement` / `patientManagement`.

## Requirement 14 — Non-regressive (all modules)
### Acceptance Criteria
1. TypeScript errors SHALL not rise in touched files (baseline held).
2. New routes SHALL compile (redirect/200, not 500).
3. New write actions SHALL be `withAuth`-gated with an appropriate flag and
   audited via `History` (actionType added to the enum).
4. Charges SHALL flow onto the invoice-centric billing; ledger stays cash-basis.
5. New role flags SHALL be added to `IRole`, the role model, and the role form.
