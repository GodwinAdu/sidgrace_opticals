"use client";

/**
 * SignEncounterButton — the redesigned "Sign encounter" action (R4).
 *
 * Finalizing a visit maps to the EXISTING explicit Complete-visit server action
 * (`completeVisit`) — never a plain save, so the status-on-save guarantee is
 * untouched (Property 5). Readiness is computed by the pure `signReadiness` over
 * `buildChecklist`; when required items are outstanding the confirm dialog warns
 * and lists them (warn-then-confirm default, non-blocking). In historical
 * (read-only) mode the button is disabled, consistent with the rest of the
 * workspace (R4.3). Post-sign status is reflected by the existing status display
 * upstream once `setSaved` reconciles the returned doc.
 */

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { completeVisit as completeVisitAction } from "@/lib/actions/attendance.actions";
import { buildChecklist, signReadiness } from "@/lib/clinical/encounter-overview";
import { useEncounter } from "./EncounterProvider";
import type { AttendanceData } from "./types";

/** Build the complete-visit payload: whole doc minus id + status (same as footer). */
function buildPayload(attendance: AttendanceData): Record<string, unknown> {
    const { _id, status, ...rest } = attendance as AttendanceData & { [k: string]: unknown };
    void _id;
    void status;
    return rest;
}

export default function SignEncounterButton() {
    const { state, canEdit, setSaving, setSaved } = useEncounter();
    const { attendance, saving } = state;
    const [signing, setSigning] = useState(false);
    const [open, setOpen] = useState(false);

    const attendanceId = attendance._id ? String(attendance._id) : undefined;
    const busy = saving || signing;

    const checklist = buildChecklist(attendance as never, {
        hasPatient: !!attendance.patientId?._id,
    });
    const { ready, outstanding } = signReadiness(checklist);

    const handleSign = async () => {
        if (!canEdit || !attendanceId || busy) return;
        setOpen(false);
        setSigning(true);
        setSaving();
        try {
            const result = await completeVisitAction(attendanceId, buildPayload(attendance));
            setSaved((result as AttendanceData) ?? undefined);
            toast.success("Encounter signed", {
                description: "The visit was saved and marked as completed.",
            });
        } catch (error) {
            console.error("Failed to sign encounter:", error);
            setSaved(attendance);
            toast.error("Could not sign encounter", {
                description: "The visit was not completed. Please try again.",
            });
        } finally {
            setSigning(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    size="sm"
                    disabled={!canEdit || busy}
                    title={canEdit ? "Save and finalize this encounter" : "Signing is disabled in historical view"}
                >
                    {signing ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    )}
                    {signing ? "Signing…" : "Sign encounter"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sign this encounter?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This saves the record and marks the visit as <strong>completed</strong>. You can still
                        view it afterwards.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {!ready && outstanding.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                        <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            Some required items are incomplete
                        </div>
                        <ul className="mt-2 list-inside list-disc text-xs text-amber-800/90 dark:text-amber-300/80">
                            {outstanding.map((o) => (
                                <li key={o.id}>{o.label}</li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/70">
                            You can still sign, but consider completing these first.
                        </p>
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            void handleSign();
                        }}
                        disabled={busy}
                    >
                        Sign encounter
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}