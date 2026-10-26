# Design Document

## Overview

Make each tracked clinical tab component emit `onChange` on every edit and accept an `autoSave` flag
that hides its internal Save button; wire each wrapper to route `onChange` into the existing
`usePersistSection().autoSave`. This completes true as-you-type auto-save and lets the per-tab Save
buttons be removed. The auto-save engine, attribution/audit, historical mode, billing, footer Save,
and Sign encounter are all unchanged.

Vitals and History are the proven reference (already converted). This spec applies the identical,
mechanical pattern to the remaining tabs.

Maps to requirements: R1 (tabs emit onChange), R2 (Save buttons removed under autoSave), R3 (wrappers
drive auto-save), R4 (preserve behavior/safety).

## Architecture

```
Clinical tab component (e.g. DiagnosisTab)
  edit → commit(next): setState(next) + onChange?.(next)
                              │
                              ▼  (wrapper)
  <XTabModule> onChange={(data) => autoSave(field, data)}  autoSave  (hides internal Save button)
                              │
                              ▼
  usePersistSection().autoSave  →  optimistic patchSection + ~1500ms debounce
                              │
                              ▼
  saveClinicalSection (unchanged: append version + audit + revalidate)
```

The engine (`usePersistSection` → `saveClinicalSection`) and every guarantee around it are reused
untouched; this spec only changes how often, and from where, `autoSave` is called — plus removing the
now-redundant per-tab Save buttons. The footer Save (whole record) and Sign encounter are unaffected.

## The uniform component pattern

Each tracked `*Tab` component is modified identically:

```
interface XTabProps {
  initialData?: XData
  onSave?: (data: XData) => void
  onChange?: (data: XData) => void   // NEW — fires the full next object on edit
  autoSave?: boolean                  // NEW — when true, hide the internal Save button
  readOnly?: boolean
}

// In every state-mutation path, compute the NEXT object, setState, then fire onChange:
const commit = (next: XData) => { setX(next); onChange?.(next); };

// Render the Save button only when NOT auto-saving and NOT read-only:
{!readOnly && !autoSave && <Button onClick={handleSave}>Save X</Button>}
```

Per-component edit points that must call `commit`/`onChange`:
- **Dr's / Nurse's / Surgical Notes** — single textarea `handleChange`.
- **Diagnosis** — `handlePrimaryChange`, `addSecondaryDiagnosis`, `removeSecondaryDiagnosis` (list
  add/remove each fire onChange with the updated object — R1.2).
- **Physical Exam / Eye Test** — per-field `handleChange` (same as Vitals/History).
- **Lab Report / Scan** — their field/structure edits fire onChange with the full object.
- **Treatment Plan** — the plan portion (treatment/followUp fields) fires onChange; the
  VisitProceduresPanel is untouched (self-persisting via its own billing bus).

## The uniform wrapper pattern

Each wrapper switches from `onSave`-triggered to `onChange`-driven:

```
const { autoSave, flush } = usePersistSection();
<div onBlur={() => void flush("<field>")}>
  <XTab
    initialData={attendance?.<field> as never}
    onChange={(data) => autoSave("<field>", data)}
    autoSave
    readOnly={readOnly}
  />
  <SectionAttribution attendanceId={attendanceId} field="<field>" versions={attendance?.<field>Versions as never} />
</div>
```

For notes whose attendance field is a plain string (`doctorNote`/`nurseNote`/`surgicalNote`), the
wrapper unwraps the payload exactly as today: `onChange={(data) => autoSave("doctorNote", data.doctorNote)}`.

## Components and Interfaces

- Modify (reused clinical components, additive props only): `doctor-note-tab.tsx`,
  `nurses-note-tab.tsx`, `surgical-notes-tab.tsx`, `diagnosis-tab.tsx`, `physical-exams-tab.tsx`,
  `eye-test-tab.tsx`, `lab-report-tab.tsx`, `scan-tab.tsx`, `treatment-plan.tsx`.
- Modify wrappers: the matching `*TabModule.tsx` for each (Vitals/History already done).
- Reused unchanged: `usePersistSection` (the engine), `saveClinicalSection`, provider, attribution/
  audit, historical mode, billing, footer Save / Sign encounter, the self-persisting panels.

Each `*Tab` component has exactly one caller (its wrapper), so adding optional props is safe; the
`autoSave` flag defaults off, preserving behavior for any other hypothetical caller (R1.3, R2.2).

## Data Models

No model changes. onChange carries the same section data objects already persisted.

## Error Handling

- Rollback / error / retry are handled by the existing auto-save hook (unchanged); onChange only
  feeds it more frequently.
- Historical mode: wrappers pass `readOnly`, and the components disable inputs, so no onChange-driven
  save occurs on a read-only visit (R4.2).
- No-op guard + debounce (in the hook) keep typing from flooding versions beyond the accepted
  tradeoff.

## Testing Strategy

- **Type-level / build:** `npx tsc --noEmit` (no new errors in touched files); `npx next build`
  compiles the attendance route (R4.4).
- **Regression:** pure suite (incl. autosave + overview tests) and the DB-backed integration suite
  stay green (R4.4). No new unit tests are strictly required (the components are presentational and
  the engine is already tested), but a light render/onChange test may be added if practical.
- **Manual smoke:** type in each converted tab → "Saving…" then "All changes saved" with attribution,
  no per-tab Save button present; list add/remove in Diagnosis triggers a save; historical mode shows
  no auto-save and disabled inputs; footer Save + Sign encounter still work.

## Correctness Properties

### Property 1: onChange carries the full next object
Every edit path in a converted tab calls `onChange` with the complete section data object (not a
partial), so the wrapper persists a coherent value.
**Validates: Requirements 1.1, 1.2, 3.1**

### Property 2: Save button hidden iff auto-saving
A converted tab renders its internal Save button only when `autoSave` is not set (and not read-only);
with `autoSave` set the button is absent and persistence happens via onChange.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: One attributed persistence path
All persistence continues through `usePersistSection` → `saveClinicalSection`; no wrapper introduces
an alternate write, so attribution/append-only/audit are unchanged.
**Validates: Requirements 3.3, 4.1**

### Property 4: Back-compatible props
A converted component with neither `onChange` nor `autoSave` behaves exactly as before (Save button
visible, onSave fires on click), so the change is additive.
**Validates: Requirements 1.3, 2.2**

### Property 5: Historical mode makes no onChange save
In read-only historical mode inputs are disabled and no onChange-driven save fires.
**Validates: Requirements 4.2**