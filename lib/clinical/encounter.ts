/**
 * Pure encounter-workspace logic for the attendance detail screen.
 *
 * Kept free of DB / React so it can be unit-tested in isolation and reused by
 * the shell, tab registry, provider, and footer. These functions reproduce the
 * exact behavior of the legacy `ConsultingPage.tsx` monolith:
 *   - role-based tab gating (fail-open when no role is provided),
 *   - the `firstVisibleTab` default-tab precedence,
 *   - billing roll-up math for the header/billing summary,
 *   - edit / historical mode transitions and the read-only `canEdit` flag.
 */

/** A role permission flag name. Mirrors the `att*` / module keys on `IRole`. */
export type RoleFlag = keyof IRole;

/**
 * Permission predicate. Returns whether the current role has the given flag.
 * Callers supply a fail-open implementation when no role is present (so legacy
 * / admin contexts see every tab), matching the monolith's `can` helper.
 */
export type CanFn = (flag: RoleFlag) => boolean;

/** Visual grouping for the tab navigation. Does not affect gating. */
export type TabGroup =
    | "clinical"
    | "diagnostics"
    | "nursing"
    | "specialty"
    | "orders"
    | "billing";

/**
 * Extra context a gate may consult beyond the role flags.
 *  - `hasAdmission`: there is an active inpatient admission for this visit.
 *  - `hasPatient`: a patient is linked to the visit (drives the per-tab
 *     "No patient linked" fallback upstream).
 */
export interface GateContext {
    hasAdmission: boolean;
    hasPatient: boolean;
}

/**
 * Declarative description of one encounter tab. The `load` loader (a
 * `React.lazy` import) lives on the registry entries in the UI layer; the pure
 * layer only needs identity, grouping, and the gate to resolve visibility and
 * ordering. `load` is typed loosely here to keep this module React-free.
 */
export interface EncounterTab {
    /** Stable tab value, e.g. "history", "lab-report", "icu-chart". */
    id: string;
    label: string;
    /** Short label used on small screens. */
    shortLabel: string;
    group: TabGroup;
    /** Returns whether this tab is visible for the given role + context. */
    gate: (can: CanFn, ctx: GateContext) => boolean;
    /** Lazy module loader (React.lazy); opaque to the pure layer. */
    load?: () => Promise<unknown>;
    /** Optional icon reference; opaque to the pure layer. */
    icon?: unknown;
}

/** Editing mode for the workspace. `historical` means read-only. */
export type EncounterMode = "edit" | "historical";

/** Actions that drive mode transitions. */
export type ModeAction = "load-historical" | "return-to-current";

/**
 * Billing slice shape consumed by the roll-up. Mirrors the embedded
 * `attendance.billing` document fields used by the monolith header/summary.
 */
export interface BillingSlice {
    consultationFee?: number | null;
    proceduresTotal?: number | null;
    productsTotal?: number | null;
    otherCharges?: { label?: string; amount?: number | null }[] | null;
    amountPaid?: number | null;
    /** Server-reconciled values, if present, win over the computed ones. */
    totalCharged?: number | null;
    balance?: number | null;
}

/** Result of the billing roll-up used by the header + billing tab. */
export interface BillingRollUp {
    consultationFee: number;
    proceduresTotal: number;
    productsTotal: number;
    otherChargesTotal: number;
    totalCharged: number;
    amountPaid: number;
    balance: number;
}

/** Coerce an unknown numeric field to a finite number, defaulting to 0. */
function num(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Resolve the ordered set of tabs the current role may see.
 *
 * Preserves the monolith's rules exactly: each tab's `gate` is evaluated with
 * the fail-open `can` helper (everything visible when no role is provided) and
 * the admission-aware `ctx`. Input order is preserved so the registry's fixed
 * ordering drives both the tab bar and `firstVisibleTab`.
 */
export function resolveVisibleTabs(
    tabs: EncounterTab[],
    can: CanFn,
    ctx: GateContext,
): EncounterTab[] {
    return tabs.filter((tab) => tab.gate(can, ctx));
}

/**
 * The default/active tab on load: the first tab the user is permitted to see,
 * following the monolith's fixed precedence. Operates on the already-resolved
 * visible list so it can never return a hidden tab.
 *
 * The legacy precedence (attClinical→history, attLabScan→lab-report,
 * attEyeTest→eye-test, attNursing→nursing-notes, attTreatment→treatment-plan,
 * attPrescribe→prescribe, attBilling→billing, else history) is encoded by the
 * registry's tab order, so "first visible tab" reproduces it. When nothing is
 * visible we fall back to "history" to match the monolith's final default.
 */
export function firstVisibleTab(visibleTabs: EncounterTab[]): string {
    return visibleTabs.length > 0 ? visibleTabs[0].id : "history";
}

/**
 * Pure billing roll-up for the header and billing summary.
 *
 * total charged = consultation + procedures + products + other charges
 * balance       = total charged − amount paid
 *
 * Server-returned `totalCharged` / `balance` (reconciled values) take
 * precedence over the computed figures for the same slice, matching the
 * optimistic-then-reconcile behavior of the monolith.
 */
export function rollUpBilling(billing: BillingSlice | null | undefined): BillingRollUp {
    const b = billing || {};
    const consultationFee = num(b.consultationFee);
    const proceduresTotal = num(b.proceduresTotal);
    const productsTotal = num(b.productsTotal);
    const otherChargesTotal = (b.otherCharges || []).reduce(
        (sum, charge) => sum + num(charge?.amount),
        0,
    );

    const computedTotal = consultationFee + proceduresTotal + productsTotal + otherChargesTotal;
    const totalCharged =
        b.totalCharged === null || b.totalCharged === undefined
            ? computedTotal
            : num(b.totalCharged);

    const amountPaid = num(b.amountPaid);
    const balance =
        b.balance === null || b.balance === undefined
            ? totalCharged - amountPaid
            : num(b.balance);

    return {
        consultationFee,
        proceduresTotal,
        productsTotal,
        otherChargesTotal,
        totalCharged,
        amountPaid,
        balance,
    };
}

/**
 * Edit ⇄ historical mode transition. Loading a previous visit enters
 * read-only historical mode; returning to the current visit restores edit
 * mode. Any other combination is a no-op on the current mode.
 */
export function nextMode(current: EncounterMode, action: ModeAction): EncounterMode {
    switch (action) {
        case "load-historical":
            return "historical";
        case "return-to-current":
            return "edit";
        default:
            return current;
    }
}

/** Whether the workspace is editable. Historical mode is read-only. */
export function canEdit(mode: EncounterMode): boolean {
    return mode === "edit";
}

/**
 * The set of visit statuses the attendance document recognizes. Mirrors the
 * `status` enum on the Attendance schema.
 */
export type VisitStatus = "waiting" | "ongoing" | "completed" | "cancelled";

/**
 * Pure status-decision helper for the record save (Req 4.3, Properties 3 & 4).
 *
 * This encodes the fix for the legacy bug where `_updateAttendanceById`
 * unconditionally forced `status = "completed"` on every save, so any plain
 * Save silently completed an in-progress visit. The decision is intentionally
 * DB-free so it can be unit-tested in isolation and reused by the server action
 * and the footer's explicit Complete action.
 *
 * Rules:
 *  - **Save preserves status (Property 3):** when no status is requested, the
 *    resolved status is the visit's current status — a plain Save never
 *    changes it, and never silently completes an in-progress visit.
 *  - **Complete is explicit (Property 4):** when the caller requests
 *    `"completed"` (the footer Complete Visit action), the resolved status is
 *    `"completed"`; completing an already-completed visit is a no-op on status
 *    (still `"completed"`), so Complete is idempotent.
 *  - A requested status other than undefined always wins over the current one,
 *    letting the workspace drive any intentional transition (e.g. ongoing).
 *
 * @param currentStatus  the visit's existing status (defaults to "waiting"
 *                        when absent, matching the schema default).
 * @param requestedStatus the status the save payload intends, or undefined to
 *                        preserve the current status.
 */
export function resolveSaveStatus(
    currentStatus: VisitStatus | null | undefined,
    requestedStatus?: VisitStatus | null,
): VisitStatus {
    const current: VisitStatus = currentStatus ?? "waiting";
    if (requestedStatus === null || requestedStatus === undefined) {
        return current;
    }
    return requestedStatus;
}

/**
 * The resolved status for the explicit "Complete Visit" footer action
 * (Property 4). Always resolves to `"completed"`, regardless of the current
 * status, so completing is explicit and idempotent.
 */
export function resolveCompleteStatus(): VisitStatus {
    return "completed";
}
