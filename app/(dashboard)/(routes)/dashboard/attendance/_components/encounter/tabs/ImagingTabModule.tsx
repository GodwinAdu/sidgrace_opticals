"use client";

/** Thin wrapper around the self-persisting `VisitImagingPanel` (per-visit
 * imaging). The panel owns its own server-action persistence; this adapter maps
 * provider state (attendanceId + patientId + embedded images) and the
 * historical read-only flag, preserves the "No patient linked to this visit."
 * fallback (Req 1.3), and never routes saves through the record save (Req 4.4).
 * Gated by `attLabScan` in the registry. */
import { VisitImagingPanel } from "../../clinical-tab-panels";
import { EntryAttributionList } from "../attribution-blocks";
import type { EncounterTabProps } from "./types";

export default function ImagingTabModule({ attendance, attendanceId, patientId, readOnly }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    return (
        <div>
            <VisitImagingPanel
                attendanceId={attendanceId}
                patientId={patientId}
                images={(attendance?.dentalImaging as never) || []}
                readOnly={readOnly}
            />
            <EntryAttributionList
                entries={attendance?.dentalImaging as never}
                label="Captured by"
            />
        </div>
    );
}
