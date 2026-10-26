# Requirements Document

## Introduction

The encounter workspace now has debounced auto-save, optimistic updates, and revalidation (the
`encounter-autosave` spec). However, the reused clinical tab components (HistoryTab, VitalsTab,
DiagnosisTab, etc.) only emit `onSave` from their own internal "Save" button — they do not emit a
continuous `onChange` as the clinician types. As a result, the per-tab Save button is still the
trigger that commits a change, so it cannot be removed without breaking persistence.

This feature makes every tracked clinical tab emit `onChange` as the user edits, so auto-save fires
on typing, and then removes the now-redundant per-tab Save buttons. The end state: a clinician types
and the section saves automatically (attributed, debounced), with the footer Save and Sign encounter
remaining as deliberate whole-record / finalize actions.

Vitals and History have already been converted as the reference implementation; this spec covers the
remaining tabs and the removal of the per-tab Save buttons, with full verification.

## Scope

**In scope:**
- Add an optional `onChange(data)` prop to each tracked clinical tab component that fires on every
  field edit (including list add/remove where applicable), plus an `autoSave` flag that hides the
  component's internal Save button.
- Wire each tab's wrapper to pass `onChange={(data) => autoSave(field, data)}` and `autoSave`, and
  keep flush-on-blur.
- Remove (hide) the per-tab Save buttons when auto-save is active.
- Components to convert: Dr's Notes, Nurse's Notes, Surgical Notes, Diagnosis, Physical Exam, Eye
  Test, Lab Report, Scan, Treatment Plan (the plan portion). Vitals and History are already done.

**Out of scope:**
- Changing the auto-save engine, debounce, optimistic/rollback, attribution/audit, historical mode,
  billing, or the footer Save / Sign encounter actions.
- Modifying the self-persisting panels (nursing, MAR, I/O, ICU, dental procedures) which already own
  their own persistence.
- Any data-model change.

## Decisions and Assumptions

- **D1 — onChange drives auto-save; per-tab Save buttons removed (confirmed).**
- **A1 — Additive props (assumption).** `onChange` and `autoSave` are optional props; the components
  keep working for any caller that does not pass them (the Save button shows only when `autoSave` is
  not set).
- **A2 — onChange fires with the full next section object** (not a partial), matching what the
  wrappers already pass to `autoSave`.
- **A3 — Debounce + no-op guard still apply**, so typing produces coalesced, meaningful saves only
  (same accepted version/audit volume tradeoff as `encounter-autosave`).

## Glossary

- **onChange tab:** a clinical tab component that emits its full data object on every edit.
- **autoSave flag:** a prop that tells the component auto-save is active, so it hides its internal
  Save button.
- **Per-tab Save button:** the Save button rendered inside each clinical tab component (being
  removed/hidden in favor of auto-save).

## Requirements

### Requirement 1: Tabs emit onChange on edit
**User Story:** As a clinician, I want each section to save as I type, so that I never have to click a
per-section Save button.

#### Acceptance Criteria
1. WHEN a field in a tracked clinical tab changes THEN the component SHALL call `onChange` with the
   full next section data object.
2. WHERE a tab has list-style edits (e.g. add/remove a secondary diagnosis) THEN `onChange` SHALL
   fire on each add and remove with the updated data.
3. WHEN `onChange` is not provided THEN the component SHALL behave as before (no error).

### Requirement 2: Per-tab Save buttons removed under auto-save
**User Story:** As a clinician, I want the redundant per-section Save buttons gone once auto-save is
active, so the interface is clean and unambiguous.

#### Acceptance Criteria
1. WHERE the `autoSave` flag is set THEN the component SHALL NOT render its internal Save button.
2. WHERE the `autoSave` flag is not set THEN the Save button SHALL still render (back-compatible).
3. WHEN the per-tab Save button is hidden THEN persistence SHALL still occur via `onChange` →
   auto-save, so no edit is lost.

### Requirement 3: Wrappers drive auto-save via onChange
**User Story:** As a developer, I want each wrapper to route the tab's onChange into the existing
auto-save hook, so persistence stays on one attributed path.

#### Acceptance Criteria
1. WHEN a tab emits `onChange` THEN its wrapper SHALL call `autoSave(field, data)` from
   `usePersistSection`.
2. WHEN the wrapper mounts the tab THEN it SHALL pass the `autoSave` flag to hide the internal Save
   button and SHALL keep flush-on-blur.
3. The wrapper SHALL NOT introduce a new persistence path; it SHALL reuse `saveClinicalSection` via
   the hook.

### Requirement 4: Preserve behavior and safety
**User Story:** As a developer, I want this change to preserve all existing guarantees.

#### Acceptance Criteria
1. The attribution/append-only semantics, audit log, historical read-only mode, billing, and the
   status-on-save guarantee SHALL be unchanged.
2. WHEN the visit is in historical mode THEN editing SHALL remain disabled (no onChange-driven save).
3. The footer Save (whole-record) and Sign encounter SHALL remain available and unchanged.
4. WHEN the feature ships THEN `npx tsc --noEmit` SHALL add no new errors in touched files, the pure
   and integration suites SHALL stay green, and the attendance route SHALL build.