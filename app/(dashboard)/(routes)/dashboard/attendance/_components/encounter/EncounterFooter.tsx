"use client";

/**
 * EncounterFooter — the record-level action bar for the encounter workspace.
 *
 * Lives inside `EncounterProvider` so it can read the shared encounter state and
 * drive the save lifecycle. Actions:
 *   1. Save          — persists the aggregated fields via `updateAttendance`,
 *                      PRESERVING status (a plain Save never completes a visit).
 *                      On success it reconciles the server-returned doc via
 *                      `setSaved`.
 *   2. Sign encounter — the ONLY action that completes a visit; delegated to
 *                      `SignEncounterButton`, which calls the explicit
 *                      Complete-visit action and is gated by the completion
 *                      checklist (encounter-workspace-redesign spec).
 *   3. Print         — working `window.print()`, scoped to `#encounter-printable`.
 *   4. Export PDF    — explicitly DISABLED ("coming soon"), never a silent no-op.
 *
 * In historical (read-only) mode Save/Sign/Print are disabled.
 */

import { toast } from "sonner";
import { FileDown, Loader2, Printer, Save as SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAttendance } from "@/lib/actions/attendance.actions";
import { useEncounter } from "./EncounterProvider";
import SignEncounterButton from "./SignEncounterButton";
import SaveStatusIndicator from "./SaveStatusIndicator";
import type { AttendanceData } from "./types";

/**
 * Build the record-save payload: the whole working doc minus `_id` and `status`
 * (status is omitted so a plain Save never changes it).
 */
function buildSavePayload(attendance: AttendanceData): Record<string, unknown> {
    const { _id, status, ...rest } = attendance as AttendanceData & { [key: string]: unknown };
    void _id;
    void status;
    return rest;
}

export default function EncounterFooter() {
    const { state, canEdit, setSaving, setSaved } = useEncounter();
    const { attendance, saving, dirty } = state;

    const attendanceId = attendance._id ? String(attendance._id) : undefined;

    const handleSave = async () => {
        if (!canEdit || !attendanceId || saving) return;
        setSaving();
        try {
            const result = await updateAttendance(attendanceId, buildSavePayload(attendance));
            setSaved((result as AttendanceData) ?? undefined);
            toast.success("Visit saved", {
                description: "The encounter record was saved. Visit status is unchanged.",
            });
        } catch (error) {
            console.error("Failed to save encounter:", error);
            setSaved(attendance);
            toast.error("Save failed", {
                description: "Your changes were not saved. Please try again.",
            });
        }
    };

    const handlePrint = () => {
        if (!canEdit) return;
        window.print();
    };

    return (
        <footer
            className="print:hidden sticky bottom-0 z-10 mt-2 flex flex-col gap-3 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-900/95"
            aria-label="Encounter record actions"
        >
            {/* Left: output actions. */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    disabled={!canEdit}
                    title={canEdit ? "Print this encounter" : "Printing is disabled in historical view"}
                >
                    <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Print
                </Button>
                <SaveStatusIndicator />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    aria-disabled="true"
                    title="Export PDF — coming soon"
                    className="cursor-not-allowed"
                >
                    <FileDown className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Export PDF
                    <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Soon
                    </span>
                </Button>
            </div>

            {/* Right: Save + Sign encounter. */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={!canEdit || saving}
                    title={canEdit ? "Save the record (does not change visit status)" : "Saving is disabled in historical view"}
                >
                    {saving ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <SaveIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    )}
                    {saving ? "Saving…" : "Save"}
                    {dirty && canEdit && !saving && (
                        <span
                            className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                            aria-label="Unsaved changes"
                            title="Unsaved changes"
                        />
                    )}
                </Button>

                {/* Sign encounter — the explicit, checklist-gated finalize action. */}
                <SignEncounterButton />
            </div>
        </footer>
    );
}