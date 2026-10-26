"use client";

/**
 * SaveStatusIndicator — the auto-save status pill (R4).
 *
 * Reads the SHARED provider state (`state.saving` / `state.dirty`), which the
 * `usePersistSection` hook drives via `setSaving` / `setSaved`, so one indicator
 * reflects auto-save progress regardless of which section triggered it:
 *   - saving   → "Saving…"
 *   - dirty    → "Unsaved changes"
 *   - clean    → "All changes saved"
 * Hidden in historical (read-only) mode, where nothing is being saved.
 */

import { Check, Loader2, Pencil } from "lucide-react";
import { useEncounter } from "./EncounterProvider";

export default function SaveStatusIndicator() {
    const { state, mode } = useEncounter();
    if (mode === "historical") return null;

    const { saving, dirty } = state;

    if (saving) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving…
            </span>
        );
    }
    if (dirty) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600" role="status" aria-live="polite">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Unsaved changes
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600" role="status" aria-live="polite">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            All changes saved
        </span>
    );
}