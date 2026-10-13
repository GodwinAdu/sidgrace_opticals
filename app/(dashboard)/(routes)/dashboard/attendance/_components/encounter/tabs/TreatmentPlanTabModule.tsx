"use client";

/**
 * Thin wrapper for "Plan & Follow-up": the existing `TreatmentPlanTab` (plan
 * portion, now as-you-type auto-save via onChange + hidden Save button) plus the
 * self-persisting `VisitProceduresPanel` (own billing bus, unchanged). Both
 * components reused unchanged except the additive onChange/autoSave props.
 */
import TreatmentPlanTab from "../../treatment-plan";
import { VisitProceduresPanel } from "../../clinical-tab-panels";
import { EntryAttributionList, SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function TreatmentPlanTabModule({
    attendance,
    attendanceId,
    readOnly,
    onPatchSection,
    onPatchBilling,
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
            <div>
                <VisitProceduresPanel
                    attendanceId={attendanceId}
                    procedures={attendance?.dentalProcedures as never}
                    onBillingChange={(billing) => onPatchBilling?.(billing as Record<string, unknown>)}
                    onProceduresChange={(procedures) => onPatchSection?.("dentalProcedures", procedures)}
                    readOnly={readOnly}
                />
                <EntryAttributionList
                    entries={attendance?.dentalProcedures as never}
                    label="Recorded by"
                />
            </div>
        </div>
    );
}