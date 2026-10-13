"use client";

/**
 * Thin wrapper. True as-you-type auto-save: the clinical component emits
 * `onChange` on edit, which the wrapper routes into the attributed, debounced
 * persist (optimistic + rollback + flush-on-blur). The component's own Save
 * button is hidden via the `autoSave` flag; the component is reused unchanged.
 */
import DoctorNotesTab from "../../doctor-note-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function DoctorNotesTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("doctorNote")}>
            <DoctorNotesTab
                initialData={{ doctorNote: (attendance?.doctorNote as string) || "" }}
                onChange={(data) => autoSave("doctorNote", data.doctorNote)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="doctorNote"
                versions={attendance?.doctorNoteVersions as never}
            />
        </div>
    );
}