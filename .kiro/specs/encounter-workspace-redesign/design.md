# Design Document

## Overview

Re-skin the existing encounter workspace to the NOVACARE layout — a left **section rail**, an
**Overview** landing section, a right-hand **clinical summary** rail with a **completion checklist**,
and a **Sign encounter** action — while reusing the entire working engine unchanged: the
`EncounterProvider`, the tab `registry` and its role gates, `saveClinicalSection` + append-only
attribution, the gated audit log, historical mode, and billing.

The change is presentational. The current shell composes:

```
EncounterProvider
  → PatientHeader → MedicalAlertBanner → PreviousVisitPicker → TabNavigation
    → Suspense lazy tab outlet → EncounterFooter
```

The redesign keeps the provider root and the lazy outlet, and swaps the PRESENTATION layer: the
horizontal `TabNavigation` becomes a vertical `SectionRail`, an `OverviewSection` is added as the
default landing, a `ClinicalSummaryRail` is added on the right, the header/footer are restyled, and a
`SignEncounterButton` wraps the existing Complete-visit action. The registry, provider, gates, and
tab components are untouched.

Maps to requirements: R1 (section rail), R2 (overview), R3 (summary rail), R4 (sign encounter),
R5 (engine preserved), R6 (a11y/responsive), R7 (verification).

## Architecture

```
EncounterWorkspace (composition root — unchanged provider ownership)
 └ EncounterProvider  (unchanged)
    └ EncounterLayout  (NEW 3-column grid; replaces the stacked TabNavigation layout)
       ├ PatientHeader           (restyled; same data/props)
       ├ SectionRail (left)      (NEW; replaces TabNavigation — driven by resolveVisibleTabs)
       ├ Main content (center)
       │   ├ OverviewSection     (NEW; default section, reads provider state)
       │   └ Suspense lazy outlet (UNCHANGED; mounts the active registered section component)
       ├ ClinicalSummaryRail (right)  (NEW; alerts + completion checklist + context)
       └ EncounterFooter / SignEncounterButton (restyled; same actions)
```

Only the active section mounts in the lazy outlet (performance preserved). The rail, overview,
summary, and checklist are all DERIVED from existing provider state and the registry — no new
persisted data, no new server action.

## Components and Interfaces

### Pure logic (`lib/clinical/encounter-overview.ts`, new — DB/React-free, testable)

Keep the derivations pure so they can be unit-tested and reused:

```
sectionDoneState(attendance, sectionId): "done" | "empty"
   // true/"done" when the section's backing data is present (and, for tracked
   // fields, has at least one attributed version). Derived, never stored (A3).

buildChecklist(attendance, ctx): ChecklistItem[]
   // [{ id, label, state: "done" | "attention" }] from existing data
   // (patient identified, chief/reason present, vitals recorded, assessment,
   //  diagnosis, follow-up) — items map to data that EXISTS today; absent data
   //  simply shows "attention".

overviewModel(attendance): OverviewModel
   // { reasonForVisit, criticalAllergies, latestVitals, problemCount,
   //   pendingOrders, ... } assembled from existing fields; absent → null/empty.

signReadiness(checklist): { ready: boolean; outstanding: ChecklistItem[] }
   // ready when all REQUIRED items are done; otherwise lists what's outstanding.
```

These reuse existing helpers where possible: `rollUpBilling`, `resolveVisibleTabs`,
`buildAllergyBanner` (allergy source), and the attribution `*Versions` presence check.

### SectionRail (`encounter/SectionRail.tsx`, new — replaces TabNavigation)

- Props: `{ sections: RegisteredTab[]; activeId: string; onSelect(id); doneState: Record<id,boolean> }`.
- Renders a vertical, scrollable list; each item = icon + label + a done check or a not-done dot
  (R1.1, R1.2). The active item is highlighted (R1.3). Role-hidden sections never appear because the
  list IS `resolveVisibleTabs(can, ctx)` (R1.4).
- Overview is prepended; the gated Audit Log stays last (its existing `auditView` gate is respected).
- Full keyboard semantics (roving focus, arrow keys, roles/labels) carried over from the current
  `TabNavigation` (R6.1). Collapsible on small screens via a toggle (R1.5, R6.2).

### OverviewSection (`encounter/OverviewSection.tsx`, new)

- Consumes `useEncounter()` + `overviewModel(attendance)`; renders the reason-for-visit card, a
  critical allergy callout (reusing the allergy/medical-alert data), a latest-vitals metric grid,
  active-problem/pending-order summaries, and the encounter timeline (R2.2).
- Timeline reads the attributed events already available (the audit/attribution data from the prior
  spec); where no events exist it shows an empty state (R2.3).
- Summary "open X" links call the same `onSelect` the rail uses to navigate (R2.4).

### ClinicalSummaryRail (`encounter/ClinicalSummaryRail.tsx`, new)

- Context card (visit type, department/room if available), alerts list (reused allergy/medical-alert
  source — no new alert logic, R3.2), and the completion checklist from `buildChecklist` (R3.1, R3.3).
- Hidden/collapsed on narrow viewports (R3.4, R6.2).

### SignEncounterButton (in the restyled footer/header)

- Calls the EXISTING explicit Complete-visit action (never a plain save; status-on-save preserved —
  R4.1, R5.2). Uses `signReadiness`: when items are outstanding it warns and requires confirmation
  (default warn-then-confirm; blocking is a design toggle — R4.2). Disabled in historical mode along
  with all edit affordances (R4.3). Post-sign status uses the existing status display (R4.4).

### EncounterLayout (`encounter/EncounterLayout.tsx`, new)

- The 3-column responsive grid (`[rail] [main] [summary]`) that hosts the above. It owns only
  active-section state (moved out of the old shell) and passes it to the rail + outlet. Everything
  below it reads the provider.

### Reused unchanged

`EncounterProvider`, `registry` (`resolveVisibleTabs` / `firstVisibleTab` / `lazyTabComponents` /
gates), all `tabs/*TabModule` components, `saveClinicalSection`, `getVisitAuditLog` /
`getFieldVersions`, `AttributionLine` / `VersionHistoryPopover`, `rollUpBilling`, historical-mode
actions. The restyle uses the existing `components/ui` kit + Tailwind tokens — NO new UI dependency
(R5.5, A1).

## Data Models

No model changes. All new surfaces are derived from the existing `AttendanceData` (scalars +
`*Versions` arrays), the registry, and existing read actions. "Done" and checklist states are
computed per render (A3), never persisted.

## Error Handling

- Missing/absent data in Overview or the checklist renders an empty/attention state, never fabricated
  values (R2.3, R3.3).
- Sign encounter surfaces server errors via the existing Complete-visit error handling; a failed sign
  leaves the visit editable (no status change).
- Historical mode disables sign/edit exactly as today; the rail still navigates (read-only).
- The audit-log section remains server-gated; an unauthorised user never sees it in the rail.

## Testing Strategy

- **Pure unit tests** (`tests/encounter-overview.test.ts`): `sectionDoneState` (done only when backing
  data/version present), `buildChecklist` (done vs attention from presence), `overviewModel` (absent
  → empty), `signReadiness` (ready only when required items done).
- **Regression:** existing pure suite + the DB-backed integration suite stay green; encounter and
  attribution tests unchanged (R7.2).
- **Build/typecheck:** `npx tsc --noEmit` no new errors in touched files (R7.1); `npx next build`
  compiles the attendance route (R7.3).
- **Manual smoke:** rail shows only role-visible sections with correct done marks; Overview summarizes
  real data; summary alerts match the allergy banner; Sign encounter completes via the existing action
  and is blocked/warned per the checklist; historical mode disables editing; light/dark both render
  (R6.4, R7.4).

## Correctness Properties

### Property 1: Rail reflects exactly the gated sections
The section rail's items equal `resolveVisibleTabs(can, ctx)` (plus Overview, and Audit Log only when
`auditView`); no role-hidden section ever appears, and none is invented.
**Validates: Requirements 1.1, 1.4, 5.2**

### Property 2: Done state is derived and faithful
`sectionDoneState` returns "done" if and only if the section's backing data is present for the visit
(and, for tracked fields, has at least one attributed version); it never reads or writes a stored
flag.
**Validates: Requirements 1.2, 5.1**

### Property 3: Overview never fabricates data
Every field in `overviewModel` is either sourced from existing attendance data or rendered as an
empty/placeholder state; no default clinical value is invented.
**Validates: Requirements 2.2, 2.3**

### Property 4: Alerts reuse the existing source
The summary rail's alerts are derived solely from the existing allergy / medical-alert data; the
redesign adds no independent alert computation.
**Validates: Requirements 3.1, 3.2**

### Property 5: Sign is explicit and status-safe
Sign encounter invokes only the existing explicit Complete-visit action; it never completes a visit as
a side effect of a plain save, and in historical mode it is disabled.
**Validates: Requirements 4.1, 4.3, 5.2**

### Property 6: Engine behavior is unchanged
Mounting a section renders the existing component + server actions unchanged; save-with-attribution,
audit gating, append-only versioning, historical load/return, and billing behave exactly as before.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.4**

### Property 7: No new UI dependency
The redesign imports only the existing `components/ui` kit and Tailwind tokens; it adds no new
UI-component package.
**Validates: Requirements 5.5**