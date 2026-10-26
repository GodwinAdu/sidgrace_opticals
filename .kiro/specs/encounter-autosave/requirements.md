# Requirements Document

## Introduction

The encounter workspace persists tracked clinical sections (doctorNote, nurseNote, surgicalNote,
history, physicExam, diagnosis, plan, eyeTest, vitals, labReport, scan) via the attributed,
append-only `saveClinicalSection` action: each save appends an immutable version (author + server
time) and writes a `History` audit entry. Today a section is persisted when the clinician clicks the
tab's Save button (via `usePersistSection`).

This feature adds **auto-save** (debounced, persists on change), **optimistic UI** (the edit shows
immediately and rolls back on failure), and **revalidation** (fresh data after each write), so
clinicians never lose work and the UI feels instant.

**Accepted tradeoff (explicit user decision):** full auto-save appends an attributed version and a
History audit entry for each debounced change. The product owner has accepted that this produces
multiple versions per note and a busier audit log; the `isMeaningfulChange` no-op guard still
prevents truly-identical re-saves, and a sensible debounce limits write frequency, but intermediate
typing WILL be versioned and audited. This is a deliberate choice, documented here.

## Scope

**In scope:**
- Debounced auto-save of tracked clinical sections through the existing `saveClinicalSection` action.
- Optimistic local update on change, with rollback to the last server-confirmed value on failure.
- Revalidation of the attendance route after each successful write (already performed by the action;
  this spec ensures the path is always passed and state stays fresh).
- A visible save-state indicator (saving / saved / error) per section or globally.
- Flush of a pending debounce on blur, section change, explicit Save, Sign encounter, and unmount so
  no in-flight edit is lost.

**Out of scope:**
- Changing the append-only/attribution semantics, the audit model, role gating, historical mode, or
  billing.
- Draft-vs-commit batching (explicitly NOT chosen; full auto-save was selected).
- Auto-signing or any status change from auto-save (status-on-save guarantee preserved).
- Real-time multi-user sync / conflict resolution beyond last-write-wins append.

## Decisions and Assumptions

- **D1 — Full auto-save (confirmed).** Each debounced change persists via `saveClinicalSection`,
  appending an attributed version + audit entry.
- **D2 — Optimistic + revalidate (confirmed).** The UI updates before the server confirms and rolls
  back on error; each write revalidates the route.
- **A1 — Debounce interval (assumption, override on review): ~1500 ms** of inactivity before an
  auto-save fires, to limit version/audit volume while staying responsive.
- **A2 — Historical mode never auto-saves.** Read-only visits are untouched.
- **A3 — Auto-save never changes status.** Only the explicit Sign/Complete action completes a visit.

## Glossary

- **Auto-save:** debounced persistence of a section's current content without an explicit Save click.
- **Debounce:** waiting for a quiet interval after the last change before persisting.
- **Optimistic update:** reflecting the edit in the UI immediately, before the server confirms, and
  reverting if the write fails.
- **Flush:** forcing any pending debounced save to run now (on blur, section change, save, sign,
  unmount).
- **Save state:** the per-section/global indicator — idle, saving, saved, or error.

## Requirements

### Requirement 1: Debounced auto-save of tracked sections
**User Story:** As a clinician, I want my clinical entries to save automatically as I work, so that I
never lose documentation if I navigate away or get interrupted.

#### Acceptance Criteria
1. WHEN a tracked section's content changes AND a quiet interval elapses THEN the system SHALL persist
   it via the existing `saveClinicalSection` action (append-only, attributed).
2. WHEN multiple changes occur within the debounce interval THEN the system SHALL persist only once
   after the quiet interval (not once per keystroke).
3. WHERE the new content is identical to the latest version THEN the system SHALL NOT create a new
   version (the existing no-op guard still applies).
4. WHEN the visit is in historical (read-only) mode THEN auto-save SHALL NOT fire.
5. WHEN auto-save persists THEN the author and timestamp SHALL come from the server session, never the
   client, and the status SHALL be unchanged.

### Requirement 2: Optimistic update with rollback
**User Story:** As a clinician, I want my edits to appear instantly, so that the workspace feels
responsive even on a slow connection.

#### Acceptance Criteria
1. WHEN a section changes THEN the UI SHALL reflect the new content immediately, before the server
   confirms.
2. WHEN an auto-save or explicit save fails THEN the UI SHALL roll back to the last server-confirmed
   value for that section and surface an error state.
3. WHEN a save succeeds THEN the server-returned value and versions SHALL reconcile into state (the
   attributed version + inline attribution appear).
4. WHILE a save is in flight THEN the UI SHALL remain editable and SHALL coalesce further changes into
   the next debounced save.

### Requirement 3: Revalidation and freshness
**User Story:** As a clinician, I want the record to stay fresh after writes, so that what I see
matches what is stored.

#### Acceptance Criteria
1. WHEN an auto-save or explicit save succeeds THEN the attendance route SHALL be revalidated.
2. WHEN state reconciles after a save THEN the section's displayed value SHALL equal the server's
   latest version content.

### Requirement 4: Save-state indicator
**User Story:** As a clinician, I want to see whether my work is saved, so that I can trust the
auto-save.

#### Acceptance Criteria
1. WHEN auto-save is idle, in-flight, just succeeded, or failed THEN the UI SHALL show a clear state
   (e.g. "Saving…", "All changes saved", "Save failed — retry").
2. WHERE a save failed THEN the indicator SHALL offer a way to retry and SHALL NOT silently drop the
   edit.

### Requirement 5: Flush pending saves on exit points
**User Story:** As a clinician, I want pending edits to be saved when I move on, so that nothing is
lost at a boundary.

#### Acceptance Criteria
1. WHEN the clinician blurs a section, switches sections, clicks Save, or clicks Sign encounter THEN
   any pending debounced auto-save SHALL flush (persist now) before proceeding.
2. WHEN the workspace unmounts with a pending save THEN the system SHALL attempt to flush it.
3. WHEN a flush occurs THEN it SHALL use the same attributed path (no bypass of attribution/audit).

### Requirement 6: Non-regression
**User Story:** As a developer, I want auto-save added without breaking existing behavior.

#### Acceptance Criteria
1. The feature SHALL reuse `saveClinicalSection` and `usePersistSection`; it SHALL NOT introduce a new
   persistence path or bypass attribution/audit.
2. The status-on-save guarantee (a plain save/auto-save never completes a visit) SHALL be preserved.
3. Historical mode, role gating, the audit log, and billing SHALL behave exactly as before.
4. WHEN the feature ships THEN `npx tsc --noEmit` SHALL add no new errors in touched files, the pure
   and integration suites SHALL stay green, and the attendance route SHALL build.