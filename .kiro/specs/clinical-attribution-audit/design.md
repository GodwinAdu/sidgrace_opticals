# Design Document

## Overview

This feature adds professional attribution and an append-only audit trail to the attendance /
encounter workspace. Every tracked clinical write records *who* (authenticated staff) and *when*
(server time); edits never overwrite — they append immutable versions; practitioners see inline
"who did it" (name + role/title + time) on each entry; and authorised users get a per-visit audit
log.

The design is deliberately additive and reuse-first:
- **Author** comes from the `user` already injected by `withAuth`. The client never supplies it.
- **Audit events** reuse the existing `History` model (`performedBy`, `timestamp`, `entityId`,
  `entityType`, `details`, `actionType`) rather than a parallel store.
- **Author identity for display** comes from the `Staff` model (`fullName`, `role`,
  `specialization`), resolved by populating the author ref.
- Self-persisting records (`nursingNotes`, `medicationAdmin`, `intakeOutput`, dental, ICU) already
  carry per-entry attribution; we surface it in the UI and treat each entry as a version.
- The single free-text and structured fields (`doctorNote`, `nurseNote`, `surgicalNote`, `history`,
  `physicExam`, `diagnosis`, `plan`, `eyeTest`, `vitals`) gain versioned, attributed storage.

Maps to requirements: R1 (capture), R2 (append-only), R3 (inline display), R4 (audit log),
R5 (access control), R6 (non-regression), R7 (integrity).

## Architecture

```
Encounter workspace (client)
  |- Tab wrappers (existing)              -> render current value + <AttributionLine/>
  |     on save: call attributed server action (no author in payload)
  |- <AttributionLine name role time/>   -> inline who/when (R3)
  |- <VersionHistoryPopover/>            -> earlier versions of a field (R3.4, authorised)
  |- Audit Log tab (gated by auditView) -> <VisitAuditLog/> (R4, R5)

Server actions (withAuth-wrapped)
  |- saveClinicalSection(attendanceId, field, content)  -> append version + write History (R1,R2,R7)
  |- self-persisting adders (existing, extended)         -> ensure author stamped + History
  |- getVisitAuditLog(attendanceId)  [auditView gated]   -> read History for the visit (R4,R5)
  |- getFieldVersions(attendanceId, field) [authorised]  -> versions of one field (R3.4)

Data (MongoDB)
  |- Attendance  -> versioned subdocs for tracked fields
  |- History     -> one audit entry per clinical write
```

### Why two storage locations

- **Versions live on the Attendance document** (embedded), because they are the clinical content and
  must load with the visit. Showing the latest version is a cheap read with no join.
- **Audit events live in `History`**, the app-wide, access-controlled audit store already used
  everywhere else. The audit log tab queries `History` by `entityType: "Attendance"` + `entityId`,
  so it never bloats the hot-path visit read.

This keeps the visit document lean on the common path (R4.4) while giving auditors a single
consistent log (R6.5).

## Components and Interfaces

### Data model changes (`lib/models/attendance.models.ts`)

Introduce a reusable **versioned field** subdocument for the tracked free-text / structured fields.
Rather than replacing the existing scalar fields (which would break the data contract, R6.2), we add
parallel versioned arrays and keep the current scalar as the materialised "latest" for
backward-compatible reads.

```
AttributedVersion = {
  content: Mixed,                 // the field value at this save (string or structured object)
  authoredBy: ObjectId<Staff>,    // from withAuth user; never client-supplied (R1.2)
  authoredByName: String,         // denormalised snapshot of name at write time (robust display)
  authoredByRole: String,         // denormalised role/title snapshot (R3.1)
  createdAt: Date,                // server time (R1.4)
}

// Additive, parallel to existing scalars:
doctorNoteVersions, nurseNoteVersions, surgicalNoteVersions,
historyVersions, physicExamVersions, diagnosisVersions, planVersions,
eyeTestVersions, vitalsVersions : [AttributedVersion]
```

Design notes:
- The existing scalar (e.g. `doctorNote`) remains the current value for back-compat and is set to the
  newest version's content on each attributed save. New UI reads the newest version; legacy readers
  keep working (R6.1, R6.3).
- `authoredByName` / `authoredByRole` are **denormalised snapshots** taken at write time, so display
  stays correct if a staff member is later renamed/deactivated/deleted, and avoids a populate on every
  entry. The `authoredBy` id is still kept for authoritative linking and the audit log.
- Self-persisting arrays already carry `authoredBy` / `givenBy` / `recordedBy`; we add
  `*Name` / `*Role` snapshots the same way (additive) for consistent inline display. Existing entries
  without snapshots fall back to populate, then to "author unknown" (R3.3, R6.2).

### Pure logic (`lib/clinical/attribution.ts`, new)

DB-free and testable:
```
isMeaningfulChange(previousContent, nextContent): boolean   // R2.4 no-op guard
makeVersion(content, user, now): AttributedVersion          // R1, snapshots name/role
formatAttribution({ name, role, at }): string               // R3.1 display string
resolveAuthorLabel(entry): { name, role } | "unknown"       // R3.3 fallback
```

### Server actions

`saveClinicalSection` (new), `withAuth`-wrapped so the author is injected:
```
saveClinicalSection(attendanceId, field, content, path?)
  1. load visit; verify field is tracked (allow-list)
  2. compute latest version; if !isMeaningfulChange -> return current (R2.4)
  3. push makeVersion(content, user, now) to `${field}Versions` (append-only, R2.1/R2.2)
  4. set materialised scalar `field` = content (back-compat latest)
  5. save visit
  6. write History { actionType: CLINICAL_SECTION_RECORDED, entityType: "Attendance",
       entityId, performedBy: user._id, details: { field, versionIndex } } (R7.3)
  7. revalidate; return updated field + versions
```

The existing record Save (`_updateAttendanceById`) must not overwrite versioned fields blindly:
tracked fields route through the attributed path (each carries its own author); non-tracked fields
keep current behavior; the status-on-save guarantee is unchanged (R6.4).

Self-persisting adders (`addNursingNote`, `addMedicationAdmin`, `addIntakeOutput`, dental/ICU) are
extended to also stamp the name/role snapshot and write a `History` entry per add (they already stamp
the author id). Signatures and behavior are otherwise preserved (R2.5, R6.3).

`getVisitAuditLog(attendanceId)` — `withAuth(..., "auditView")`:
```
  - enforce auditView server-side (R5.2); fail closed if unconfigured (R5.4)
  - query History { entityType: "Attendance", entityId } sort timestamp desc, paginated (R4.1, R4.4)
  - resolve actor display from performedBy with unknown fallback
  - return read-only rows (R4.3)
```

`getFieldVersions(attendanceId, field)` — versions of one field for the history popover (R3.4);
available to users with clinical access to the visit.

### UI components (encounter workspace)

- `AttributionLine` — read-only "Dr. Jane Doe (Ophthalmologist) - 14:32, 13 Oct" (R3.1), visible to
  all practitioners with visit access (R3.2); uses the snapshot, falling back to "author unknown" /
  omitting role when unresolved (R3.3).
- `VersionHistoryPopover` — from a field with more than one version; lists prior versions with their
  attribution, read-only (R3.4, R3.5).
- Tab wrappers render `AttributionLine` under each attributed entry; no change to clinical
  layout/meaning beyond this (R6.3).
- `VisitAuditLog` — the new audit tab body: reverse-chronological, paginated, read-only (R4);
  registered in the tab registry with an `auditView` gate (R5.1), consistent with the existing
  gated-tab pattern.

### Permission

Add an `auditView` flag to the role model / `IRole` (consistent with existing `att*` flags). Admin
bypasses as `withAuth` already does. Both the audit tab's registry gate and `getVisitAuditLog` check
it; the server is the source of truth (R5.2), and absence of the flag denies (R5.4).

## Data Models

```
AttributedVersion (embedded)
  content: Mixed; authoredBy: ObjectId<Staff>; authoredByName: String;
  authoredByRole: String; createdAt: Date (server time)

Attendance (additive)
  <field>Versions: [AttributedVersion]   // per tracked field
  existing scalar <field> retained as materialised latest

History (reused, enum extended)
  actionType: "CLINICAL_SECTION_RECORDED" | existing clinical values
  entityType: "Attendance"; entityId: <attendanceId>; performedBy: <staffId>
  timestamp: server time; details: { field, versionIndex, kind }; message: summary
```

New `History.actionType` value to add (R6.5): `CLINICAL_SECTION_RECORDED`. Existing values
(`SURGERY_NOTE_RECORDED`, `ICU_CHART_ENTRY_CREATED`, etc.) are reused where they already fit.

## Error Handling

- **Unauthenticated write (R1.3):** `withAuth` rejects before the handler runs; no partial content.
- **Missing audit permission (R5):** `getVisitAuditLog` throws FORBIDDEN via `withAuth("auditView")`;
  the UI never renders the tab and the server denies direct calls.
- **Audit-write failure (R7.3):** the clinical write is source of truth; the `History` write is
  best-effort and, on failure, logged via `logError` without rolling back the clinical content, which
  is written atomically within the single `visit.save()`.
- **Unresolvable author (R3.3, R6.2):** display falls back to "author unknown"; role omitted when
  unknown. Never throws, never shows a raw id.
- **Concurrent saves (R7.2):** each save pushes a new array element (not a whole-array replace) after
  reloading the visit, so concurrent writers each append their own version; `markModified` + `save`
  per write preserves both.

## Testing Strategy

- **Pure unit tests** (`tests/attribution.test.ts`): `isMeaningfulChange` no-op guard (R2.4),
  `makeVersion` stamps the passed user + server time (R1), `formatAttribution` deterministic (R3.1),
  `resolveAuthorLabel` unknown fallback (R3.3).
- **Server-action tests:** author taken from the injected user not the payload (R1.2); append-only
  (second save grows, never shrinks; prior entries unchanged — R2.1, R2.2, R7.1); `getVisitAuditLog`
  denies without `auditView` and fails closed when unconfigured (R5.2, R5.4).
- **Regression:** existing encounter tests + `tests/emr-banner.test.ts` stay green; existing visits
  load without error (R6.1); status-on-save preserved (R6.4).
- **Manual smoke:** two staff edit the same visit; each entry shows the other's name/role/time inline;
  the audit tab is visible only to an `auditView` user and lists both writes reverse-chronologically.

## Correctness Properties

These invariants must hold; each is testable (property-based where noted).

### Property 1: Author provenance
For every attributed write, the recorded `authoredBy` equals the authenticated user injected by
`withAuth`, regardless of any author value in the client payload (including a forged author id).
**Validates: Requirements 1.1, 1.2**

### Property 2: Server-time ordering
A version's `createdAt` is server-generated; within a single field's versions, timestamps are
non-decreasing in append order.
**Validates: Requirements 1.4**

### Property 3: Append-only growth
After any save, `versions.length` is greater than or equal to its previous length, and every
previously existing version is unchanged; no prior element is ever mutated or removed.
**Validates: Requirements 2.1, 2.2, 7.1**

### Property 4: No-op idempotence
Saving content equal to the current latest version does not grow the versions array.
**Validates: Requirements 2.4**

### Property 5: Latest consistency
The materialised scalar field always equals the content of the last version element, when any version
exists.
**Validates: Requirements 2.3**

### Property 6: Attribution totality
`resolveAuthorLabel` returns a displayable label for every entry; it never returns a raw id and never
throws, degrading to "author unknown" and omitting an unknown role.
**Validates: Requirements 3.3, 6.2**

### Property 7: Audit gating is fail-closed
`getVisitAuditLog` returns data only when the caller satisfies `auditView`; with the permission
unconfigured or absent, it denies.
**Validates: Requirements 5.2, 5.4**

### Property 8: Audit-visit correspondence
Every successful attributed clinical write produces exactly one `History` entry with
`entityType="Attendance"` and the matching `entityId`; the visit audit log is those entries in
reverse-chronological order.
**Validates: Requirements 4.1, 7.3**

### Property 9: Status-on-save preserved
Routing tracked fields through the attributed path does not change visit status; a plain Save still
never completes a visit.
**Validates: Requirements 6.4**
