"use client";

/**
 * Thin wrapper. True as-you-type auto-save: the clinical component emits
 * `onChange` on edit, which the wrapper routes into the attributed, debounced
 * persist (optimistic + rollback + flush-on-blur). The component's own Save
 * button is hidden via the `autoSave` flag; the component is reused unchanged.
 */
import SurgicalNotesTab from "../../surgical-notes-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function SurgicalNotesTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("surgicalNote")}>
            <SurgicalNotesTab
                initialData={{ surgicalNote: (attendance?.surgicalNote as string) || "" }}
                onChange={(data) => autoSave("surgicalNote", data.surgicalNote)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="surgicalNote"
                versions={attendance?.surgicalNoteVersions as never}
            />
        </div>
    );
}