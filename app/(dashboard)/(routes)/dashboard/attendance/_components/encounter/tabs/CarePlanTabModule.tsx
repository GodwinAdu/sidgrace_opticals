"use client";

/** Thin wrapper around the self-persisting `CarePlanPanel`. The panel owns its
 * own server-action persistence (`addCarePlanItem` / `updateCarePlanItem`); this
 * adapter only maps provider state (attendanceId + embedded carePlan items) and
 * the historical read-only flag onto its props — it never routes saves through
 * the record save. Requires `attNursing` (gated in the registry). */
import { CarePlanPanel } from "../../NursingPanels";
import type { EncounterTabProps } from "./types";

export default function CarePlanTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    return (
        <CarePlanPanel
            attendanceId={attendanceId}
            items={attendance?.carePlan as never}
            readOnly={readOnly}
        />
    );
}