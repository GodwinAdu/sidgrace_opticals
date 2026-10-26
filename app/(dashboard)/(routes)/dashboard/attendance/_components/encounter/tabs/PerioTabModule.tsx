"use client";

/** Thin wrapper around the self-persisting `VisitPerioPanel` (per-visit perio
 * exam). The panel owns its own server-action persistence; this adapter maps
 * provider state (attendanceId + patientId + embedded perioExam) and the
 * historical read-only flag, preserves the "No patient linked to this visit."
 * fallback (Req 1.3), and never routes saves through the record save (Req 4.4).
 * Gated by `attClinical` in the registry. */
import { VisitPerioPanel } from "../../clinical-tab-panels";
import { EntryAttributionList } from "../attribution-blocks";
import type { EncounterTabProps } from "./types";

export default function PerioTabModule({ attendance, attendanceId, patientId, readOnly }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    // The perio exam is a single embedded object (not an array). Wrap it so the
    // shared per-entry block can attribute it when it carries an author, and
    // read its own `recordedAt` timestamp.
    const perioExam = attendance?.perioExam as
        | (Record<string, unknown> & { recordedAt?: string | Date | null })
        | undefined;
    return (
        <div>
            <VisitPerioPanel
                attendanceId={attendanceId}
                patientId={patientId}
                perioExam={perioExam as never}
                readOnly={readOnly}
            />
            <EntryAttributionList
                entries={perioExam ? [perioExam as never] : []}
                label="Recorded by"
            />
        </div>
    );
}
