# Implementation Plan

_Encounter Auto-save (full) + optimistic + revalidate_

## Overview

Add debounced full auto-save, optimistic updates with rollback, revalidation, and a save-state
indicator to the encounter workspace, reusing the attributed `saveClinicalSection` action and the
`usePersistSection` hook. Build pure scheduling logic first, extend the hook, wire the section
wrappers + exit-point flushes + indicator, then verify. No new persistence path; status-on-save,
attribution/audit, historical mode, and billing are preserved.

## Tasks

- [x] 1. Pure auto-save logic + tests
  - Create `lib/clinical/autosave.ts` with `SaveState`, `shouldPersist` (reusing `isMeaningfulChange`),
    an auto-save reducer (`record` / `confirm` / `fail` / `rollbackValue`), and `aggregateState`
    (worst-of). Add `tests/autosave.test.ts` covering Properties 2, 4, 8 and the reducer transitions.
  - _Requirements: 1.3, 2.1, 2.2, 2.4, 4.1_

- [x] 2. Extend usePersistSection with autoSave + flush + save state
  - Add `autoSave(field, content)` (optimistic + ~1500ms per-field debounce → `saveClinicalSection`),
    `flush(field?)`, per-field + aggregate `saveState`, and failure rollback to last-confirmed value.
    Keep the existing `save` (explicit) path. Historical mode / missing id → local stage only.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 5.3, 6.1, 6.2_

- [x] 3. Wire tracked-section wrappers to auto-save
  - Update the tracked wrappers (DoctorNotes, NurseNotes, SurgicalNotes, History, PhysicalExam,
    Diagnosis, TreatmentPlan→plan, EyeTest, Vitals, LabReport, Scan) to call `autoSave` on change and
    `flush(field)` on blur; keep the per-tab Save button calling `save`. Reuse the `*Tab` components
    unchanged.
  - _Requirements: 1.1, 2.1, 5.1_

- [x] 4. Exit-point flushes + SaveStatusIndicator
  - Flush pending saves on section change (SectionRail `onSelect`), on footer Save, on Sign encounter,
    and on workspace unmount. Add a `SaveStatusIndicator` (footer/header) rendering the aggregate save
    state with a retry affordance on error.
  - _Requirements: 4.1, 4.2, 5.1, 5.2_

- [x] 5. Verification + regression
  - `npx tsc --noEmit` (no new errors in touched files), `npx vitest run` (pure suite green incl. new
    autosave tests) and `npm run test:integration` (DB-backed suite green), `npx next build`
    (attendance route compiles); manually verify debounced auto-save with attribution, optimistic
    rollback on failure, flush on section-change/save/sign, no auto-save in historical mode, and that
    status never changes from auto-save.
  - _Requirements: 1.1, 1.4, 1.5, 2.2, 5.1, 6.2, 6.3, 6.4_

## Task Dependency Graph

```
1  (pure auto-save logic)        depends on []
2  (extend usePersistSection)    depends on 1
3  (wire section wrappers)       depends on 2
4  (exit flushes + indicator)    depends on 2
5  (verification + regression)   depends on 3, 4
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4"] },
    { "wave": 4, "tasks": ["5"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["2"],
    "4": ["2"],
    "5": ["3", "4"]
  }
}
```

## Notes

- Full auto-save is an accepted tradeoff: each debounced change appends an attributed version + audit
  entry. The `isMeaningfulChange` guard prevents identical re-saves; the ~1500ms debounce limits
  frequency; intermediate typing is still versioned/audited by design.
- No new persistence path: auto-save reuses `saveClinicalSection`. Status-on-save, attribution/audit,
  historical mode, role gating, and billing are unchanged.
- Do not commit or push as part of task execution unless explicitly requested.