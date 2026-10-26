# Implementation Plan — Hospital Modules

Each module is independently shippable. After every task: `npx tsc --noEmit`
(no new errors in touched files), `npm test` where new pure logic is added, and
a dev-server smoke test on new routes (redirect/200, not 500). New write actions
must be `withAuth`-gated and audited; new `History` actionTypes added to the
enum; new role flags wired into `IRole` + role model + `CreateRoleForm` + nav.
Do not commit/push unless asked.

Build order: patient-safety and most-common-missing first.

- [x] 1. Structured EMR (problems, allergies, immunizations) + allergy banner
  - Models/arrays, actions, UI on patient/attendance, safety banner. _Req: 7_
- [x] 2. Emergency / A&E (triage + board + disposition)
  - EmergencyCase model, triage/board/disposition actions, `/dashboard/emergency`,
    `emergencyManagement`. _Req: 1_
- [x] 3. CPOE unified orders + ICD-10 coding + allergy decision support
  - Unified order screen over lab/radiology/drug actions; order sets; ICD-10 on
    diagnosis; allergy-vs-drug warning. _Req: 8, 8b_
- [x] 4. Operating theatre / surgery scheduling (+ billing)
  - Theatre + SurgeryCase models, OR schedule, slot-conflict guard, pre/post-op,
    invoice line, `/dashboard/theatre`, `theatreManagement`. _Req: 2_
- [x] 5. Maternity / obstetrics (ANC, delivery, newborn)
  - AncRecord, DeliveryRecord, newborn → patient, `/dashboard/maternity`,
    `maternityManagement`. _Req: 3_
- [x] 6. ICU charting (time-stamped observations)
  - IcuChartEntry keyed to admission, timeline UI, `icuManagement`. _Req: 4_
- [x] 7. Blood bank & specimen tracking
  - BloodUnit + issue/crossmatch, Specimen lifecycle on lab orders,
    `/dashboard/blood-bank`, `bloodBankManagement`. _Req: 5_
- [x] 8. Referrals (in/out)
  - Referral model + workflow, `/dashboard/referrals`, `referralManagement`.
    _Req: 6_
- [x] 9. Document management (DMS) + consent archive
  - PatientDocument via upload pipeline, per-patient list + consent archive.
    _Req: 13_
- [x] 10. Queue management + bed-transfer approval
  - QueueTicket + display view; transfer approval step on admission. _Req: 12_
- [x] 11. Procurement (requisition → PO → GRN)
  - Requisition/PO/GRN models + approvals, stock on receipt, `/dashboard/
    procurement`, `procurementManagement`. _Req: 10_
- [x] 12. Equipment / biomedical assets + maintenance
  - Asset + MaintenanceRecord, due/overdue, `/dashboard/assets`, `assetManagement`.
    _Req: 11_
- [x] 13. HR & payroll (leave, attendance, payroll run)
  - LeaveRequest, Timesheet, PayrollRun (ledger expense), `/dashboard/hr`,
    `hrManagement` / `payrollManagement`. _Req: 9_

## Notes
- Reuse patient/attendance/invoice/counter/upload/authz/transaction infra.
- Each module ships with its role flag, nav entry, and audit actionTypes.
- Billing-affecting modules (theatre) post charges via the invoice sync path;
  payroll posts an expense to the ledger; cash-basis preserved.
- Interop (HL7/FHIR/DICOM/e-claims) is explicitly out of scope here.
