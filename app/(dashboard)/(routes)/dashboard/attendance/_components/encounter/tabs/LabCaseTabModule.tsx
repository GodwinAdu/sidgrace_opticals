"use client";

/** Thin wrapper around the self-persisting `LabCaseTabPanel` (living,
 * cross-visit lab cases). The panel owns its own server-action persistence and
 * self-fetches by `patientId`; this adapter passes patientId + the patient's
 * name, preserves the "No patient linked to this visit." fallback (Req 1.3),
 * and never routes saves through the record save (Req 4.4). Gated by
 * `attTreatment` in the registry. */
import { LabCaseTabPanel } from "../../clinical-tab-panels";
import type { EncounterTabProps } from "./types";

export default function LabCaseTabModule({ attendance, patientId }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    const patient = attendance?.patientId as { fullName?: string } | undefined;
    return <LabCaseTabPanel patientId={patientId} patientName={patient?.fullName} />;
}
