# Implementation Plan

_Attendance / Encounter Workspace Rebuild_

## Overview

Rebuild sequencing: pure logic and the shell first, then migrate tabs in role-gated batches reusing the
existing components, then the two behavioral fixes (status-on-save, historical mode), then footer + cutover.
Each task is incremental and verifiable; existing clinical server actions and tab/panel components are reused
unchanged except for the single audited `updateAttendance` status tweak.

## Tasks

- [x] 1. Extract pure encounter logic + tests
  - Create `lib/clinical/encounter.ts` with `resolveVisibleTabs`, `firstVisibleTab`, `rollUpBilling`,
    `nextMode`, `canEdit`, and the tab-registry types (`EncounterTab`, `TabGroup`, `GateContext`).
  - Reproduce today's exact gating rules and `firstVisibleTab` precedence from `ConsultingPage.tsx`.
  - Add `tests/encounter.test.ts` (Vitest) covering Properties 1, 2, 7, 8 (gating parity across role combos,
    default-tab determinism, billing roll-up, subset-of-privileges) and mode transitions / `canEdit`
    (Properties 5, 6 at the pure level).
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.4, 4.5, 6.3, 8.3, 8.4_

- [x] 2. Build the tab registry (declarative, gated, lazy)
  - Create `_components/encounter/tabs/registry.ts` listing every existing tab with id, label, shortLabel,
    group, icon, `gate`, and a `React.lazy` `load()`.
  - Map each tab to its existing component/panel; include the `GateContext` (hasAdmission, hasPatient) rules,
    especially the ICU rule (`hasAdmission && (attNursing || icuManagement)`).
  - _Requirements: 1.1, 2.1, 2.4, 6.1, 6.2_

- [x] 3. Encounter state provider
  - Create `_components/encounter/EncounterProvider.tsx` with a `useReducer` state
    (`attendance`, `mode`, `dirty`, `saving`) and actions `PATCH_SECTION`, `PATCH_BILLING`, `LOAD_HISTORICAL`,
    `RETURN_TO_CURRENT`, `SET_SAVING`, `SET_SAVED`.
  - Expose a `can(flag)` role helper (fail-open when no role) and `canEdit` from `mode`.
  - Hold the original current-visit snapshot for exact restore (Property 6).
  - _Requirements: 4.1, 4.4, 4.5, 5.3, 5.4, 6.3_

- [x] 4. Shell layout: PatientHeader, MedicalAlertBanner, PreviousVisitPicker
  - Create `PatientHeader.tsx` (sticky identity + status badge + admission ward/bed/day-count or Admit action
    + billing summary via `rollUpBilling` and `getPatientOutstanding`), reusing `AdmitButton`.
  - Create `MedicalAlertBanner.tsx` reusing `getAllergiesByPatient` + `buildAllergyBanner` (structured +
    free-text + chronic, severe escalation).
  - Create `PreviousVisitPicker.tsx` (list via `getPreviousVisitsByPatientId`, date filter, load via
    `getAttendanceById`).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1_

- [x] 5. Shell layout: TabNavigation + EncounterWorkspace frame
  - Create `TabNavigation.tsx` rendering `resolveVisibleTabs` output grouped by `TabGroup`, horizontally
    scrollable on small screens, with full keyboard/ARIA tab semantics.
  - Create `EncounterWorkspace.tsx` composing header + banner + previous-visit picker + tab nav + lazy
    `Suspense` tab outlet + footer; default to `firstVisibleTab`.
  - _Requirements: 1.1, 2.3, 2.4, 6.1, 6.2, 7.1, 7.2, 7.3_

- [x] 6. Migrate section-save tabs (attClinical / attLabScan / attEyeTest / attTreatment)
  - Add thin wrappers in `tabs/` for History, Physical Exam, Diagnosis, Lab Report, Scan, Dr's Notes,
    Nurse's Notes, Vitals, Treatment Plan (+ Visit Procedures), Surgical Notes, Eye Test — each reusing the
    existing `*-tab` component and dispatching `PATCH_SECTION` (and `PATCH_BILLING` for Visit Procedures).
  - Preserve the "No patient linked to this visit." fallback where applicable.
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.5_

- [x] 7. Migrate self-persisting panels (attNursing / ICU / attPrescribe / dental / imaging / lab case)
  - Add thin wrappers for Nursing Notes, MAR, Intake/Output, ICU Chart, Prescribe, Dental Chart, Dental
    (SOAP) Notes, Perio, Imaging, Dental Plan, Lab Case — reusing `NursingPanels`, `IcuChartPanel`,
    `PrescriptionPanel`, and `clinical-tab-panels` exports.
  - Keep each panel's own server-action persistence; propagate billing via `PATCH_BILLING` where relevant;
    enforce the ICU read-only-for-icuManagement-only rule.
  - _Requirements: 1.1, 1.2, 1.3, 2.5, 4.4, 4.5_

- [x] 8. Billing summary tab (read-only) + billing bus wiring
  - Add the read-only Billing summary tab reusing the current summary layout, driven by `rollUpBilling`, with
    the "Open invoice" link.
  - Verify optimistic billing updates from Visit Procedures / Dental Plan reconcile with server-returned
    values in the header and the billing tab.
  - _Requirements: 1.1, 3.4, 4.5_

- [x] 9. Status-on-save fix (audited server tweak) + tests
  - Audit all callers of `updateAttendance`; change `_updateAttendanceById` so it no longer unconditionally
    sets `status = "completed"` — status is taken from the payload and defaults to preserving current status.
  - Add an explicit `completeVisit` path (payload status `completed`) used only by the footer Complete action.
  - Unit-test the status-decision helper (Properties 3, 4).
  - _Requirements: 4.2, 4.3, 8.1, 9.1_

- [x] 10. Historical mode end-to-end
  - Wire `PreviousVisitPicker` -> `LOAD_HISTORICAL` (read-only, "Historical View" indicator) and
    `RETURN_TO_CURRENT` (exact restore, no reload); propagate `readOnly` to all tabs and disable Save/Complete.
  - Add tests/assertions for Properties 5 and 6 at the reducer level.
  - _Requirements: 5.2, 5.3, 5.4, 8.4_

- [x] 11. EncounterFooter (Save / Complete / Print / Export)
  - Create `EncounterFooter.tsx`: Save (preserves status), Complete Visit (explicit), working browser Print
    (print stylesheet scoped to a printable region), and Export PDF presented as explicitly disabled
    ("coming soon"). Disable all in historical mode.
  - _Requirements: 4.3, 7.4, 9.1, 9.2_

- [x] 12. Cutover + regression verification
  - Point `consulting-page-wrapper.tsx` at `EncounterWorkspace` (unchanged wrapper inputs); remove the old
    `ConsultingPage.tsx` monolith once parity is confirmed.
  - Run `npx tsc --noEmit` (no new errors in touched files), `npx vitest run` (new encounter tests + existing
    `tests/emr-banner.test.ts` still green), and a dev-server smoke test of the attendance detail route
    (redirect/200, not 500); manually verify tab sets per role, save-preserves-status, complete, and
    historical read-only + return.
  - _Requirements: 1.1, 4.3, 5.2, 6.4, 8.1, 8.2, 8.5_

## Task Dependency Graph

```
1  (pure logic + tests)
2  (tab registry)            depends on 1
3  (state provider)          depends on 1
4  (header/banner/picker)    depends on 1, 3
5  (tab nav + workspace)     depends on 2, 3, 4
6  (section-save tabs)       depends on 5
7  (self-persisting panels)  depends on 5
8  (billing tab + bus)       depends on 5, 6
9  (status-on-save fix)      depends on 1        (independent server tweak; can run in parallel with 6-8)
10 (historical mode)         depends on 3, 5
11 (footer)                  depends on 5, 9, 10
12 (cutover + verification)  depends on 6, 7, 8, 10, 11
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "9"] },
    { "wave": 3, "tasks": ["4"] },
    { "wave": 4, "tasks": ["5"] },
    { "wave": 5, "tasks": ["6", "7", "10"] },
    { "wave": 6, "tasks": ["8", "11"] },
    { "wave": 7, "tasks": ["12"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["1"],
    "4": ["1", "3"],
    "5": ["2", "3", "4"],
    "6": ["5"],
    "7": ["5"],
    "8": ["5", "6"],
    "9": ["1"],
    "10": ["3", "5"],
    "11": ["5", "9", "10"],
    "12": ["6", "7", "8", "10", "11"]
  }
}
```
## Notes

- The rebuild reuses every existing tab/panel component unchanged; only composition, state, two bug fixes,
  and the UX shell change.
- The only server-side change is Task 9's audited tweak to `_updateAttendanceById` (status-on-save); no new
  `IRole` flags and no new `History` action types are introduced.
- Verification follows the project baseline policy: no new TypeScript errors in touched files, full Vitest
  suite green (including the unchanged allergy-banner tests), and the route serves without a 500 under auth.
- Do not commit or push as part of task execution unless explicitly requested.


