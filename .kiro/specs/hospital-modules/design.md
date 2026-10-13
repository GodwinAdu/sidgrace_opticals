# Design — Hospital Modules

## Overview
Twelve modules added on the existing Medira core. Each follows the house pattern:
Mongoose model + `ITypes` in `lib/types.d.ts`, `withAuth`-gated server actions,
`History` audit (new actionTypes in `history.models.ts`), a role flag wired into
`IRole` + role model + `CreateRoleForm`, a route under `app/(dashboard)/(routes)/
dashboard/...`, a nav entry, and billing via the invoice-centric path where
charges arise. Reuse: patient, attendance, invoice/payment, counter
(`nextSequence`), upload pipeline, authz, transaction helper.

## Shared conventions
- New collections link to `patientId` and (where relevant) `attendanceId`.
- Numbered documents (surgery, referral, etc.) use `nextSequence(key)`.
- Charges call the invoice sync path (same as procedures/bed charges).
- Reads are auth-only; writes are permission-gated; multi-doc ops use
  `runInTransaction` where atomicity matters.

## Module designs (concise)

### 1. Emergency / A&E
- Model `EmergencyCase`: patientId, attendanceId, triageLevel, chiefComplaint,
  bay, status, disposition, arrivedAt. Actions: triage/create, board list
  (sorted severity+arrival), assign bay, set disposition (→ admit/OPD/refer).
  Route `/dashboard/emergency`. Flag `emergencyManagement`.

### 2. Operating theatre
- Models `Theatre` (room), `SurgeryCase` (patient, procedureId, surgeons[],
  theatreId, scheduledAt, status, preOpNote, postOpNote, cost). Prevent slot
  double-book. Completed case → invoice line. Route `/dashboard/theatre`.
  Flag `theatreManagement`.

### 3. Maternity
- Models `AncRecord` (pregnancy episode + visits[]), `DeliveryRecord`
  (mode, outcome, babies[]). Newborn registration can create a Patient.
  Route `/dashboard/maternity`. Flag `maternityManagement`.

### 4. ICU charting
- Embed/collection `IcuChartEntry` keyed to admissionId: time-stamped vitals /
  vent settings / GCS / fluids, append-only timeline. Surface on the admitted
  patient. Reuse `attNursing` + new `icuManagement`.

### 5. Blood bank & specimens
- Model `BloodUnit` (group, component, expiry, status) + issue/crossmatch to a
  patient. `Specimen` lifecycle linked to a `LabOrder`. Route
  `/dashboard/blood-bank`. Flags `bloodBankManagement`, reuse `labManagement`.

### 6. Referrals
- Model `Referral` (direction, from/to, reason, status) linked to patient/visit.
  Route `/dashboard/referrals`. Flag `referralManagement`.

### 7. Structured EMR
- Models `Problem`, `Allergy`, `Immunization` (patientId-scoped, longitudinal),
  OR embed structured arrays on Patient. Allergy banner reuses the existing
  attendance banner. Flag `clinicalManagement`.

### 8. CPOE + ICD-10
- A unified order screen composing existing `createLabOrder` +
  `createPrescription` + radiology; named `OrderSet` bundles. Allergy check:
  on prescribe, compare drug against the structured allergy list and warn.
- Diagnosis gains optional `icd10Code`/`icd10Desc`; a searchable ICD-10 lookup
  (seed a common subset or a static list). Back-compatible with free-text.

### 9. HR & payroll
- Models `LeaveRequest` (type, range, status, approver), `Timesheet`/attendance
  entries, `PayrollRun` (period, lines per staff, totals). Payroll run posts an
  expense via `postLedgerEntry`. Routes under `/dashboard/hr`. Flags
  `hrManagement`, `payrollManagement`.

### 10. Procurement
- Models `Requisition` (items, approval), `PurchaseOrder` (reuse supplier), `Grn`
  (receipt → stock increment). Approval gates. Reuse inventory. Route
  `/dashboard/procurement`. Flag `procurementManagement`.

### 11. Equipment / assets
- Model `Asset` (tag, location, status) + `MaintenanceRecord` (schedule, due,
  serviced). Due/overdue computed. Route `/dashboard/assets`. Flag
  `assetManagement`.

### 12. Queue & transfer approvals
- Model `QueueTicket` (service, number, status called/serving/done) for a
  display view. Bed transfer gains a `pending-approval` state + approve step
  on the existing admission transfer. Route `/dashboard/queue`.

### 13. Document management
- Model `PatientDocument` (patientId, type, url via upload pipeline, note). List
  per patient; consent archive view. Reuse `uploadFile`. Flag `clinicalManagement`.

## Testing strategy
Per module: `npx tsc --noEmit` (no new errors in touched files), dev-server
smoke test on new routes (redirect/200), and Vitest unit tests for any new pure
logic (e.g. payroll math, triage ordering, slot-conflict check).

## Decisions / trade-offs
- Separate collections per module (not one giant document) for query/report
  clarity and independent shipping.
- Reuse existing billing/upload/authz rather than re-implement.
- ICD-10/coding kept optional and additive (no destructive change to diagnosis).
- Full interop (HL7/FHIR/DICOM/PACS) and e-claims remain OUT of scope here —
  these modules add the hospital workflows, not external-system integration.

## Out of scope (separate future effort)
HL7/FHIR, DICOM/PACS viewer, NHIS e-claims integration, MFA/SSO, multi-tenant
isolation, DHIS2/statutory report exports.
