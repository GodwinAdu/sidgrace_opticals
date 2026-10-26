# Requirements Document

_Attendance / Encounter Workspace Rebuild_

## Introduction

The attendance detail screen (`app/(dashboard)/(routes)/dashboard/attendance/[attendantId]/page.tsx` →
`consulting-page-wrapper.tsx` → `ConsultingPage.tsx`) is the clinical heart of the application: the place
where a patient's visit is documented, orders are placed, nursing/ICU care is charted, and the visit bill is
reviewed. Today it is a single ~1,500-line client component holding ~20 role-gated tabs, a patient banner, an
allergy/medical-alert banner, admission context, a previous-visits loader, and a save flow. It works, but it
is hard to maintain, hard to extend, and has accumulated wiring gaps.

This spec rebuilds that screen into a modern, modular, fully-wired **encounter workspace** that is
multi-specialty (every existing tab retained, grouped and gated by role) without regressing any existing
behavior. The rebuild is a structured refactor: a shell + lazy-loaded tab modules with one clear state/save
model, not a from-scratch rewrite of the underlying clinical actions. All existing server actions, models, and
role flags remain the source of truth.

This document defines WHAT the rebuilt screen must do and — critically — what it must NOT regress. Design
(architecture/UX) and tasks follow in later phases.

## Glossary

- **Encounter / Visit** — one `Attendance` document for a patient on a date.
- **Workspace** — the rebuilt attendance detail screen as a whole (shell + banner + tabs + footer).
- **Shell** — the persistent frame: patient header, alert banner, admission context, previous-visit loader,
  tab navigation, and footer actions.
- **Tab module** — a self-contained panel for one area of the encounter (e.g. History, Vitals, Prescribe).
- **Section save** — saving one tab's data (currently updates local state and, for some tabs, the server).
- **Record save** — the footer "Save" that persists the aggregated attendance document.
- **Role gate** — an `IRole` boolean flag controlling tab/action visibility.
- **Historical view** — viewing a previous visit read-only within the same workspace.

## Requirements

### Requirement 1: Full tab parity (no clinical capability lost)

**User Story:** As a clinician, I want every tab I use today to still exist in the rebuilt workspace, so that
no part of my documentation workflow disappears.

#### Acceptance Criteria
1. The workspace SHALL retain every tab present today: History, Physical Exam, Diagnosis, Lab Report,
   Scan/Image, Dr's Notes, Nurse's Notes, Vitals, Plan & Follow-up (with Visit Procedures), Surgical Notes,
   Eye Test, Nursing Notes, Medication Administration (MAR), Intake/Output, ICU Chart, Dental Chart, Dental
   (SOAP) Notes, Perio, Imaging, Treatment Plan, Lab Case, Prescribe, and Billing summary.
2. Each tab SHALL preserve its current save/data contract with its existing server action or panel component
   (e.g. `VisitProceduresPanel`, `PrescriptionPanel`, nursing panels, `IcuChartPanel`, dental panels) with no
   change to those actions' signatures.
3. WHERE a tab has no patient linked to the visit, it SHALL show the existing "No patient linked to this
   visit." fallback rather than erroring.

### Requirement 2: Role-based grouping and gating (preserved and clarified)

**User Story:** As an administrator, I want each tab and action to remain visible only to roles permitted to
use it, so that access control is unchanged by the rebuild.

#### Acceptance Criteria
1. Tab visibility SHALL be driven by the existing `IRole` flags exactly as today: `attClinical`,
   `attLabScan`, `attEyeTest`, `attTreatment`, `attPrescribe`, `attBilling`, `attNursing`, and the ICU tab's
   `attNursing || icuManagement` rule.
2. WHEN no role is provided (legacy/admin context), the workspace SHALL show all tabs (current fail-open
   behavior preserved).
3. The default/active tab on load SHALL be the first tab the user is permitted to see (preserving the current
   `firstVisibleTab` resolution order).
4. Tabs SHALL be organized into clear visual groups (e.g. Clinical, Diagnostics, Nursing/Inpatient,
   Specialty/Dental, Orders, Billing) while keeping the exact same gating per tab.
5. The ICU Chart tab SHALL appear only when there is an active admission AND the user has `attNursing` or
   `icuManagement`, and SHALL be read-only for a user who has only `icuManagement` (recording requires
   `attNursing`) — matching current behavior.

### Requirement 3: Patient header, alert banner, and admission context

**User Story:** As a clinician, I want the patient's identity, safety alerts, and admission status always
visible, so that I have critical context at a glance throughout the encounter.

#### Acceptance Criteria
1. A patient header SHALL display name, patient ID, gender, age (from DOB), phone, blood type, and visit date,
   and SHALL remain accessible as the user scrolls (sticky/persistent).
2. The medical-alert banner SHALL merge structured allergies (via `getAllergiesByPatient` +
   `buildAllergyBanner`) with legacy free-text allergies and chronic conditions, and SHALL escalate styling to
   a "Severe Allergy Alert" when any structured allergy is severe — matching current logic.
3. WHEN the patient has an active admission, the header SHALL show the inpatient ward/bed and admitted
   day-count; otherwise it SHALL show the outpatient Admit action for an eligible visit (current `AdmitButton`
   behavior preserved).
4. The billing summary card in the header SHALL show previous outstanding (via `getPatientOutstanding`),
   current bill, and total balance due — unchanged from today.

### Requirement 4: One clear state and save model

**User Story:** As a clinician, I want saving to be predictable, so that I understand what is persisted and
when, and I never lose work or unexpectedly change the visit's status.

#### Acceptance Criteria
1. The workspace SHALL have a single documented state model: a shared encounter state updated by tab modules,
   with section-level updates and one record save, replacing the current ad-hoc mix.
2. The record save SHALL persist the aggregated attendance fields via `updateAttendance` and reflect the saved
   result back into the workspace state.
3. The record save SHALL NOT force the visit `status` to `completed` as an uncontrolled side effect; status
   transitions SHALL be explicit and intentional (fixing the current behavior where every save sets
   `status: "completed"`). The exact desired status semantics SHALL be defined in Design, but a plain Save of
   an in-progress visit SHALL NOT silently complete it.
4. Panels that own their own persistence today (nursing, ICU, prescriptions, procedures, dental panels,
   imaging) SHALL continue to persist through their own actions and SHALL NOT require the record save to
   function.
5. Billing-affecting panels (Visit Procedures, Dental Plan) SHALL continue to propagate billing changes to the
   header summary optimistically and reconcile with server-returned values — current `onBillingChange`
   behavior preserved.

### Requirement 5: Historical / previous-visit viewing (fixed and reliable)

**User Story:** As a clinician, I want to open a previous visit read-only and return to the current visit, so
that I can review history without risking edits to it.

#### Acceptance Criteria
1. The previous-visits control SHALL list prior visits (via `getPreviousVisitsByPatientId`), support filtering
   by date, and load a selected visit into the workspace (via `getAttendanceById`).
2. WHEN a previous visit is loaded, the workspace SHALL enter a read-only historical mode in which all tab
   inputs and the record save are disabled, and a clear "Historical View" indicator is shown.
3. The historical mode flag SHALL be correctly set when a previous visit is loaded and cleared on "Return to
   Current Visit" (fixing the current gap where `isViewingHistorical` is never set true by the wrapper).
4. Returning to the current visit SHALL restore the original current-visit data without a full page reload.

### Requirement 6: Modular, performant architecture

**User Story:** As a developer, I want the workspace split into a shell plus independent tab modules, so that
the screen is maintainable and loads efficiently.

#### Acceptance Criteria
1. The monolithic component SHALL be decomposed into a shell component plus one module per tab (or cohesive
   group), each in its own file.
2. Tab module content SHALL be code-split / lazy-loaded so that inactive tabs do not all execute their data
   fetching on initial render; the active (default) tab SHALL render immediately.
3. Shared concerns (role gating helper, encounter state, billing propagation, historical mode) SHALL live in
   clearly named shared units reused by modules rather than duplicated.
4. The decomposition SHALL NOT change the public data contract of the route page or the wrapper's inputs
   (`initialAttendance`, `previousVisits`, `role`, `admission`).

### Requirement 7: Modern, professional, accessible UX

**User Story:** As any user, I want the workspace to feel modern, clear, and usable on different screen sizes
and with assistive tech, so that documentation is fast and comfortable.

#### Acceptance Criteria
1. The layout SHALL be responsive, with the many tabs remaining navigable on small screens (e.g. scrollable /
   grouped navigation) without horizontal page overflow.
2. Interactive elements SHALL be keyboard-navigable and SHALL expose accessible names/roles (tabs, buttons,
   inputs, the alert banner), following the project's accessibility conventions.
3. Visual grouping, spacing, and status cues (visit status, historical, billing balance, severe-allergy
   escalation) SHALL be consistent and legible in both light and dark themes.
4. Loading and saving states SHALL be clearly indicated (per-section and for the record save), and transient
   failures SHALL surface a non-blocking toast as today.
5. Full WCAG conformance is NOT claimed by this spec; it SHALL follow accessible patterns, with final
   conformance requiring manual assistive-technology testing outside this scope.

### Requirement 8: Non-regression and verification

**User Story:** As a maintainer, I want confidence that the rebuild changed structure and UX without breaking
behavior or the wider app, so that the central screen stays trustworthy.

#### Acceptance Criteria
1. TypeScript errors SHALL NOT increase in touched files (`npx tsc --noEmit`), consistent with the project's
   existing baseline policy.
2. The attendance detail route SHALL compile and render (redirect/200, not 500) under the existing auth gate.
3. All existing server actions, Mongoose models, and `IRole` flags SHALL remain the source of truth; this
   rebuild SHALL NOT introduce new role flags or new `History` action types unless a later-approved
   requirement explicitly adds a capability.
4. Any pure logic extracted during the rebuild (e.g. tab-visibility resolution, billing roll-up, historical
   state transitions) SHALL have Vitest unit tests.
5. The existing allergy-banner helper and its tests SHALL continue to pass unchanged.

### Requirement 9: Footer actions (print / export / save)

**User Story:** As a clinician, I want the record-level actions available and honest about what they do, so
that I can save and (eventually) produce a printable record.

#### Acceptance Criteria
1. The footer SHALL retain the Save action (disabled in historical/read-only mode) with clear saving/disabled
   states.
2. The Print Record and Export PDF actions SHALL either be wired to a working implementation OR be clearly
   presented as not-yet-available (no dead buttons that silently do nothing); the chosen approach SHALL be
   decided in Design.

## Out of Scope

- Changing the underlying clinical server actions, Mongoose schemas, or billing/ledger logic beyond the
  status-on-save fix in Requirement 4.3.
- Adding new clinical capabilities or new modules (the 13 hospital modules are already built).
- Healthcare interoperability (HL7/FHIR/DICOM/e-claims).
- Changing OPD check-in (`createAttendance`) behavior, including the auto consultation fee and visit-invoice
  creation.
- New role flags or new audit action types.


