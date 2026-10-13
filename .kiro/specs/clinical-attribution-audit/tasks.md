# Implementation Plan

_Clinical Attribution & Audit Trail_

## Overview

Build pure logic first, then the data model, then the attributed server actions, then surface
attribution in the UI, then the gated audit log, and finally wire + verify. Every change is additive
and reuses `withAuth` (author injection) and the existing `History` model. Existing scalar clinical
fields are retained as the materialised "latest" so existing visits keep working; the status-on-save
guarantee from the encounter-workspace spec is preserved throughout.

## Tasks

- [x] 1. Pure attribution logic + tests
  - Create `lib/clinical/attribution.ts` with `isMeaningfulChange`, `makeVersion`,
    `formatAttribution`, `resolveAuthorLabel`, and the `AttributedVersion` / author-label types.
  - Add `tests/attribution.test.ts` (Vitest) covering Properties 1, 2, 4, 5, 6 at the pure level
    (author always from the passed user, server-time stamping, no-op guard, latest consistency,
    unknown-author fallback).
  - _Requirements: 1.1, 1.2, 1.4, 2.3, 2.4, 3.1, 3.3, 6.2_

- [x] 2. Attendance model: versioned fields (additive)
  - Add the reusable `AttributedVersion` subdocument and the parallel `*Versions` arrays
    (`doctorNoteVersions`, `nurseNoteVersions`, `surgicalNoteVersions`, `historyVersions`,
    `physicExamVersions`, `diagnosisVersions`, `planVersions`, `eyeTestVersions`, `vitalsVersions`)
    to `attendance.models.ts`, keeping existing scalar fields intact.
  - Add `authoredByName` / `authoredByRole` snapshot fields to the existing self-persisting arrays
    (`nursingNotes`, `medicationAdmin`, `intakeOutput`, dental, ICU) additively.
  - _Requirements: 2.1, 2.2, 2.5, 6.1, 6.2, 6.3_

- [x] 3. History enum + audit write helper
  - Add `CLINICAL_SECTION_RECORDED` to the `History` `actionType` enum.
  - Add a small helper to write a visit audit entry (`entityType: "Attendance"`, `entityId`,
    `performedBy`, `details`, `message`) best-effort via the existing `logError` on failure.
  - _Requirements: 4.1, 6.5, 7.3_

- [x] 4. saveClinicalSection server action (append-only, attributed)
  - Add `saveClinicalSection(attendanceId, field, content, path?)` (`withAuth`-wrapped) with a
    tracked-field allow-list: no-op guard via `isMeaningfulChange`, append `makeVersion(...)`, update
    the materialised scalar, save, then write the audit entry.
  - Author/time come from the injected `user` + server clock; client-supplied author is ignored.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3_

- [x] 5. Route record-Save through the attributed path (non-regression)
  - Update `_updateAttendanceById` so tracked fields are persisted via the attributed path (each
    carrying its own author) while non-tracked fields keep current behavior; preserve the
    status-on-save guarantee.
  - Add assertions/tests that a plain Save never completes a visit and never overwrites prior
    versions.
  - _Requirements: 2.2, 6.3, 6.4, 7.1_

- [x] 6. Extend self-persisting adders with attribution + audit
  - Update `addNursingNote`, `addMedicationAdmin`, `addIntakeOutput`, and the dental/ICU adders to
    stamp the `authoredByName` / `authoredByRole` snapshot and write a `History` entry per add,
    preserving their existing signatures and behavior.
  - _Requirements: 1.1, 2.5, 6.3, 7.3_

- [x] 7. getFieldVersions + getVisitAuditLog server actions
  - Add `getFieldVersions(attendanceId, field)` for the version popover (clinical-access users).
  - Add `getVisitAuditLog(attendanceId)` gated by `withAuth(..., "auditView")`: query `History` for
    the visit, sort reverse-chronological, paginate, resolve actor display with unknown fallback,
    return read-only rows; fail closed when the permission is unconfigured.
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 5.2, 5.4, 7.1_

- [x] 8. auditView permission
  - Add the `auditView` flag to the role model / `IRole` and the role editor UI, consistent with the
    existing `att*` flags; admin bypasses via `withAuth`.
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 9. AttributionLine + VersionHistoryPopover UI
  - Create `AttributionLine` (name + role/title + time, "author unknown" fallback, role omitted when
    unknown) and `VersionHistoryPopover` (prior versions, read-only).
  - Render `AttributionLine` under each attributed entry in the existing section-save and
    self-persisting tab wrappers, without changing clinical layout/meaning.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.3_

- [x] 10. VisitAuditLog tab (gated)
  - Create `VisitAuditLog` (reverse-chronological, paginated, read-only) and register it in the
    encounter tab registry with an `auditView` gate so it only appears for authorised users.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3_

- [x] 11. Integration + regression verification
  - Run `npx tsc --noEmit` (no new errors in touched files) and `npx vitest run` (new attribution
    tests + existing encounter and emr-banner tests green); `npx next build` smoke of the attendance
    route.
  - Manually verify: two staff edit the same visit and each sees the other's name/role/time inline;
    append-only edits keep prior versions; a plain Save does not complete the visit; the audit tab
    appears only for an `auditView` user and lists writes reverse-chronologically.
  - _Requirements: 2.1, 2.2, 3.1, 4.1, 5.1, 6.1, 6.4, 7.1_

- [x] 12. Extend attribution to Lab Report & Scan
  - Add `labReportVersions` / `scanVersions` to the attendance model (additive), add `labReport`
    and `scan` to the tracked-field allow-lists in `clinical-section.actions.ts` and
    `attendance.actions.ts`, and to the `getFieldVersions` tracked list in `visit-audit.actions.ts`.
  - Render `AttributionLine` (+ `VersionHistoryPopover`) in `LabReportTabModule` and `ScanTabModule`.
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.4, 6.3_

- [x] 13. Server-level integration tests (test DB)
  - Add `mongodb-memory-server` (dev dependency) and a Vitest integration setup that spins up an
    in-memory MongoDB, so the real server actions can be exercised without external infra.
  - Cover: `saveClinicalSection` append-only + no-op guard + author-from-session (Properties 1, 3,
    4); record-Save routing preserves status and never overwrites versions (Properties 3, 9);
    `getVisitAuditLog` returns an audit entry per write and denies without `auditView`
    (Properties 7, 8). Keep DB-backed tests isolated from the pure suite.
  - _Requirements: 1.1, 1.2, 2.2, 2.4, 4.1, 5.2, 5.4, 7.1, 7.3_
## Task Dependency Graph

```
1  (pure logic + tests)
2  (model: versioned fields)        depends on 1
3  (History enum + audit helper)    depends on 1
4  (saveClinicalSection)            depends on 2, 3
5  (route record-Save)              depends on 4
6  (self-persisting adders)         depends on 2, 3
7  (getFieldVersions + audit log)   depends on 3
8  (auditView permission)           depends on 1   (independent; can run in parallel)
9  (AttributionLine + popover)      depends on 4, 7
10 (VisitAuditLog tab)              depends on 7, 8
11 (integration + verification)     depends on 5, 6, 9, 10
12 (lab report + scan attribution) depends on 9
13 (server integration tests)      depends on 5, 6, 7
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "8"] },
    { "wave": 3, "tasks": ["4", "6", "7"] },
    { "wave": 4, "tasks": ["5", "9", "10"] },
    { "wave": 5, "tasks": ["11"] },
    { "wave": 6, "tasks": ["12", "13"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["1"],
    "4": ["2", "3"],
    "5": ["4"],
    "6": ["2", "3"],
    "7": ["3"],
    "8": ["1"],
    "9": ["4", "7"],
    "10": ["7", "8"],
    "11": ["5", "6", "9", "10"],
    "12": ["9"],
    "13": ["5", "6", "7"]
  }
}
```

## Notes

- Additive-only data model: existing scalar clinical fields are retained as the materialised latest,
  so existing visits load unchanged (no migration; legacy content shows "author unknown").
- Author and timestamp always come from the `withAuth` user and server clock; client-supplied author
  values are never trusted.
- Reuses the existing `History` audit model and `logError` best-effort pattern; no parallel audit
  store is introduced.
- The status-on-save guarantee (a plain Save never completes a visit) is preserved by Task 5.
- Do not commit or push as part of task execution unless explicitly requested.


