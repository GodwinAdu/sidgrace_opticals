"use client";

/** Thin wrapper around the self-persisting `IntakeOutputPanel`. The panel owns
 * its own server-action persistence (`addIntakeOutput`); this adapter only maps
 * provider state (attendanceId + embedded entries) and the historical read-only
 * flag onto its props — it never routes saves through the record save
 * (Req 4.4). Requires `attNursing` (gated in the registry). */
import { IntakeOutputPanel } from "../../NursingPanels";
import { EntryAttributionList } from "../attribution-blocks";
import type { EncounterTabProps } from "./types";

export default function IntakeOutputTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    return (
        <div>
            <IntakeOutputPanel
                attendanceId={attendanceId}
                entries={attendance?.intakeOutput as never}
                readOnly={readOnly}
            />
            <EntryAttributionList
                entries={attendance?.intakeOutput as never}
                label="Recorded by"
            />
        </div>
    );
}
