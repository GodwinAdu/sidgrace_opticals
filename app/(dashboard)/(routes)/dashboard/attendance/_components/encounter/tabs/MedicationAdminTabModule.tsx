"use client";

/** Thin wrapper around the self-persisting `MedicationAdminPanel` (MAR). The
 * panel owns its own server-action persistence (`addMedicationAdmin`); this
 * adapter only maps provider state (attendanceId + embedded entries) and the
 * historical read-only flag onto its props — it never routes saves through the
 * record save (Req 4.4). Requires `attNursing` (gated in the registry). */
import { MedicationAdminPanel } from "../../NursingPanels";
import { EntryAttributionList } from "../attribution-blocks";
import type { EncounterTabProps } from "./types";

export default function MedicationAdminTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    return (
        <div>
            <MedicationAdminPanel
                attendanceId={attendanceId}
                entries={attendance?.medicationAdmin as never}
                readOnly={readOnly}
            />
            <EntryAttributionList
                entries={attendance?.medicationAdmin as never}
                label="Administered by"
            />
        </div>
    );
}
