/**
 * Pure blood-bank & specimen helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused on
 * both the server (actions) and client (blood-bank view). The non-trivial pure
 * logic here is:
 *   - ABO/Rh group compatibility for a red-cell crossmatch (who can receive
 *     from whom),
 *   - blood-unit expiry / effective-status derivation (an expired unit is never
 *     issuable regardless of its stored status),
 *   - the allowed blood-unit status transitions (available → reserved → issued,
 *     with discard reachable from any live state),
 *   - the allowed specimen lifecycle transitions (collected → in-transit →
 *     received → processed, with rejected reachable before processing).
 *
 * All of it is small, deterministic logic with clinical-safety consequences, so
 * it lives behind named functions with unit tests rather than inline in the
 * actions.
 */

/* ───────────────────────────── Blood groups ─────────────────────────────── */

/** The eight ABO/Rh blood groups. */
export type BloodGroup = "O-" | "O+" | "A-" | "A+" | "B-" | "B+" | "AB-" | "AB+";

export const BLOOD_GROUPS: BloodGroup[] = [
    "O-",
    "O+",
    "A-",
    "A+",
    "B-",
    "B+",
    "AB-",
    "AB+",
];

/** Blood component types a unit can hold. */
export type BloodComponent =
    | "whole-blood"
    | "red-cells"
    | "plasma"
    | "platelets"
    | "cryoprecipitate";

export const BLOOD_COMPONENTS: { value: BloodComponent; label: string }[] = [
    { value: "whole-blood", label: "Whole blood" },
    { value: "red-cells", label: "Packed red cells" },
    { value: "plasma", label: "Fresh frozen plasma" },
    { value: "platelets", label: "Platelets" },
    { value: "cryoprecipitate", label: "Cryoprecipitate" },
];

/** Blood-unit statuses, in lifecycle order (discarded is terminal). */
export type BloodUnitStatus = "available" | "reserved" | "issued" | "discarded";

export const BLOOD_UNIT_STATUSES: { value: BloodUnitStatus; label: string }[] = [
    { value: "available", label: "Available" },
    { value: "reserved", label: "Reserved" },
    { value: "issued", label: "Issued" },
    { value: "discarded", label: "Discarded" },
];

/** Specimen lifecycle statuses, in order (rejected is terminal). */
export type SpecimenStatus =
    | "collected"
    | "in-transit"
    | "received"
    | "processed"
    | "rejected";

export const SPECIMEN_STATUSES: { value: SpecimenStatus; label: string }[] = [
    { value: "collected", label: "Collected" },
    { value: "in-transit", label: "In transit" },
    { value: "received", label: "Received" },
    { value: "processed", label: "Processed" },
    { value: "rejected", label: "Rejected" },
];

/* ─────────────────────────── Group compatibility ────────────────────────── */

/**
 * Which donor groups a recipient of each group can safely receive **red cells**
 * from (classic ABO/Rh red-cell compatibility). Rh-negative recipients must get
 * Rh-negative blood; Rh-positive recipients may get either. O- is the universal
 * red-cell donor; AB+ is the universal recipient.
 */
const RED_CELL_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

function normaliseGroup(group?: string | null): BloodGroup | null {
    if (!group) return null;
    const g = group.trim().toUpperCase();
    return (BLOOD_GROUPS as string[]).includes(g) ? (g as BloodGroup) : null;
}

/**
 * True when a red-cell unit of `donorGroup` can be safely transfused to a
 * recipient of `recipientGroup`. Returns false for any unrecognised group so an
 * unknown group never falsely passes a crossmatch.
 */
export function isCompatible(
    donorGroup?: string | null,
    recipientGroup?: string | null,
): boolean {
    const donor = normaliseGroup(donorGroup);
    const recipient = normaliseGroup(recipientGroup);
    if (!donor || !recipient) return false;
    return RED_CELL_COMPATIBILITY[recipient].includes(donor);
}

/** The list of donor groups a recipient of `recipientGroup` may receive. */
export function compatibleDonorGroups(recipientGroup?: string | null): BloodGroup[] {
    const recipient = normaliseGroup(recipientGroup);
    return recipient ? [...RED_CELL_COMPATIBILITY[recipient]] : [];
}

/* ───────────────────────────── Expiry / status ──────────────────────────── */

function toTime(value?: string | Date | null): number {
    if (!value) return Number.NaN;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? Number.NaN : t;
}

/**
 * True when the unit's expiry date is strictly before `asOf` (default: now). A
 * missing/unusable expiry is treated as not expired (unknown ≠ expired) so a
 * bad date never silently discards stock.
 */
export function isExpired(expiry?: string | Date | null, asOf?: string | Date | null): boolean {
    const exp = toTime(expiry);
    if (Number.isNaN(exp)) return false;
    const now = toTime(asOf ?? new Date());
    const ref = Number.isNaN(now) ? Date.now() : now;
    return exp < ref;
}

/**
 * The *effective* status of a unit, accounting for expiry. A unit that has
 * passed its expiry is reported as "expired" regardless of its stored status
 * (unless it was already discarded, which is terminal). Otherwise the stored
 * status is returned unchanged. This is the status the UI should show and the
 * gate the issue path should consult.
 */
export function effectiveStatus(
    status: BloodUnitStatus,
    expiry?: string | Date | null,
    asOf?: string | Date | null,
): BloodUnitStatus | "expired" {
    if (status === "discarded") return "discarded";
    if (isExpired(expiry, asOf)) return "expired";
    return status;
}

/**
 * Whether a unit can be reserved/issued to a patient right now: it must be
 * `available` (not already reserved/issued/discarded) and not expired.
 */
export function isIssuable(
    status: BloodUnitStatus,
    expiry?: string | Date | null,
    asOf?: string | Date | null,
): boolean {
    return effectiveStatus(status, expiry, asOf) === "available";
}

/* ─────────────────────── Blood-unit status transitions ──────────────────── */

const BLOOD_UNIT_TRANSITIONS: Record<BloodUnitStatus, BloodUnitStatus[]> = {
    // Available stock can be reserved, issued directly, or discarded.
    available: ["reserved", "issued", "discarded"],
    // A reserved unit can be issued, released back to available, or discarded.
    reserved: ["issued", "available", "discarded"],
    // Issued is effectively terminal, but a mis-issue can be discarded.
    issued: ["discarded"],
    // Discarded is terminal.
    discarded: [],
};

/** True when `from → to` is an allowed blood-unit status transition. */
export function canTransitionUnit(from: BloodUnitStatus, to: BloodUnitStatus): boolean {
    if (from === to) return false;
    return (BLOOD_UNIT_TRANSITIONS[from] ?? []).includes(to);
}

/* ──────────────────────── Specimen lifecycle transitions ────────────────── */

const SPECIMEN_TRANSITIONS: Record<SpecimenStatus, SpecimenStatus[]> = {
    collected: ["in-transit", "received", "rejected"],
    "in-transit": ["received", "rejected"],
    received: ["processed", "rejected"],
    // Processed and rejected are terminal.
    processed: [],
    rejected: [],
};

/** True when `from → to` is an allowed specimen lifecycle transition. */
export function canTransitionSpecimen(from: SpecimenStatus, to: SpecimenStatus): boolean {
    if (from === to) return false;
    return (SPECIMEN_TRANSITIONS[from] ?? []).includes(to);
}
