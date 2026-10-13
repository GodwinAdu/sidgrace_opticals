# Design Document

## Overview

Add full auto-save, optimistic updates, and revalidation to the encounter workspace by extending the
existing `usePersistSection` hook and the section wrappers — WITHOUT adding a new persistence path.
Auto-save routes through the same attributed, append-only `saveClinicalSection` action, so every
persisted change still appends a version and a `History` audit entry (the accepted tradeoff).

The explicit Save button and Sign encounter remain; auto-save complements them. Historical mode never
auto-saves, and status is never changed by auto-save.

Maps to requirements: R1 (debounced auto-save), R2 (optimistic + rollback), R3 (revalidate/fresh),
R4 (save-state indicator), R5 (flush on exits), R6 (non-regression).

## Architecture

```
Section wrapper (e.g. DoctorNotesTabModule)
  onChange(content) ──► usePersistSection().autoSave(field, content)
                               │  (optimistic: patchSection(field, content) now)
                               │  (debounce ~1500ms per field)
                               ▼
                        saveClinicalSection(attendanceId, field, content, path)   [unchanged action]
                               │  append version + audit + revalidatePath
                               ▼
                        reconcile: patchSection(field, value) + patchSection(`${field}Versions`, versions)
                               │  on error → rollback to last confirmed value + error state
                               ▼
                        SaveStatus (idle | saving | saved | error) surfaced to the UI
```

Exit points (blur, section change, explicit Save, Sign, unmount) call `flush()` to run any pending
debounced save immediately.

## Components and Interfaces

### Pure debounce/auto-save logic (`lib/clinical/autosave.ts`, new — DB/React-free, testable)

Keep the scheduling decisions pure and unit-testable:

```
type SaveState = "idle" | "saving" | "saved" | "error";

// Tracks the last SERVER-CONFIRMED content per field so rollback is exact.
makeAutosaveReducer():
  - record(field, content)            // mark dirty, store pending content
  - confirm(field, serverValue)       // last-confirmed = serverValue, state "saved"
  - fail(field)                       // state "error", keep pending for retry
  - rollbackValue(field)              // the last confirmed value to restore
  - shouldPersist(field, content)     // false if equal to last confirmed (reuses isMeaningfulChange)

aggregateState(perField): SaveState   // worst-of: error > saving > saved > idle
```

Reuses `isMeaningfulChange` from `lib/clinical/attribution.ts` so auto-save and the server guard agree
on "changed".

### `usePersistSection` (extended — same file)

Add to the existing hook (keeping `save` as the explicit-save path):

```
autoSave(field, content):
  - if historical mode or no attendanceId → stage locally only (patchSection), no network
  - optimistic: patchSection(field, content) immediately (R2.1)
  - if !shouldPersist(field, content) → skip (no-op guard, R1.3)
  - debounce per field (~1500ms, A1); on fire → performSave(field, content)

performSave(field, content):
  - set field state "saving"
  - saveClinicalSection(attendanceId, field, content, pathname)   // attributed + revalidate (R1.1, R3.1)
  - success → reconcile value+versions, confirm(field, value), state "saved" (R2.3)
  - failure → rollback: patchSection(field, rollbackValue(field)), state "error", toast + retry (R2.2, R4.2)

flush(field?):
  - run any pending debounced save(s) now and await them (R5.1, R5.2, R5.3)

saveState: SaveState            // aggregate for the indicator (R4.1)
fieldState(field): SaveState
```

Debounce timers live in a `useRef<Map<field, timeout>>`; cleared on unmount after a best-effort flush.

### Section wrappers (updated)

Each tracked-section wrapper (DoctorNotes, NurseNotes, SurgicalNotes, History, PhysicalExam,
Diagnosis, TreatmentPlan→plan, EyeTest, Vitals, LabReport, Scan) switches its existing `onSave`/
`onChange` to call `autoSave(field, content)` on change, and calls `flush(field)` on blur. The
existing per-tab Save button calls `save(field, content)` (immediate) and remains. The underlying
`*Tab` components are reused unchanged.

### Shell + footer integration

- `EncounterWorkspace`: on section change (SectionRail `onSelect`) call `flush()` before switching.
- `EncounterFooter`: the Save button and `SignEncounterButton` call `flush()` before their action so
  no pending edit is lost (R5.1).
- A `SaveStatusIndicator` (small, in the footer/header) renders `saveState`: "Saving…", "All changes
  saved", or "Save failed — retry" (R4).

### Reused unchanged

`saveClinicalSection` (already append-only + attributed + `revalidatePath`), `EncounterProvider`
(`patchSection` is the optimistic + reconcile channel), attribution/audit, historical mode, billing,
status-on-save. No new persistence path (R6.1).

## Data Models

No model changes. Auto-save uses the existing `*Versions` arrays and scalar fields. The last-confirmed
map is client-only React state, never persisted (R6).

## Error Handling

- Save failure → optimistic value rolled back to last confirmed; field state "error"; toast with
  retry; the pending content is kept so retry/flush can re-attempt (R2.2, R4.2).
- Historical mode / missing attendanceId → auto-save degrades to local staging only; no network, no
  error (R1.4).
- Unmount with a pending save → best-effort flush in cleanup; if the request cannot complete, the
  explicit Save/next mount still has the staged content.
- Concurrent in-flight save + new change → the new change is coalesced into the next debounced save;
  no lost update (R2.4).

## Testing Strategy

- **Pure unit tests** (`tests/autosave.test.ts`): `shouldPersist` honors `isMeaningfulChange`;
  reducer `record`/`confirm`/`fail`/`rollbackValue` transitions; `aggregateState` worst-of ordering.
- **Integration (existing DB harness):** an auto-save path (calling the same action) appends a version
  + audit entry and preserves status — reuse/extend `tests/integration` assertions; confirm no new
  persistence path is used.
- **Regression:** pure + integration suites stay green; `npx tsc --noEmit` no new errors; `npx next
  build` compiles the attendance route (R6.4).
- **Manual smoke:** type in a note → "Saving…" then "All changes saved" with attribution; kill the
  network → "Save failed — retry" and value rolls back; switch sections mid-type → pending save
  flushes; historical mode → no auto-save.

## Correctness Properties

### Property 1: Auto-save uses the attributed path only
Every auto-save persists via `saveClinicalSection`; there is no alternate write that bypasses the
append-only versioning or the History audit entry.
**Validates: Requirements 1.1, 5.3, 6.1**

### Property 2: No-op changes do not persist
When content equals the last confirmed value (per `isMeaningfulChange`), auto-save does not call the
server and does not create a version.
**Validates: Requirements 1.3, 2.4**

### Property 3: Debounce coalesces bursts
Multiple changes within the debounce window result in exactly one persist after the quiet interval,
with the latest content.
**Validates: Requirements 1.2**

### Property 4: Optimistic rollback is exact
On save failure the field is restored to the last server-confirmed value (not an intermediate), and
the state becomes "error".
**Validates: Requirements 2.1, 2.2**

### Property 5: Historical mode never auto-saves
In read-only historical mode no auto-save network call is made and no version is created.
**Validates: Requirements 1.4, 6.3**

### Property 6: Status is never changed by auto-save
Auto-save (and its flush) never completes a visit; only the explicit Sign/Complete action changes
status.
**Validates: Requirements 1.5, 6.2**

### Property 7: Flush loses nothing
At every exit point (blur, section change, save, sign, unmount) a pending debounced save is run before
proceeding, so no dirty content is dropped.
**Validates: Requirements 5.1, 5.2**

### Property 8: Save-state aggregate is worst-of
The global indicator reflects error over saving over saved over idle, so an error is never masked by a
concurrently-saved field.
**Validates: Requirements 4.1**