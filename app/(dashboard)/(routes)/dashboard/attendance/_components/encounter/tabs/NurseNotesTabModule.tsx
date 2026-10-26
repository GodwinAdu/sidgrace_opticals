"use client";

/**
 * Thin wrapper. True as-you-type auto-save: the clinical component emits
 * `onChange` on edit, which the wrapper routes into the attributed, debounced
 * persist (optimistic + rollback + flush-on-blur). The component's own Save
 * button is hidden via the `autoSave` flag; the component is reused unchanged.
 */
import NurseNotesTab from "../../nurses-note-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function NurseNotesTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("nurseNote")}>
            <NurseNotesTab
                initialData={{ nurseNote: (attendance?.nurseNote as string) || "" }}
                onChange={(data) => autoSave("nurseNote", data.nurseNote)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="nurseNote"
                versions={attendance?.nurseNoteVersions as never}
            />
        </div>
    );
}