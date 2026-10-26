"use client";

/**
 * Thin wrapper for "Plan & Follow-up": the visit note + follow-up only
 * (`TreatmentPlanTab`, as-you-type auto-save via onChange + hidden Save button).
 *
 * NOTE: Procedure recording/billing was moved OUT of this tab and now lives
 * solely on the "Treatment Plan" tab (DentalPlanTabModule), so there is a single
 * home for procedures + billing. This tab is purely the per-visit plan note and
 * follow-up interval.
 */
import TreatmentPlanTab from "../../treatment-plan";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function TreatmentPlanTabModule({
    attendance,
    attendanceId,
    readOnly,
}: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div className="space-y-6">
            <div onBlur={() => void flush("plan")}>
                <TreatmentPlanTab
                    initialData={attendance?.plan as never}
                    onChange={(data) => autoSave("plan", data)}
                    autoSave
                    readOnly={readOnly}
                />
                <SectionAttribution
                    attendanceId={attendanceId}
                    field="plan"
                    versions={attendance?.planVersions as never}
                />
            </div>
        </div>
    );
}
