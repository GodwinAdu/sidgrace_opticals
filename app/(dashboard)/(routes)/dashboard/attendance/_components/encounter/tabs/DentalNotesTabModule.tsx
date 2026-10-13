"use client";

/** Thin wrapper around the self-persisting `VisitDentalNotesPanel` (per-visit
 * SOAP notes). The panel owns its own server-action persistence; this adapter
 * maps provider state (attendanceId + patientId + embedded notes) and the
 * historical read-only flag, preserves the "No patient linked to this visit."
 * fallback (Req 1.3), and never routes saves through the record save (Req 4.4).
 * Gated by `attClinical` in the registry. */
import { VisitDentalNotesPanel } from "../../clinical-tab-panels";
import { EntryAttributionList } from "../attribution-blocks";
import type { EncounterTabProps } from "./types";

export default function DentalNotesTabModule({ attendance, attendanceId, patientId, readOnly }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    return (
        <div>
            <VisitDentalNotesPanel
                attendanceId={attendanceId}
                patientId={patientId}
                notes={(attendance?.dentalNotes as never) || []}
                readOnly={readOnly}
            />
            <EntryAttributionList
                entries={attendance?.dentalNotes as never}
                label="Recorded by"
            />
        </div>
    );
}
