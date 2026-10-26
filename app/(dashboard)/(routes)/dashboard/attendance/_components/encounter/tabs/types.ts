/**
 * Shared types for the encounter tab layer.
 *
 * `EncounterTabProps` is the uniform prop contract every lazy-loaded tab module
 * receives from the workspace shell. The shell (Task 5) + provider (Task 3)
 * supply these; the thin wrappers created in Tasks 6-8 adapt them to each
 * existing `*-tab` / `*Panel` component's own prop shape.
 *
 * It is intentionally permissive for now (the provider does not exist yet). As
 * the provider and wrappers are built out in later tasks, individual wrappers
 * read only the fields they need; this contract can tighten without breaking
 * the registry's `load()` typing.
 */
import type { ComponentType } from "react";

export interface EncounterTabProps {
    /** Working attendance document for the active (or historical) visit. */
    attendance?: Record<string, unknown>;
    /** Mongo _id of the attendance document. */
    attendanceId?: string;
    /** Mongo _id of the linked patient, when one is linked to the visit. */
    patientId?: string;
    /** Read-only when the workspace is in historical mode (or role lacks write). */
    readOnly?: boolean;
    /** Active admission context for inpatient / ICU tabs. */
    admission?: AdmissionContext | null;
    /** Dispatch a section-level patch into encounter state (Tasks 3 & 6). */
    onPatchSection?: (section: string, data: unknown) => void;
    /** Dispatch a billing-slice patch (Visit Procedures / Dental Plan, Task 8). */
    onPatchBilling?: (billing: Record<string, unknown>) => void;
}

/** A tab module is a React component accepting the uniform tab props. */
export type EncounterTabComponent = ComponentType<EncounterTabProps>;

/** The `{ default }` shape a `React.lazy` loader must resolve to. */
export type EncounterTabModule = { default: EncounterTabComponent };

/**
 * Active-admission context passed to inpatient / ICU tabs. Mirrors the shape
 * the route page populates and the monolith consumed.
 */
export interface AdmissionContext {
    _id?: string;
    admittedAt?: string;
    wardId?: { name?: string } | string;
    bedId?: { label?: string } | string;
}
