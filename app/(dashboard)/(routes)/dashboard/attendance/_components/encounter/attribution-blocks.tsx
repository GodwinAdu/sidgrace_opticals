"use client";

/**
 * Small, additive attribution blocks shared by the encounter tab wrappers.
 *
 * These keep each wrapper's edit minimal and the layout change unobtrusive
 * (R6.3): a wrapper renders the existing clinical component unchanged and simply
 * appends one of these blocks beneath it.
 *
 *   - `SectionAttribution` — for the section-save fields that store an append-
 *     only `<field>Versions` array on the attendance document. It shows the
 *     latest version's attribution and, when more than one version exists, the
 *     `VersionHistoryPopover` for that field. Legacy visits with no versions
 *     render nothing (we never fabricate an author).
 *
 *   - `EntryAttributionList` — for the self-persisting records (nursing notes,
 *     MAR, I/O, dental notes, imaging, procedures, perio). It lists one
 *     `AttributionLine` per entry using that entry's own denormalised snapshot
 *     and timestamp. Entries with no attribution are skipped so the block stays
 *     empty for legacy data rather than printing a wall of "author unknown".
 *
 * Both blocks are read-only and render NOTHING when there is nothing to show.
 */

import type { AttributedVersion, AttributionEntry } from "@/lib/clinical/attribution";
import type { TrackedClinicalField } from "@/lib/actions/visit-audit.actions";
import AttributionLine from "./AttributionLine";
import VersionHistoryPopover from "./VersionHistoryPopover";

/** A version element as it arrives on the (serialized) attendance document. */
type VersionLike = Partial<AttributedVersion> & { createdAt?: string | Date | null };

/** Whether an entry carries any resolvable author snapshot. */
function hasAuthor(entry: AttributionEntry | null | undefined): boolean {
    if (!entry) return false;
    return (
        (typeof entry.authoredByName === "string" && entry.authoredByName.trim() !== "") ||
        !!entry.authoredBy ||
        !!entry.givenBy ||
        !!entry.recordedBy
    );
}

export interface SectionAttributionProps {
    /** The visit id, needed by the version-history popover. */
    attendanceId?: string;
    /** The tracked field whose `<field>Versions` array drives the attribution. */
    field: TrackedClinicalField;
    /** The append-only versions array for the field (may be absent on legacy visits). */
    versions?: VersionLike[] | null;
}

/**
 * Latest-version attribution for a section-save field, plus the read-only
 * version-history popover when earlier versions exist. Renders nothing when the
 * field has no recorded versions (legacy content).
 */
export function SectionAttribution({ attendanceId, field, versions }: SectionAttributionProps) {
    if (!Array.isArray(versions) || versions.length === 0) return null;

    const latest = versions[versions.length - 1];

    return (
        <div className="mt-2">
            <AttributionLine
                entry={latest as AttributionEntry}
                at={latest?.createdAt ?? undefined}
            />
            {attendanceId && versions.length > 1 && (
                <VersionHistoryPopover
                    attendanceId={attendanceId}
                    field={field}
                    versionCount={versions.length}
                />
            )}
        </div>
    );
}

export interface EntryAttributionListProps {
    /** The self-persisting entries to attribute, each carrying its own snapshot. */
    entries?: (AttributionEntry & { createdAt?: string | Date | null })[] | null;
    /** Optional heading shown above the list when at least one entry is attributed. */
    label?: string;
}

/**
 * One `AttributionLine` per self-persisting entry. Entries without any author
 * snapshot are skipped; the whole block renders nothing when none are
 * attributed, so legacy visits are unaffected (R6.3).
 */
export function EntryAttributionList({ entries, label }: EntryAttributionListProps) {
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const attributed = entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => hasAuthor(entry));

    if (attributed.length === 0) return null;

    return (
        <div className="mt-2 space-y-0.5 border-t pt-2">
            {label && (
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
            )}
            {attributed.map(({ entry, index }) => (
                <AttributionLine key={index} entry={entry} />
            ))}
        </div>
    );
}
