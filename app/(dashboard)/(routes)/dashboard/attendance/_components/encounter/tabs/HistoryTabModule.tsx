"use client";

/**
 * Thin wrapper around `HistoryTab`. True as-you-type auto-save: the component
 * fires `onChange` on every edit → debounced attributed persist (optimistic +
 * rollback + flush-on-blur). The component's own Save button is hidden
 * (`autoSave`); persistence is automatic. Reused component, additive props.
 */
import HistoryTab from "../../history-tab";
import { SectionAttribution } from "../attribution-blocks";
import { usePersistSection } from "../usePersistSection";
import type { EncounterTabProps } from "./types";

export default function HistoryTabModule({ attendance, attendanceId, readOnly }: EncounterTabProps) {
    const { autoSave, flush } = usePersistSection();
    return (
        <div onBlur={() => void flush("history")}>
            <HistoryTab
                initialData={attendance?.history as never}
                onChange={(data) => autoSave("history", data)}
                autoSave
                readOnly={readOnly}
            />
            <SectionAttribution
                attendanceId={attendanceId}
                field="history"
                versions={attendance?.historyVersions as never}
            />
        </div>
    );
}