"use client";

/** Thin wrapper around the self-persisting `NursingNotesPanel`. The panel owns
 * its own server-action persistence (`addNursingNote`); this adapter only maps
 * provider state (attendanceId + embedded notes) and the historical read-only
 * flag onto its props — it never routes saves through the record save
 * (Req 4.4). Requires `attNursing` (gated in the registry). */
import { NursingNotesPanel } from "../../NursingPanels";
import { EntryAttributionList } from "../attribution-blocks";
import type { EncounterTabProps } from "./types";

export default function NursingNotesTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    return (
        <div>
            <NursingNotesPanel
                attendanceId={attendanceId}
                notes={attendance?.nursingNotes as never}
                readOnly={readOnly}
            />
            <EntryAttributionList
                entries={attendance?.nursingNotes as never}
                label="Recorded by"
            />
        </div>
    );
}
