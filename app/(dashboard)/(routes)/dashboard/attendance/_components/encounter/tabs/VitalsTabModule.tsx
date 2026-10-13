"use client";

/**
 * Thin wrapper around `VitalsTab`. True as-you-type auto-save via `onChange` →
 * debounced attributed persist (optimistic + rollback + flush-on-blur); the
 * component's own Save button is hidden (`autoSave`). Reused component.
 */
import VitalsTab from "../../vitals-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function VitalsTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("vitals")}>
            <VitalsTab
                initialData={attendance?.vitals as never}
                onChange={(data) => autoSave("vitals", data)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="vitals"
                versions={attendance?.vitalsVersions as never}
            />
        </div>
    );
}