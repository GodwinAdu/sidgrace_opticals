# Implementation Plan

_Encounter on-change auto-save + remove per-tab Save buttons_

## Overview

Convert each tracked clinical tab component to emit `onChange` on edit and accept an `autoSave` flag
that hides its internal Save button; wire each wrapper to route `onChange` into the existing
`usePersistSection().autoSave`. Vitals and History are already done (reference). Group the remaining
work by component shape, then verify. No engine, attribution, audit, historical, or billing changes.

## Tasks

- [x] 1. Free-text note tabs (Dr's, Nurse's, Surgical)
  - Add `onChange` + `autoSave` props to `doctor-note-tab.tsx`, `nurses-note-tab.tsx`,
    `surgical-notes-tab.tsx`; fire `onChange` from their textarea `handleChange`; hide the internal
    Save button when `autoSave`. Switch the three wrappers to `onChange={(data) => autoSave(field, …)}`
    + `autoSave`, keeping flush-on-blur and the plain-string unwrap.
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 2. Structured field tabs (Physical Exam, Eye Test)
  - Add `onChange` + `autoSave` to `physical-exams-tab.tsx` and `eye-test-tab.tsx` (fire onChange from
    each per-field handler, same as Vitals/History); hide the Save button under `autoSave`; switch
    their wrappers to onChange + autoSave + flush-on-blur.
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 3. Diagnosis tab (primary + secondary list)
  - Add `onChange` + `autoSave` to `diagnosis-tab.tsx`; fire onChange from `handlePrimaryChange`,
    `addSecondaryDiagnosis`, and `removeSecondaryDiagnosis` with the full updated object; hide the
    Save button under `autoSave`; switch the wrapper. Keep the inline add/remove controls (they are
    editing affordances, not the section Save).
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 4. Lab Report & Scan tabs
  - Add `onChange` + `autoSave` to `lab-report-tab.tsx` and `scan-tab.tsx`; fire onChange on their
    edits with the full object; hide the Save button under `autoSave`; switch their wrappers.
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 5. Treatment Plan tab (plan portion)
  - Add `onChange` + `autoSave` to `treatment-plan.tsx` for the plan fields (treatment / follow-up);
    fire onChange on edit; hide the plan Save button under `autoSave`; switch the plan portion of the
    wrapper to onChange + autoSave + flush-on-blur. Leave the VisitProceduresPanel (self-persisting)
    unchanged.
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 6. Verification + regression
  - `npx tsc --noEmit` (no new errors in touched files), `npx vitest run` (pure suite green) and
    `npm run test:integration` (DB-backed suite green), `npx next build` (attendance route compiles);
    manually verify each converted tab saves on edit with attribution and NO per-tab Save button,
    Diagnosis list add/remove saves, historical mode disables editing, and footer Save + Sign
    encounter still work.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Task Dependency Graph

```
1 (free-text notes)        depends on []
2 (structured fields)      depends on []
3 (diagnosis list)         depends on []
4 (lab report + scan)      depends on []
5 (treatment plan)         depends on []
6 (verification)           depends on 1, 2, 3, 4, 5
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3", "4", "5"] },
    { "wave": 2, "tasks": ["6"] }
  ],
  "dependencies": {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": ["1", "2", "3", "4", "5"]
  }
}
```

## Notes

- Vitals and History are already converted (reference implementation); they are not re-done here.
- Props are additive and optional; a component with neither `onChange` nor `autoSave` behaves exactly
  as before (Save button visible). Each `*Tab` has a single caller (its wrapper), so this is safe.
- No new persistence path: everything routes through `usePersistSection` → `saveClinicalSection`.
  Attribution/append-only, audit, historical mode, billing, footer Save, and Sign encounter are
  unchanged. The accepted full-auto-save version/audit volume tradeoff carries over.
- Do not commit or push as part of task execution unless explicitly requested.