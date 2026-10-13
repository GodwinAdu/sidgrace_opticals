"use client";

/**
 * usePersistSection — persist tracked clinical sections, with explicit save AND
 * debounced full auto-save (encounter-autosave spec).
 *
 * All persistence routes through the SAME attributed, append-only
 * `saveClinicalSection` action — no alternate write path — so every persisted
 * change appends a version + a History audit entry, with attribution from the
 * server session (never the client). The status-on-save guarantee is preserved:
 * nothing here completes a visit.
 *
 *   - `save(field, content)`      — explicit immediate persist (Save button).
 *   - `autoSave(field, content)`  — optimistic update now + per-field debounced
 *                                   persist (~1500ms). No-op content (equal to
 *                                   the last confirmed value) is never sent.
 *                                   Historical / no visit id → local stage only.
 *   - `flush(field?)`             — run pending debounced save(s) now and await.
 *   - `saveState` / `fieldState`  — per-field + aggregate save state.
 *
 * The hook also drives the provider's `saving` / `dirty` flags (via
 * `setSaving` / `setSaved`, no attendance overwrite) so a shared
 * SaveStatusIndicator can reflect auto-save progress. On failure the optimistic
 * edit rolls back to the last SERVER-CONFIRMED value and the field goes "error".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { saveClinicalSection, type TrackedClinicalField } from "@/lib/actions/clinical-section.actions";
import { makeAutosaveReducer, shouldPersist, type SaveState } from "@/lib/clinical/autosave";
import { useEncounter } from "./EncounterProvider";

/** Debounce before an auto-save fires after the last change (A1). */
const AUTOSAVE_DEBOUNCE_MS = 1500;

type Store = Record<string, { confirmed: unknown; pending: unknown; state: SaveState }>;

export interface PersistSectionResult {
    save: (field: TrackedClinicalField, content: unknown) => Promise<boolean>;
    autoSave: (field: TrackedClinicalField, content: unknown) => void;
    flush: (field?: TrackedClinicalField) => Promise<void>;
    saving: boolean;
    saveState: SaveState;
    fieldState: (field: TrackedClinicalField) => SaveState;
}

export function usePersistSection(): PersistSectionResult {
    const {
        state,
        mode,
        patchSection,
        setSaving: providerSetSaving,
        setSaved: providerSetSaved,
    } = useEncounter();
    const pathname = usePathname();

    const attendanceId = state.attendance?._id ? String(state.attendance._id) : "";
    const isHistorical = mode === "historical";

    const reducer = useRef(makeAutosaveReducer()).current;
    const [store, setStore] = useState<Store>({});
    const storeRef = useRef<Store>(store);
    storeRef.current = store;

    const [saving, setSaving] = useState(false);

    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const latest = useRef<Map<string, unknown>>(new Map());

    const performSave = useCallback(
        async (field: TrackedClinicalField, content: unknown): Promise<boolean> => {
            if (isHistorical || !attendanceId) {
                patchSection(field, content);
                return false;
            }
            // No-op guard against the last confirmed value (Property 2).
            const confirmed = reducer.rollbackValue(storeRef.current, field);
            if (!shouldPersist(confirmed, content)) return true;

            setStore((s) => reducer.record(s, field, content));
            setSaving(true);
            providerSetSaving();
            try {
                const result = (await saveClinicalSection(
                    attendanceId,
                    field,
                    content,
                    pathname || undefined,
                )) as { field: string; value: unknown; versions: unknown };

                // Reconcile server truth → attribution renders immediately (R2.3).
                patchSection(field, result.value);
                patchSection(`${field}Versions`, result.versions);
                setStore((s) => reducer.confirm(s, field, result.value));
                providerSetSaved();
                return true;
            } catch (error) {
                console.error("Failed to persist clinical section:", error);
                // Exact rollback to the last confirmed value (Property 4).
                const rollback = reducer.rollbackValue(storeRef.current, field);
                patchSection(field, rollback);
                setStore((s) => reducer.fail(s, field));
                providerSetSaved();
                toast.error("Save failed", {
                    description: "Your change was not saved — it has been reverted. Please retry.",
                });
                return false;
            } finally {
                setSaving(false);
            }
        },
        [attendanceId, isHistorical, patchSection, pathname, reducer, providerSetSaving, providerSetSaved],
    );

    const save = useCallback(
        async (field: TrackedClinicalField, content: unknown): Promise<boolean> => {
            const t = timers.current.get(field);
            if (t) {
                clearTimeout(t);
                timers.current.delete(field);
            }
            latest.current.delete(field);
            return performSave(field, content);
        },
        [performSave],
    );

    const autoSave = useCallback(
        (field: TrackedClinicalField, content: unknown) => {
            // Optimistic UI update immediately (R2.1).
            patchSection(field, content);
            if (isHistorical || !attendanceId) return; // local stage only
            latest.current.set(field, content);
            const existing = timers.current.get(field);
            if (existing) clearTimeout(existing);
            const timer = setTimeout(() => {
                timers.current.delete(field);
                const pending = latest.current.get(field);
                latest.current.delete(field);
                void performSave(field, pending);
            }, AUTOSAVE_DEBOUNCE_MS);
            timers.current.set(field, timer);
        },
        [attendanceId, isHistorical, patchSection, performSave],
    );

    const flush = useCallback(
        async (field?: TrackedClinicalField): Promise<void> => {
            const fields = field ? [field] : Array.from(timers.current.keys());
            await Promise.all(
                fields.map(async (f) => {
                    const t = timers.current.get(f);
                    if (t) {
                        clearTimeout(t);
                        timers.current.delete(f);
                    }
                    if (latest.current.has(f)) {
                        const pending = latest.current.get(f);
                        latest.current.delete(f);
                        await performSave(f as TrackedClinicalField, pending);
                    }
                }),
            );
        },
        [performSave],
    );

    // Best-effort flush on unmount so a pending edit is not dropped (R5.2).
    useEffect(() => {
        return () => {
            const pendingFields = Array.from(latest.current.entries());
            for (const [, timer] of timers.current) clearTimeout(timer);
            timers.current.clear();
            latest.current.clear();
            if (attendanceId && !isHistorical) {
                for (const [f, content] of pendingFields) {
                    void performSave(f as TrackedClinicalField, content);
                }
            }
        };
        // Run cleanup only on unmount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fieldState = useCallback(
        (field: TrackedClinicalField): SaveState => reducer.fieldState(store, field),
        [reducer, store],
    );

    return {
        save,
        autoSave,
        flush,
        saving,
        saveState: reducer.aggregate(store),
        fieldState,
    };
}