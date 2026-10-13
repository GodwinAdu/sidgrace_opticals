/**
 * Pure auto-save scheduling/state logic for the encounter workspace.
 *
 * DB-free and React-free so it can be unit-tested in isolation and reused by
 * the `usePersistSection` hook. It encodes the feature's correctness properties
 * at the pure level: the no-op guard (reusing `isMeaningfulChange`), the exact
 * optimistic-rollback value (last SERVER-CONFIRMED content per field), and the
 * worst-of aggregate save state. Debounce timing itself lives in the hook (it
 * needs timers); this module decides WHAT to persist and HOW state transitions.
 */

import { isMeaningfulChange } from "./attribution";

/** The save state of a field (or the aggregate for the whole workspace). */
export type SaveState = "idle" | "saving" | "saved" | "error";

/** Per-field tracking the reducer maintains. */
interface FieldRecord {
    /** Last content the SERVER confirmed — the exact rollback target. */
    confirmed: unknown;
    /** Pending content awaiting persistence (kept for retry on failure). */
    pending: unknown;
    state: SaveState;
}

/**
 * Whether `content` should be persisted for `field` given the last confirmed
 * value. Reuses `isMeaningfulChange` so auto-save and the server-side guard
 * agree on "changed" — a value equal to the latest confirmed one is a no-op and
 * must not create a version (Property 2 / R1.3).
 */
export function shouldPersist(confirmed: unknown, content: unknown): boolean {
    return isMeaningfulChange(confirmed, content);
}

/** Worst-of precedence so an error is never masked by a saved field. */
const STATE_RANK: Record<SaveState, number> = { error: 3, saving: 2, saved: 1, idle: 0 };

/**
 * Aggregate several field states into one indicator value (Property 8 / R4.1):
 * error > saving > saved > idle.
 */
export function aggregateState(states: SaveState[]): SaveState {
    let worst: SaveState = "idle";
    for (const s of states) {
        if (STATE_RANK[s] > STATE_RANK[worst]) worst = s;
    }
    return worst;
}

/**
 * A tiny, pure reducer over a per-field map. Returns NEW maps (never mutates),
 * so it is safe to drive from React state. The hook owns timers/debounce and
 * the network call; this just tracks confirmed/pending content and state so
 * rollback is exact (Property 4) and no-op detection is correct (Property 2).
 */
export function makeAutosaveReducer() {
    type Store = Record<string, FieldRecord>;

    const ensure = (store: Store, field: string): FieldRecord =>
        store[field] ?? { confirmed: undefined, pending: undefined, state: "idle" };

    return {
        /** Mark a field dirty with pending content and move it to "saving". */
        record(store: Store, field: string, content: unknown): Store {
            const rec = ensure(store, field);
            return { ...store, [field]: { ...rec, pending: content, state: "saving" } };
        },
        /** The server confirmed `serverValue`: it becomes the rollback target. */
        confirm(store: Store, field: string, serverValue: unknown): Store {
            const rec = ensure(store, field);
            return {
                ...store,
                [field]: { ...rec, confirmed: serverValue, pending: undefined, state: "saved" },
            };
        },
        /** The save failed: keep pending for retry, surface "error". */
        fail(store: Store, field: string): Store {
            const rec = ensure(store, field);
            return { ...store, [field]: { ...rec, state: "error" } };
        },
        /** The exact value to restore in the UI after a failed save. */
        rollbackValue(store: Store, field: string): unknown {
            return ensure(store, field).confirmed;
        },
        /** Seed the confirmed baseline (e.g. from the loaded visit). */
        seed(store: Store, field: string, value: unknown): Store {
            const rec = ensure(store, field);
            return { ...store, [field]: { ...rec, confirmed: value } };
        },
        /** The aggregate state across all tracked fields. */
        aggregate(store: Store): SaveState {
            return aggregateState(Object.values(store).map((r) => r.state));
        },
        fieldState(store: Store, field: string): SaveState {
            return ensure(store, field).state;
        },
    };
}