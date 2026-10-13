# Design Document

_Attendance / Encounter Workspace Rebuild_

## Overview

The attendance detail screen is rebuilt from a single ~1,500-line client component into a **shell + lazy
tab-module** architecture with one explicit state/save model. The rebuild is a structured refactor: every
existing tab component and server action is reused as-is; what changes is the composition, the state flow,
two bug fixes (status-on-save, dead historical mode), and the UX shell. No clinical server action, Mongoose
schema, `IRole` flag, or `History` action type changes.

Current flow (preserved at the route boundary):

```
app/.../attendance/[attendantId]/page.tsx   (server: fetch attendance + role + admission + previous visits)
  └─ consulting-page-wrapper.tsx            (client: current/historical state, save + load actions)
       └─ ConsultingPage.tsx                (client: 1,500-line monolith — THE REBUILD TARGET)
```

The route page and the wrapper's input contract (`initialAttendance`, `previousVisits`, `role`, `admission`)
are unchanged (Req 6.4). The rebuild replaces the monolith behind the wrapper.

## Architecture

### Target structure

```
_components/encounter/
  EncounterWorkspace.tsx        # shell: header + banner + tab nav + footer; owns reduced state
  EncounterProvider.tsx         # React context: encounter state, dispatch, mode, role helper, billing bus
  PatientHeader.tsx             # sticky identity + admission context + billing summary
  MedicalAlertBanner.tsx        # structured + free-text allergies + chronic (severe escalation)
  PreviousVisitPicker.tsx       # list/filter/load previous visits
  TabNavigation.tsx             # grouped, gated, responsive tab bar
  EncounterFooter.tsx           # Save / Print / Export actions
  tabs/
    registry.ts                 # declarative tab registry (id, label, group, gate, lazy loader)
    <one wrapper per existing tab>   # thin adapters around existing *-tab / *panel components
lib/clinical/encounter.ts       # PURE: tab-visibility resolution, firstVisibleTab, billing roll-up, mode transitions
```

Existing components under `_components/` (`history-tab.tsx`, `vitals-tab.tsx`, `diagnosis-tab.tsx`,
`clinical-tab-panels.tsx`, `prescription-panel.tsx`, `NursingPanels.tsx`, `eye-test-tab.tsx`, etc.) are
**kept and imported** by the thin tab wrappers. The monolith `ConsultingPage.tsx` is replaced by
`EncounterWorkspace.tsx`; the wrapper imports the new shell instead.

### Rendering & performance (Req 6.2)

- Tab content is registered in `tabs/registry.ts` with a `React.lazy` loader per tab (or group).
- Only the active tab's module mounts; switching tabs lazy-loads on demand. The default (`firstVisibleTab`)
  renders immediately.
- Panels that self-fetch (prescriptions, nursing, ICU, dental, imaging) therefore only fetch when their tab is
  first opened — fixing today's behavior where every panel mounts on initial render.

### State model (Req 4)

A single `useReducer` in `EncounterProvider` holds:

```
EncounterState = {
  attendance: AttendanceData        // the working visit document
  mode: "edit" | "historical"       // historical = read-only
  dirty: boolean                    // unsaved record-level edits exist
  saving: boolean
}
```

- **Section updates** (History, Vitals, Diagnosis, Plan, notes, eye test, etc.) dispatch
  `PATCH_SECTION { section, data }`, updating `attendance` in state and setting `dirty = true`. They do NOT
  hit the server by themselves — they are persisted by the single record save (matching how these tabs behave
  today).
- **Self-persisting panels** (prescriptions, nursing, MAR, I/O, ICU, dental chart/notes/perio/imaging, visit
  procedures) keep calling their own server actions directly; on success they dispatch a billing/attendance
  patch where relevant but never depend on the record save (Req 4.4).
- **Billing bus**: `onBillingChange` / `onProceduresChange` dispatch `PATCH_BILLING`, updating the header
  summary optimistically; server-returned billing reconciles the same slice (Req 4.5). Roll-up math is pure in
  `lib/clinical/encounter.ts`.

### Save semantics — the status fix (Req 4.3)

Today `updateAttendance` force-sets `status: "completed"` on every call, so any Save completes the visit. The
fix keeps `updateAttendance` reusable but makes status explicit:

- The record **Save** persists the aggregated editable fields and passes the status the workspace intends,
  defaulting to **preserving the current status** (an in-progress/waiting/ongoing visit stays that way).
- Completing a visit becomes an explicit action: a distinct **"Complete Visit"** control (in the footer)
  sets `status: "completed"`. Plain Save never silently completes.
- Implementation approach (decided in tasks): either (a) add an explicit `status` field to the save payload
  the workspace sends and stop the unconditional `status = "completed"` in `_updateAttendanceById`, or (b)
  introduce a thin `saveEncounter(id, fields, { complete })` wrapper action. Option (a) is preferred — smallest
  change, keeps one action — but it slightly alters `_updateAttendanceById`; this is the one allowed server
  tweak per Req 4.3 and Out-of-Scope. Any other caller of `updateAttendance` is audited first to avoid
  regressions.

### Historical mode — the dead-flag fix (Req 5)

Today the wrapper never sets `isViewingHistorical = true`, so loading a previous visit silently stays
editable. The rebuild moves this into the provider:

- `PreviousVisitPicker` → `loadPreviousVisit(id)` calls `getAttendanceById(id)`, dispatches
  `LOAD_HISTORICAL { attendance }`, setting `mode = "historical"`.
- In `historical` mode, all tab inputs and Save are disabled (`readOnly` propagated from context), and a
  "Historical View" indicator shows.
- `returnToCurrent()` dispatches `RETURN_TO_CURRENT`, restoring the original current-visit snapshot held in
  the provider and setting `mode = "edit"` — no page reload.
- The wrapper's `originalAttendance` snapshot concept is preserved inside the provider.

## Components and Interfaces

### Tab registry (declarative gating + grouping, Req 2 & 7)

```ts
type TabGroup = "clinical" | "diagnostics" | "nursing" | "specialty" | "orders" | "billing";

interface EncounterTab {
  id: string;                     // "history", "vitals", ...
  label: string;
  shortLabel: string;             // small-screen label
  group: TabGroup;
  icon: LucideIcon;
  gate: (can: (f: keyof IRole) => boolean, ctx: GateContext) => boolean;
  load: () => Promise<{ default: React.ComponentType<EncounterTabProps> }>; // React.lazy
}
```

- `gate` reproduces today's exact rules, e.g. History/Exam/Diagnosis/Dr/Nurse/Vitals/Surgical/Dental →
  `can("attClinical")`; Lab/Scan/Imaging → `can("attLabScan")`; Eye Test → `can("attEyeTest")`; Plan/Dental
  Plan/Lab Case → `can("attTreatment")`; Prescribe → `can("attPrescribe")`; Billing → `can("attBilling")`;
  Nursing/MAR/I-O → `can("attNursing")`; ICU → `ctx.hasAdmission && (can("attNursing") || can("icuManagement"))`.
- `GateContext` carries `hasAdmission` and `hasPatient` (for the "No patient linked" fallback, Req 1.3).
- Grouping drives the visual sections in `TabNavigation` without altering gating (Req 2.4).

### Pure logic (`lib/clinical/encounter.ts`, unit-tested — Req 8.4)

- `resolveVisibleTabs(tabs, can, ctx)` → ordered visible tabs.
- `firstVisibleTab(visibleTabs)` → default tab id (preserves current precedence).
- `rollUpBilling(billing)` → totals/balance for the header summary.
- `nextMode(current, action)` → edit/historical transitions.
- `canEdit(mode)` → boolean used to propagate `readOnly`.

### Reused component contracts (unchanged)

Each existing tab/panel keeps its current props (`initialData`/`onSave`/`readOnly`, or
`attendanceId`/`patientId`/entries + `onBillingChange`). Thin wrappers in `tabs/` adapt provider state to
those props and dispatch section/billing patches — no edits to the existing components themselves (Req 1.2).

## Data Models

No schema changes. The workspace reads/writes the existing `Attendance` document shape (as populated by
`getAttendanceById`: `patientId` populated, `createdBy` populated). The one behavioral change is how `status`
is set on save (Req 4.3), not the schema.

## UX (Req 7)

- **Patient header**: sticky; avatar, name, patient ID, gender, age, phone, blood type, visit date, status
  badge; admission ward/bed/day-count or Admit action; billing summary (previous/current/balance). Light + dark.
- **Alert banner**: directly under the header; merges structured + free-text allergies + chronic conditions;
  escalates to "Severe Allergy Alert" styling when any structured allergy is severe.
- **Tab navigation**: grouped, horizontally scrollable on small screens with no page overflow; active-state
  color per group; full keyboard/ARIA tab semantics (roving focus, `aria-selected`).
- **Footer**: Save (preserves status), explicit Complete Visit, and Print/Export. Clear saving/disabled
  states; disabled entirely in historical mode.
- **Historical banner**: unmistakable read-only indicator plus "Return to Current Visit".

## Footer actions — Print/Export honesty (Req 9.2)

Print and Export are currently dead buttons. Design decision: **ship a working browser Print** of the
encounter (print-friendly summary via `window.print()` with a print stylesheet scoped to a printable region),
and present **Export PDF as explicitly disabled with a "coming soon" affordance** rather than a silent no-op.
Final choice confirmed in tasks; no dead buttons remain either way.

## Error Handling

- Section edits are local and cannot fail until Save; Save failures surface the existing non-blocking error
  toast and leave `dirty = true` so work is not lost.
- Self-persisting panels keep their own try/catch + toast behavior.
- Loading a previous visit that fails leaves the current visit intact and toasts.
- Missing patient on the visit renders the existing per-tab fallback instead of throwing (Req 1.3).

## Testing Strategy

- **Unit (Vitest)** for all pure logic in `lib/clinical/encounter.ts`: tab visibility across role
  combinations, `firstVisibleTab` precedence, billing roll-up, mode transitions, `canEdit`.
- **Regression**: the existing `tests/emr-banner.test.ts` (allergy banner) continues to pass unchanged
  (Req 8.5).
- **Type/build**: `npx tsc --noEmit` shows no new errors in touched files; the route compiles and serves
  (307/200, not 500) under the auth gate (Req 8.1, 8.2).
- **Manual smoke**: each role flag combination shows the correct tab set; Save preserves status; Complete
  Visit completes; previous-visit load is read-only and Return restores the current visit.

## Risks & Mitigations

- **Risk:** altering `_updateAttendanceById` status behavior breaks another caller.
  **Mitigation:** audit all `updateAttendance` callers before changing; keep status explicit and default to
  preserve; cover with a unit test on the status-decision helper.
- **Risk:** lazy-loading changes when panels fetch, exposing hidden ordering assumptions.
  **Mitigation:** keep each panel's existing self-fetch; only defer mount, not contract.
- **Risk:** scope creep into a full rewrite.
  **Mitigation:** reuse every existing tab/panel component unchanged; the rebuild is composition + state + UX.

## Correctness Properties

These invariants hold for the rebuilt workspace and are the basis for the unit tests on
`lib/clinical/encounter.ts` and the save/mode logic.

### Property 1: Gating parity
For any role, `resolveVisibleTabs` returns exactly the set of tabs the current monolith would show for that
same role (same flags, same ICU admission rule, same fail-open when no role is provided).

**Validates: Requirements 2.1, 2.2, 2.5, 8.3**

### Property 2: Default-tab determinism
`firstVisibleTab(resolveVisibleTabs(...))` is deterministic, equals the first visible tab in the fixed
precedence order, and never returns a tab the user cannot see.

**Validates: Requirements 2.3**

### Property 3: Save preserves status
A plain record Save never changes `status` to `completed`; the saved status equals the prior status unless an
explicit Complete Visit action is taken.

**Validates: Requirements 4.2, 4.3**

### Property 4: Complete is explicit and idempotent
Complete Visit sets `status = "completed"`; completing an already-completed visit is a no-op on status.

**Validates: Requirements 4.3, 9.1**

### Property 5: Historical mode is read-only
When `mode === "historical"`, `canEdit` is false, every tab receives `readOnly = true`, Save/Complete are
disabled, and no dispatch can mutate the persisted current visit.

**Validates: Requirements 5.2, 5.3**

### Property 6: Return restores exactly
`returnToCurrent()` restores the original current-visit snapshot (the exact data the provider loaded) and sets
`mode = "edit"`.

**Validates: Requirements 5.4**

### Property 7: Billing roll-up consistency
`rollUpBilling` is a pure function of the billing slice: total charged = consultation + procedures + products
+ other charges; balance = total charged − amount paid; optimistic updates are overwritten by server-returned
values for the same slice.

**Validates: Requirements 3.4, 4.5**

### Property 8: No new privileges
The visible-tab set is always a subset of what the role's flags permit; the rebuild never grants access to a
tab the role lacks.

**Validates: Requirements 2.1, 8.3**

