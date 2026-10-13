# Implementation Plan

_Encounter Workspace Redesign (visual re-skin)_

## Overview

Re-skin the existing encounter workspace to the NOVACARE layout while reusing the whole engine. Build
pure derivations first, then the new presentational components (section rail, overview, summary rail,
sign button), then the layout that composes them, then cut the shell over to the new layout, then
verify. No model, server-action, registry-gate, attribution, audit, or billing changes.

## Tasks

- [x] 1. Pure overview/checklist logic + tests
  - Create `lib/clinical/encounter-overview.ts` with `sectionDoneState`, `buildChecklist`,
    `overviewModel`, `signReadiness` and their types, reusing existing helpers (`rollUpBilling`,
    allergy source, `*Versions` presence) where possible.
  - Add `tests/encounter-overview.test.ts` (Vitest) covering Properties 2, 3, 5 (done-state derived &
    faithful, overview never fabricates, sign-readiness) and checklist done/attention.
  - _Requirements: 1.2, 2.2, 2.3, 3.3, 4.2, 5.1_

- [x] 2. SectionRail component
  - Create `encounter/SectionRail.tsx` replacing `TabNavigation`: vertical, role-gated list from
    `resolveVisibleTabs` (+ Overview prepended, Audit Log kept last), icon + label + done/not-done
    indicator, active highlight, full keyboard semantics, collapsible on small screens.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3_

- [x] 3. OverviewSection component
  - Create `encounter/OverviewSection.tsx` driven by `overviewModel` + `useEncounter()`: reason-for-
    visit, critical allergy callout, latest vitals, problem/order summaries, and the attributed
    timeline; empty states where data is absent; summary links navigate via the rail's `onSelect`.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.4_

- [x] 4. ClinicalSummaryRail component
  - Create `encounter/ClinicalSummaryRail.tsx`: context card, alerts reusing the existing allergy /
    medical-alert source, and the completion checklist from `buildChecklist`; collapses on narrow
    viewports; indicators not color-only.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.3_

- [x] 5. SignEncounterButton (restyled footer/header action)
  - Create/restyle the sign action to call the EXISTING Complete-visit action, gated by
    `signReadiness` (warn-then-confirm default), disabled in historical mode, post-sign status via the
    existing display. Do not change the server action or status-on-save.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.2_

- [x] 6. EncounterLayout + shell cutover
  - Create `encounter/EncounterLayout.tsx` (3-column responsive grid) owning active-section state, and
    update `EncounterWorkspace.tsx` to render the restyled PatientHeader + SectionRail + main outlet
    (Overview or lazy registered section) + ClinicalSummaryRail + restyled footer/SignEncounterButton,
    replacing the stacked TabNavigation layout. Keep the provider root and the lazy Suspense outlet.
  - _Requirements: 1.1, 2.1, 5.1, 5.5, 6.2, 6.4_

- [x] 7. Verification + regression
  - `npx tsc --noEmit` (no new errors in touched files), `npx vitest run` (pure suite green) and
    `npm run test:integration` (DB-backed suite green), `npx next build` (attendance route compiles);
    manually verify role-gated rail + done marks, overview from real data, alerts match the banner,
    Sign via the existing action (warn/blocked per checklist), historical read-only, audit-log gating,
    billing, and light/dark.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.4, 7.1, 7.2, 7.3, 7.4_

## Task Dependency Graph

```
1  (pure overview/checklist logic)   depends on []
2  (SectionRail)                     depends on 1
3  (OverviewSection)                 depends on 1
4  (ClinicalSummaryRail)             depends on 1
5  (SignEncounterButton)             depends on 1
6  (EncounterLayout + cutover)       depends on 2, 3, 4, 5
7  (verification + regression)       depends on 6
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4", "5"] },
    { "wave": 3, "tasks": ["6"] },
    { "wave": 4, "tasks": ["7"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["1"],
    "4": ["1"],
    "5": ["1"],
    "6": ["2", "3", "4", "5"],
    "7": ["6"]
  }
}
```

## Notes

- Presentation-only: no changes to the model, server actions, registry gates, attribution/append-only
  semantics, audit gating, historical mode, or billing. The status-on-save guarantee is preserved.
- The section rail is exactly `resolveVisibleTabs(can, ctx)` plus Overview and the gated Audit Log;
  nothing is invented. "Done" and checklist states are derived per render, never persisted.
- Rebuilt with the existing Radix `components/ui` kit + Tailwind tokens; no new UI dependency.
- New clinical sections (Chief Complaint, Review of Systems, Triage, Care Plan, Follow-up) are OUT of
  scope for this spec and deferred to a later effort.
- Do not commit or push as part of task execution unless explicitly requested.