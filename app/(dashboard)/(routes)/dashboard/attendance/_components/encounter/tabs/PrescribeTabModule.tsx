"use client";

/** Thin wrapper around the self-persisting `PrescriptionPanel`. The panel owns
 * its own server-action persistence; this adapter only maps provider state
 * (attendanceId + patientId) and the historical read-only flag onto its props,
 * and preserves the "No patient linked to this visit." fallback (Req 1.3). It
 * never routes saves through the record save (Req 4.4). Requires
 * `attPrescribe` (gated in the registry). */
import { PrescriptionPanel } from "../../prescription-panel";
import type { EncounterTabProps } from "./types";

export default function PrescribeTabModule({ attendanceId, patientId, readOnly }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    return <PrescriptionPanel attendanceId={attendanceId} patientId={patientId} readOnly={readOnly} />;
}
