"use client";

/**
 * "Treatment Plan" tab ? the single home for procedure selection + billing.
 *
 * Renders the living, cross-visit treatment-plan builder (`DentalPlanTabPanel`),
 * which is itself a procedure selector: the clinician picks procedures into a
 * (optionally phased) plan and can push them to the CURRENT visit bill via the
 * builder's save action. There is intentionally ONE procedure UI here ? the
 * separate per-visit procedures panel used to live on "Plan & Follow-up" and
 * was removed to avoid a duplicate procedure picker.
 *
 * The panel owns its own server-action persistence; this adapter maps provider
 * state (attendanceId + patientId), preserves the "No patient linked" fallback
 * (Req 1.3), and forwards billing to the provider's billing bus so the header
 * reconciles optimistic then server-returned billing (Req 4.5). Gated by
 * `attTreatment` in the registry.
 */
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
