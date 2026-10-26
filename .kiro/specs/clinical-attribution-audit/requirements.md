# Requirements Document

## Introduction

The attendance / encounter workspace is where multiple clinicians (several doctors, several
nurses, and other staff) document a single patient visit. Today the record captures *what* was
written but not reliably *who* wrote it or *when*: the embedded nursing-style records store an
author id that is never surfaced in the UI, and the single free-text clinical fields
(`doctorNote`, `nurseNote`, `surgicalNote`) and the structured sections (`history`, `physicExam`,
`diagnosis`, `plan`, `eyeTest`, `vitals`) carry no per-author attribution at all — a save only
stamps one `updatedBy` on the whole document, so when two clinicians touch the same visit it is
impossible to tell who recorded which piece of clinical content.

This feature makes clinical documentation professionally attributable and auditable: every clinical
entry on a visit records who authored it and when, clinical content is **append-only** (edits create
new immutable versions rather than overwriting), and an authorised user can review a per-visit
**audit log** showing the full who/what/when history of the encounter.

The feature builds on existing infrastructure: the `withAuth` wrapper that already injects an
authenticated `user` into every server action, the embedded per-entry attribution fields that
already exist (`authoredBy` / `givenBy` / `recordedBy`), and the application-wide `History` audit
model (`performedBy`, `timestamp`, `entityId`, `entityType`, `details`, `actionType` enum).

## Scope

**In scope (target: everything clinical on the visit):**
- Free-text notes: `doctorNote`, `nurseNote`, `surgicalNote`.
- Structured sections: `history`, `physicExam`, `diagnosis`, `plan`, `eyeTest`, `vitals`.
- Self-persisting records already carrying attribution: `nursingNotes`, `medicationAdmin`,
  `intakeOutput`, dental records (`dentalNotes`, `perioExam`, `dentalImaging`, `dentalProcedures`),
  ICU chart entries, and orders (prescribe / lab / imaging) as recorded on the visit.
- A per-visit clinical audit log view.

**Out of scope (unless later promoted):**
- Changing the clinical content/semantics of any tab.
- Cross-visit or patient-level longitudinal audit reporting (this is per-visit).
- E-signature / legal signing workflows.

## Decisions & Assumptions

- **D1 — Edit model: append-only versions (confirmed).** Each save of a tracked clinical field
  creates a new immutable version; prior versions are retained, never overwritten or deleted.
- **D2 — Scope: everything clinical on the visit (confirmed).**
- **A1 — Audit visibility: restricted (assumption, override on review).** The audit log tab/view is
  limited to admin or a dedicated audit-view permission (e.g. an `auditView` role flag). Normal
  clinicians still see inline "who/when" attribution on entries, but not the full audit tab.
- **A2 — Existing data: leave as-is (assumption, override on review).** Attribution begins from
  rollout; pre-existing content with no recorded author is displayed as "author unknown". No data
  migration/backfill is performed.

## Glossary

- **Attribution:** the recorded pairing of a clinical write with the staff member who made it and the
  server timestamp of the write.
- **Tracked clinical field:** any note, structured section, or self-persisting record listed in Scope
  whose writes are attributed and versioned.
- **Version:** an immutable snapshot of a tracked field's content at the moment of a save, carrying
  its author and timestamp.
- **Append-only:** a storage rule where new versions are added and prior versions are never
  overwritten or deleted.
- **Audit log:** the per-visit, read-only, reverse-chronological list of clinical write events (who /
  what / when).
- **Audit-view permission:** the role flag that gates access to the audit log (restricted access).
- **Author unknown:** the display value for content whose author cannot be resolved (e.g. legacy
  data recorded before this feature).

## Requirements

### Requirement 1: Author and timestamp capture on every clinical write
**User Story:** As a clinic administrator, I want every clinical entry on a visit to record the
staff member who wrote it and the exact time, so that accountability is unambiguous when multiple
clinicians document the same patient.

#### Acceptance Criteria
1. WHEN any tracked clinical field (notes, structured sections, or self-persisting records) is
   written THEN the system SHALL record the authenticated staff id and a server-generated timestamp
   for that write.
2. WHERE the author is taken from the authenticated `user` injected by `withAuth`, the system SHALL
   NOT trust any author id supplied by the client.
3. IF a write is attempted without an authenticated user THEN the system SHALL reject the write and
   SHALL NOT persist partial clinical content.
4. WHEN the server generates the attribution timestamp THEN it SHALL use server time, not
   client-supplied time.

### Requirement 2: Append-only versioning of clinical content
**User Story:** As a clinician, I want edits to clinical content to be preserved as versions rather
than overwriting the previous text, so that the record reflects the true sequence of documentation
and nothing is silently lost.

#### Acceptance Criteria
1. WHEN a tracked clinical field is saved with changed content THEN the system SHALL append a new
   immutable version carrying the author, timestamp, and the new content.
2. The system SHALL NOT overwrite or delete any previously recorded version of a tracked field.
3. WHEN the workspace displays a tracked field THEN it SHALL show the latest version as the current
   value.
4. WHEN a save is submitted whose content is identical to the current latest version THEN the system
   SHALL NOT create a redundant new version.
5. WHERE a self-persisting record is already append-only (e.g. `nursingNotes`) THEN the system SHALL
   treat each existing entry as a version and SHALL preserve its existing attribution semantics.

### Requirement 3: Inline attribution display
**User Story:** As a clinician reviewing a visit, I want to see who recorded each piece of clinical
content and when, directly on the relevant tab, so that I can understand the record without opening
a separate audit screen.

#### Acceptance Criteria
1. WHEN a tracked entry is displayed THEN the UI SHALL show the author name, the author role or
   title, and the time it was recorded (e.g. "Dr. Jane Doe (Ophthalmologist) - 14:32, 13 Oct").
2. WHERE a user has normal clinical access to the visit THEN the inline attribution SHALL be visible
   to that user, so practitioners can see who recorded each entry without the restricted audit log.
3. WHERE the author of a historical entry cannot be resolved THEN the UI SHALL display "author
   unknown" rather than a blank or a raw id; WHERE the author role cannot be resolved THEN the role
   or title SHALL be omitted rather than shown blank.
4. WHEN a field has multiple versions THEN the UI SHALL indicate that earlier versions exist and
   SHALL allow an authorised user to view them.
5. The inline attribution SHALL be read-only and SHALL NOT be editable by any clinician.

### Requirement 4: Per-visit clinical audit log
**User Story:** As an authorised auditor or administrator, I want a per-visit audit log that lists
every clinical action on the visit — who, what, when — so that I can review the complete history of
the encounter for quality and compliance.

#### Acceptance Criteria
1. WHEN an authorised user opens the visit audit log THEN the system SHALL list all clinical write
   events for that visit in reverse-chronological order.
2. WHEN an audit entry is shown THEN it SHALL display the actor name, the action or field affected,
   the timestamp, and a reference to the version or entry created.
3. WHEN the audit log is rendered THEN it SHALL be read-only, and no entry SHALL be editable or
   deletable from this view.
4. WHERE the number of events is large THEN the audit log SHALL remain responsive (paginated or
   virtualised) and SHALL NOT block the rest of the workspace from loading.

### Requirement 5: Access control for the audit log
**User Story:** As a clinic administrator, I want the full audit log restricted to authorised roles,
so that sensitive change history is not broadly exposed while routine attribution stays visible.

#### Acceptance Criteria
1. WHERE a user lacks the audit-view permission THEN the system SHALL NOT display the audit log tab
   or its data to that user.
2. WHEN audit data is requested THEN the server SHALL enforce the audit-view permission regardless of
   UI state.
3. WHILE audit visibility is restricted THEN inline attribution (Requirement 3) SHALL remain visible
   to clinicians with normal access to the visit.
4. IF the audit-view permission is not configured for any role THEN the system SHALL fail closed for
   the audit log.

### Requirement 6: Non-regression and data-contract safety
**User Story:** As a developer, I want attribution and versioning added without breaking the existing
encounter workspace or its data contract, so that the rebuilt workspace keeps working.

#### Acceptance Criteria
1. WHEN the feature is deployed THEN existing visits SHALL continue to load and render without error.
2. WHERE existing content has no attribution THEN the system SHALL treat it as "author unknown" and
   SHALL NOT fail validation.
3. WHEN existing tabs are rendered THEN the change SHALL NOT alter their clinical meaning or layout
   beyond adding attribution display and version access.
4. WHEN the save paths are changed THEN the status-on-save behavior (a plain Save never completes a
   visit) SHALL be preserved.
5. WHEN attribution and audit are implemented THEN the system SHALL reuse the existing `History`
   audit model and `withAuth` user injection rather than introducing a parallel mechanism.

### Requirement 7: Accuracy and integrity of the trail
**User Story:** As an auditor, I want the audit trail to be tamper-evident and accurate, so that it
is trustworthy evidence of what happened.

#### Acceptance Criteria
1. The system SHALL NOT expose any application API that edits or deletes a recorded version or audit
   entry through normal flows.
2. WHEN concurrent saves occur on the same visit THEN each SHALL be recorded as its own attributed
   version without losing either write.
3. WHEN a clinical write succeeds THEN its audit entry SHALL be written atomically with, or
   immediately following (best-effort and logged), the clinical write.


