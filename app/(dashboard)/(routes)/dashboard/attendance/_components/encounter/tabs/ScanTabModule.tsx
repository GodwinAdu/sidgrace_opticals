"use client";

/**
 * Thin wrapper. True as-you-type auto-save: the clinical component emits
 * `onChange` on edit, which the wrapper routes into the attributed, debounced
 * persist (optimistic + rollback + flush-on-blur). The component's own Save
 * button is hidden via the `autoSave` flag; the component is reused unchanged.
 */
import ScanTab from "../../scan-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function ScanTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("scan")}>
            <ScanTab
                initialData={attendance?.scan as never}
                onChange={(data) => autoSave("scan", data)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="scan"
                versions={attendance?.scanVersions as never}
            />
        </div>
    );
}