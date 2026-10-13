"use client";

/** Thin wrapper around the self-persisting `DentalPlanTabPanel` (living,
 * cross-visit treatment plan). The panel owns its own server-action
 * persistence; this adapter maps provider state (attendanceId + patientId),
 * preserves the "No patient linked to this visit." fallback (Req 1.3), and
 * forwards the panel's `onBillingChange` to the provider's `onPatchBilling`
 * billing bus so the header reconciles optimistic then server-returned billing
 * (Req 4.5). It never routes saves through the record save (Req 4.4). Gated by
 * `attTreatment` in the registry. */
import { DentalPlanTabPanel } from "../../clinical-tab-panels";
import type { EncounterTabProps } from "./types";

export default function DentalPlanTabModule({ attendanceId, patientId, onPatchBilling }: EncounterTabProps) {
    if (!patientId) {
        return <p className="text-sm text-muted-foreground">No patient linked to this visit.</p>;
    }
    return (
        <DentalPlanTabPanel
            patientId={patientId}
            attendanceId={attendanceId}
            onBillingChange={(billing) => onPatchBilling?.(billing)}
        />
    );
}
