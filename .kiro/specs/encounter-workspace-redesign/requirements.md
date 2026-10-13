# Requirements Document

## Introduction

The attendance / encounter workspace was rebuilt (attendance-encounter-workspace spec) into a
composed, role-gated set of tabs with a sticky patient header, lazy tab outlet, footer, historical
mode, and — via the clinical-attribution-audit spec — per-entry attribution and a gated audit log.
It is functionally complete, but its presentation is a flat horizontal tab strip that does not scale
well to the ~20 clinical sections a full encounter needs, and it lacks an at-a-glance overview and a
guided "ready to sign" workflow.

A reference design ("NOVACARE", in `.kiro/specs/hospital-encounter-module-design`) demonstrates a more
professional layout: a left **section rail** with completion checkmarks, an **Overview** dashboard, a
right-hand **clinical summary** rail (alerts + completion checklist), an attributed **timeline**, and a
**Sign encounter** action gated by a checklist.

This feature re-skins the EXISTING encounter workspace to that layout WITHOUT replacing the working
engine. All current behavior — the tab registry and its role gates, `saveClinicalSection` and the
append-only attribution, the audit log, historical mode, billing, and the status-on-save guarantee —
is preserved and simply re-presented. The reference app is a static mockup (hardcoded data, its own UI
kit); only its visual and layout design is adopted, rebuilt with this project's existing Radix-based
`components/ui` and Tailwind tokens.

## Scope

**In scope (visual re-skin only):**
- Replace the horizontal `TabNavigation` with a vertical **section rail** listing the currently
  registered, role-visible sections, each with an icon and a done-state indicator.
- Add an **Overview** section: reason-for-visit, critical allergy callout, latest vitals, active-
  problem/order summaries, and the encounter timeline — all driven by existing data.
- Add a right-hand **clinical summary** rail: encounter context, alerts (reusing the allergy banner /
  medical-alert data), and a **completion checklist**.
- Add a **Sign encounter** affordance that maps to the existing Complete-visit action, gated by the
  checklist (configurable, non-destructive).
- Restyle the patient header and footer to the reference look using existing `components/ui`.
- Keep the existing tab/section components rendering inside the new main content area.

**Out of scope (deferred to a later spec):**
- New clinical sections that do not exist today as data (Chief Complaint, Review of Systems, Triage,
  Care Plan, Follow-up) — these require model + save-path + attribution work and are a separate effort.
- Adopting the mockup's `@base-ui/react` / shadcn v4 stack or its token file.
- The mockup's Patients / Appointments / Billing / Reports management screens (those already exist as
  real routes in this app).
- Any change to clinical semantics, data contract, server actions, or role gating.

## Decisions and Assumptions

- **D1 — Engine preserved (confirmed).** The provider, tab registry + gates, `saveClinicalSection`,
  attribution/audit, historical mode, and billing are reused unchanged; only presentation changes.
- **D2 — Visual re-skin only (confirmed).** No new clinical data fields in this spec.
- **A1 — UI kit: existing Radix `components/ui` (assumption, override on review).** The look is
  reproduced with the project's current UI kit + Tailwind tokens; no new UI dependency.
- **A2 — Section rail is driven by the existing registry.** Sections shown are exactly the role-
  visible registered tabs plus Overview and the gated Audit Log; no section is invented.
- **A3 — "Done" state is derived, not stored.** A section shows a checkmark when its underlying data
  is present/attributed; this is computed from existing fields, not a new persisted flag.

## Glossary

- **Section rail:** the vertical, left-hand navigation listing encounter sections with icons and a
  per-section completion indicator (replaces the horizontal tab strip).
- **Overview:** the default landing section summarizing the encounter from existing data.
- **Clinical summary rail:** the right-hand panel showing encounter context, alerts, and the
  completion checklist.
- **Completion checklist:** a derived list of key documentation items with done/attention states that
  guides the clinician toward a complete encounter and gates Sign encounter.
- **Sign encounter:** the action that finalizes the visit; maps to the existing explicit Complete-
  visit server action (never a side effect of a plain save).
- **Done state:** a derived indicator that a section has data recorded (and attributed) for the visit.

## Requirements

### Requirement 1: Section rail navigation
**User Story:** As a clinician, I want a vertical section rail with clear completion indicators, so
that I can navigate a long encounter and see at a glance what is done and what remains.

#### Acceptance Criteria
1. WHEN the workspace renders THEN it SHALL present the role-visible registered sections in a vertical
   rail, each with its icon and label, replacing the horizontal tab strip.
2. WHERE a section has recorded data for the visit THEN the rail SHALL show a done indicator for it;
   otherwise it SHALL show a not-done indicator.
3. WHEN a clinician selects a section THEN the main content area SHALL show that section's existing
   component, and the active section SHALL be visually indicated.
4. WHERE the user's role hides a section (per the existing gates) THEN that section SHALL NOT appear
   in the rail.
5. WHEN the viewport is small THEN the rail SHALL remain usable (collapsible/toggler) without
   overflowing the page.

### Requirement 2: Overview section
**User Story:** As a clinician, I want an Overview that summarizes the encounter, so that I can
orient quickly without opening each section.

#### Acceptance Criteria
1. WHEN the workspace opens THEN the default active section SHALL be Overview.
2. WHEN Overview renders THEN it SHALL show, from existing data: the reason for visit, a critical
   allergy callout, the latest vitals, summaries of active problems/orders where available, and the
   encounter timeline.
3. WHERE a summarized datum is absent THEN Overview SHALL show an empty/placeholder state rather than
   fabricating data.
4. WHEN a clinician activates a summary link (e.g. open problem list) THEN the workspace SHALL
   navigate to the corresponding section.

### Requirement 3: Clinical summary rail
**User Story:** As a clinician, I want a persistent clinical summary with alerts and a completion
checklist, so that safety-critical context and remaining work stay visible as I document.

#### Acceptance Criteria
1. WHEN the workspace renders on a wide viewport THEN a right-hand clinical summary rail SHALL be
   shown with encounter context, alerts, and the completion checklist.
2. WHERE allergy or medical-alert data exists THEN the alerts SHALL reuse the existing allergy / medical-
   alert source (no new alert computation).
3. WHEN a checklist item's underlying data is present THEN that item SHALL show a done state; otherwise
   an attention state.
4. WHERE the viewport is narrow THEN the summary rail SHALL collapse or move without breaking layout.

### Requirement 4: Sign encounter gated by checklist
**User Story:** As a clinician, I want a Sign encounter action that is guided by a completion
checklist, so that visits are finalized deliberately and only when key documentation is present.

#### Acceptance Criteria
1. WHEN the clinician chooses Sign encounter THEN the system SHALL invoke the existing explicit
   Complete-visit action (not a plain save), preserving the status-on-save guarantee.
2. WHERE required checklist items are not satisfied THEN the UI SHALL surface which items remain and
   SHALL require explicit confirmation before signing (configurable; non-blocking vs blocking chosen
   at design, defaulting to warn-then-confirm).
3. WHEN the visit is in historical (read-only) mode THEN Sign encounter and all edit affordances SHALL
   be disabled, consistent with existing historical behavior.
4. WHEN signing succeeds THEN the UI SHALL reflect the completed status using the existing status
   display.

### Requirement 5: Preserve the existing engine and behavior
**User Story:** As a developer, I want the re-skin to reuse all existing logic, so that no clinical
behavior regresses.

#### Acceptance Criteria
1. WHEN sections render THEN they SHALL mount the existing tab/section components and server actions
   unchanged (same save, attribution, audit, billing paths).
2. The redesign SHALL NOT change the tab registry's role gates, the attribution/append-only semantics,
   the audit log gating, or the status-on-save guarantee.
3. WHEN a section is saved THEN attribution SHALL appear exactly as it does today (inline who/when).
4. WHEN historical mode is active THEN loading a previous visit and returning to current SHALL behave
   exactly as today.
5. The redesign SHALL NOT introduce a new UI-component dependency; it SHALL use the existing
   `components/ui` kit and Tailwind tokens.

### Requirement 6: Accessibility and responsiveness
**User Story:** As any user, I want the redesigned workspace to be keyboard-navigable and responsive,
so that it is usable across devices and with assistive technology.

#### Acceptance Criteria
1. WHEN navigating the section rail THEN it SHALL be fully keyboard-operable with clear focus states
   and appropriate roles/labels.
2. WHEN the layout adapts to small screens THEN the rail and summary panels SHALL collapse without
   loss of function.
3. WHEN alerts and done/attention indicators are shown THEN they SHALL not rely on color alone to
   convey meaning.
4. WHEN the theme is light or dark THEN the workspace SHALL render correctly in both.

### Requirement 7: Non-regression verification
**User Story:** As a developer, I want the redesign verified against the existing suite and build, so
that shipping it is safe.

#### Acceptance Criteria
1. WHEN the redesign is complete THEN `npx tsc --noEmit` SHALL introduce no new errors in touched
   files.
2. WHEN the test suite runs THEN the existing pure suite and the DB-backed integration suite SHALL
   remain green.
3. WHEN the app is built THEN the attendance encounter route SHALL compile and render without error.
4. WHEN a clinician uses the redesigned workspace THEN tab visibility per role, save-with-attribution,
   historical read-only, the audit log, and billing SHALL all behave as before.