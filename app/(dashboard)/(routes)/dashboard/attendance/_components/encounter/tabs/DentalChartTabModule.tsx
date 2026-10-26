"use client";

/** Thin wrapper around the self-persisting `DentalChartTabPanel` (living,
 * per-patient odontogram). The panel owns its own server-action persistence and
 * self-fetches by `patientId`; this adapter preserves the "No patient linked to
 * this visit." fallback (Req 1.3) and never routes saves through the record
 * save (Req 4.4). Gated by `attClinical` in the registry. */
import { DentalChartTabPanel } from "../../clinical-tab-panels";
import type { EncounterTabProps } from "./types";

export default function DentalChartTabModule({ patientId }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    return <DentalChartTabPanel patientId={patientId} />;
}
