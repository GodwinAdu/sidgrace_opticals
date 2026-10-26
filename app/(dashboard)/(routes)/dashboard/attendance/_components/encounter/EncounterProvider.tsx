"use client";

/**
 * EncounterProvider — the single source of truth for the attendance workspace.
 *
 * Holds the reduced encounter state (`attendance`, `mode`, `dirty`, `saving`)
 * and exposes it through React context together with:
 *   - typed action helpers (section/billing patches, historical load/return,
 *     save lifecycle),
 *   - a fail-open `can(flag)` role helper (everything visible when no role is
 *     provided — matching the legacy monolith),
 *   - `canEdit`, derived from `mode` via the pure `canEdit` in
 *     `lib/clinical/encounter.ts` (historical mode is read-only).
 *
 * The provider holds the ORIGINAL current-visit snapshot it was constructed
 * with so `returnToCurrent()` restores it exactly, with no page reload
 * (Property 6). Loading a previous visit never mutates that snapshot.
 *
 * Section edits only update local state (and set `dirty`); they are persisted
 * by the single record Save (matching how these tabs behave today). Panels
 * that own their own persistence dispatch billing patches here but never depend
 * on the record save.
 */

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useRef,
    type ReactNode,
} from "react";
import {
    canEdit as canEditPure,
    nextMode,
    type EncounterMode,
    type RoleFlag,
    type CanFn,
} from "@/lib/clinical/encounter";
import type { AttendanceData, BillingPatch } from "./types";

/** The reduced encounter state. */
export interface EncounterState {
    /** The working visit document. */
    attendance: AttendanceData;
    /** `historical` means read-only; `edit` is the normal editable mode. */
    mode: EncounterMode;
    /** Unsaved record-level edits exist. */
    dirty: boolean;
    /** A record save is in flight. */
    saving: boolean;
}

/** Discriminated union of every action the reducer understands. */
export type EncounterAction =
    | { type: "PATCH_SECTION"; section: keyof AttendanceData | string; data: unknown }
    | { type: "PATCH_BILLING"; data: BillingPatch }
    | { type: "LOAD_HISTORICAL"; attendance: AttendanceData }
    | { type: "RETURN_TO_CURRENT"; attendance: AttendanceData }
    | { type: "SET_SAVING" }
    | { type: "SET_SAVED"; attendance?: AttendanceData };

/**
 * Pure reducer. Exported so the historical-mode tests (Task 10, Properties 5 &
 * 6) can exercise transitions without mounting React.
 */
export function encounterReducer(
    state: EncounterState,
    action: EncounterAction,
): EncounterState {
    switch (action.type) {
        case "PATCH_SECTION": {
            // Historical mode is read-only: no dispatch may mutate the visit.
            if (state.mode === "historical") return state;
            return {
                ...state,
                attendance: {
                    ...state.attendance,
                    [action.section]: action.data,
                } as AttendanceData,
                dirty: true,
            };
        }

        case "PATCH_BILLING": {
            if (state.mode === "historical") return state;
            // Optimistic/reconcile merge onto the same billing slice: the latest
            // values (including server-returned totalCharged/balance) win.
            return {
                ...state,
                attendance: {
                    ...state.attendance,
                    billing: {
                        ...(state.attendance.billing || {}),
                        ...action.data,
                    },
                } as AttendanceData,
            };
        }

        case "LOAD_HISTORICAL": {
            // Enter read-only historical mode with the loaded prior visit.
            // The original snapshot is held outside the reducer (in a ref), so
            // nothing here can clobber it.
            return {
                ...state,
                attendance: action.attendance,
                mode: nextMode(state.mode, "load-historical"),
                dirty: false,
            };
        }

        case "RETURN_TO_CURRENT": {
            // Exact restore of the original current-visit snapshot (Property 6).
            return {
                ...state,
                attendance: action.attendance,
                mode: nextMode(state.mode, "return-to-current"),
                dirty: false,
            };
        }

        case "SET_SAVING":
            return { ...state, saving: true };

        case "SET_SAVED":
            return {
                ...state,
                saving: false,
                dirty: false,
                attendance: action.attendance ?? state.attendance,
            };

        default:
            return state;
    }
}

/** The value exposed through the encounter context. */
export interface EncounterContextValue {
    state: EncounterState;
    dispatch: React.Dispatch<EncounterAction>;

    /** Convenience derived flags. */
    mode: EncounterMode;
    /** Whether the workspace is editable (false in historical mode). */
    canEdit: boolean;
    /** Fail-open role permission helper. */
    can: CanFn;

    /** Action helpers (thin wrappers over `dispatch`). */
    patchSection: (section: keyof AttendanceData | string, data: unknown) => void;
    patchBilling: (data: BillingPatch) => void;
    loadHistorical: (attendance: AttendanceData) => void;
    /** Restore the original current-visit snapshot (no reload). */
    returnToCurrent: () => void;
    setSaving: () => void;
    setSaved: (attendance?: AttendanceData) => void;
}

const EncounterContext = createContext<EncounterContextValue | null>(null);

export interface EncounterProviderProps {
    /** The current visit document loaded by the route/wrapper. */
    initialAttendance: AttendanceData;
    /** The current role; omitted/null means fail-open (all flags true). */
    role?: IRole | null;
    children: ReactNode;
}

/**
 * Build the fail-open `can` helper. With no role (legacy/admin context) every
 * flag reads true so no tab is hidden; with a role, each flag is read from it.
 */
function makeCan(role?: IRole | null): CanFn {
    return (flag: RoleFlag) => (role ? !!role[flag] : true);
}

export function EncounterProvider({
    initialAttendance,
    role,
    children,
}: EncounterProviderProps) {
    const [state, dispatch] = useReducer(encounterReducer, {
        attendance: initialAttendance,
        mode: "edit",
        dirty: false,
        saving: false,
    });

    // The exact original current-visit snapshot, captured once. Held in a ref
    // so it survives re-renders and is never mutated by historical loads —
    // this is what `returnToCurrent()` restores (Property 6).
    const originalAttendance = useRef(initialAttendance);

    const can = useMemo(() => makeCan(role), [role]);

    const patchSection = useCallback(
        (section: keyof AttendanceData | string, data: unknown) =>
            dispatch({ type: "PATCH_SECTION", section, data }),
        [],
    );
    const patchBilling = useCallback(
        (data: BillingPatch) => dispatch({ type: "PATCH_BILLING", data }),
        [],
    );
    const loadHistorical = useCallback(
        (attendance: AttendanceData) =>
            dispatch({ type: "LOAD_HISTORICAL", attendance }),
        [],
    );
    const returnToCurrent = useCallback(
        () =>
            dispatch({
                type: "RETURN_TO_CURRENT",
                attendance: originalAttendance.current,
            }),
        [],
    );
    const setSaving = useCallback(() => dispatch({ type: "SET_SAVING" }), []);
    const setSaved = useCallback(
        (attendance?: AttendanceData) =>
            dispatch({ type: "SET_SAVED", attendance }),
        [],
    );

    const value = useMemo<EncounterContextValue>(
        () => ({
            state,
            dispatch,
            mode: state.mode,
            canEdit: canEditPure(state.mode),
            can,
            patchSection,
            patchBilling,
            loadHistorical,
            returnToCurrent,
            setSaving,
            setSaved,
        }),
        [
            state,
            can,
            patchSection,
            patchBilling,
            loadHistorical,
            returnToCurrent,
            setSaving,
            setSaved,
        ],
    );

    return (
        <EncounterContext.Provider value={value}>
            {children}
        </EncounterContext.Provider>
    );
}

/**
 * Access the encounter context. Throws if used outside an `EncounterProvider`
 * so wiring mistakes fail loudly in development.
 */
export function useEncounter(): EncounterContextValue {
    const ctx = useContext(EncounterContext);
    if (!ctx) {
        throw new Error("useEncounter must be used within an EncounterProvider");
    }
    return ctx;
}
