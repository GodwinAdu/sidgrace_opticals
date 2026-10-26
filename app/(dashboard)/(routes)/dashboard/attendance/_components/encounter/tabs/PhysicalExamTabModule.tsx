"use client";

/**
 * Thin wrapper. True as-you-type auto-save: the clinical component emits
 * `onChange` on edit, which the wrapper routes into the attributed, debounced
 * persist (optimistic + rollback + flush-on-blur). The component's own Save
 * button is hidden via the `autoSave` flag; the component is reused unchanged.
 */
import PhysicalExamTab from "../../physical-exams-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function PhysicalExamTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("physicExam")}>
            <PhysicalExamTab
                initialData={attendance?.physicExam as never}
                onChange={(data) => autoSave("physicExam", data)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="physicExam"
                versions={attendance?.physicExamVersions as never}
            />
        </div>
    );
}