/**
 * Declarative encounter tab registry.
 *
 * Lists every tab the legacy `ConsultingPage.tsx` monolith rendered, each with
 * a stable id, label/shortLabel, visual group, Lucide icon, a `gate` that
 * reproduces the monolith's exact role rules, and a `React.lazy` `load()` that
 * code-splits the tab module (Req 6.2 — inactive tabs don't execute on initial
 * render).
 *
 * Gating + ordering reuse the pure layer in `lib/clinical/encounter.ts`
 * (`resolveVisibleTabs`, `firstVisibleTab`, `CanFn`, `GateContext`, `TabGroup`).
 *
 * CRITICAL ORDERING (do not reorder casually): the monolith has two separate
 * orderings — the JSX render order and an explicit `firstVisibleTab` precedence
 * chain (attClinical → attLabScan → attEyeTest → attNursing → attTreatment →
 * attPrescribe → attBilling). The pure `firstVisibleTab` returns the FIRST
 * visible tab, so the first tab of each gate-group below MUST appear in that
 * precedence order for the default-tab behavior to match the monolith. In
 * particular, Eye Test (attEyeTest) MUST come before Nursing Notes (attNursing).
 *
 * The `procedures` TabsContent in the monolith has no trigger (dead/hidden), so
 * it is intentionally omitted here — "Plan & Follow-up" (treatment-plan) carries
 * Visit Procedures per Req 1.1.
 */
import { lazy } from "react";
import {
    FileText,
    Stethoscope,
    Microscope,
    ImageIcon,
    ClipboardList,
    Activity,
    Pill,
    Eye,
    AlertTriangle,
    Scissors,
    History,
    type LucideIcon,
} from "lucide-react";
import {
    resolveVisibleTabs as resolveVisibleTabsPure,
    firstVisibleTab as firstVisibleTabPure,
    type CanFn,
    type GateContext,
    type TabGroup,
} from "@/lib/clinical/encounter";
import type { EncounterTabComponent } from "./types";

export type { CanFn, GateContext, TabGroup } from "@/lib/clinical/encounter";

/**
 * A fully-described registry tab. Extends the pure gating contract with the UI
 * concerns the pure layer deliberately leaves opaque: a concrete Lucide `icon`
 * and a `React.lazy` `load()` resolving to `{ default }`.
 */
export interface RegisteredTab {
    /** Stable tab value, matching the monolith's `TabsTrigger` value. */
    id: string;
    label: string;
    /** Short label used on small screens. */
    shortLabel: string;
    group: TabGroup;
    icon: LucideIcon;
    /** Visible for the given role + context? Reproduces the monolith rules. */
    gate: (can: CanFn, ctx: GateContext) => boolean;
    /** Lazy module loader; mounts only when the tab is first opened. */
    load: () => Promise<{ default: EncounterTabComponent }>;
}

/** Gate helpers — one per monolith `can(...)` grouping. */
const clinical = (can: CanFn) => can("attClinical");
const labScan = (can: CanFn) => can("attLabScan");
const eyeTest = (can: CanFn) => can("attEyeTest");
const treatment = (can: CanFn) => can("attTreatment");
const prescribe = (can: CanFn) => can("attPrescribe");
const billing = (can: CanFn) => can("attBilling");
const nursing = (can: CanFn) => can("attNursing");
/** Audit log: restricted to the dedicated audit-view permission (R5.1); admin
 *  bypasses via `withAuth` upstream. Appended last so it never becomes the
 *  default tab via `firstVisibleTab`. */
const auditLog = (can: CanFn) => can("auditView");
/** ICU: active admission AND (attNursing OR icuManagement) — matches monolith. */
const icu = (can: CanFn, ctx: GateContext) =>
    ctx.hasAdmission && (can("attNursing") || can("icuManagement"));

/**
 * The ordered tab registry. Order is chosen so the first tab of each gate-group
 * follows the monolith's `firstVisibleTab` precedence chain (see file header):
 * history → lab-report → eye-test → nursing-notes → treatment-plan → prescribe
 * → billing.
 */
export const encounterTabs: RegisteredTab[] = [
    // ── Clinical (attClinical) ──
    {
        id: "history",
        label: "History",
        shortLabel: "Hist",
        group: "clinical",
        icon: FileText,
        gate: clinical,
        load: () => import("./HistoryTabModule"),
    },
    {
        id: "physic-exam",
        label: "Physical Exam",
        shortLabel: "Exam",
        group: "clinical",
        icon: Stethoscope,
        gate: clinical,
        load: () => import("./PhysicalExamTabModule"),
    },
    {
        id: "diagnosis",
        label: "Diagnosis",
        shortLabel: "Diag",
        group: "clinical",
        icon: AlertTriangle,
        gate: clinical,
        load: () => import("./DiagnosisTabModule"),
    },
    {
        id: "dr-notes",
        label: "Dr's Notes",
        shortLabel: "Dr",
        group: "clinical",
        icon: ClipboardList,
        gate: clinical,
        load: () => import("./DoctorNotesTabModule"),
    },
    {
        id: "nurse-notes",
        label: "Nurse's Notes",
        shortLabel: "Nurse",
        group: "clinical",
        icon: ClipboardList,
        gate: clinical,
        load: () => import("./NurseNotesTabModule"),
    },
    {
        id: "vitals",
        label: "Vitals",
        shortLabel: "Vitals",
        group: "clinical",
        icon: Activity,
        gate: clinical,
        load: () => import("./VitalsTabModule"),
    },
    {
        id: "surgical-notes",
        label: "Surgical Notes",
        shortLabel: "Surgery",
        group: "clinical",
        icon: Scissors,
        gate: clinical,
        load: () => import("./SurgicalNotesTabModule"),
    },
    {
        id: "dental-chart",
        label: "Dental Chart",
        shortLabel: "Chart",
        group: "specialty",
        icon: Stethoscope,
        gate: clinical,
        load: () => import("./DentalChartTabModule"),
    },
    {
        id: "clinical-notes",
        label: "Dental Notes",
        shortLabel: "SOAP",
        group: "specialty",
        icon: FileText,
        gate: clinical,
        load: () => import("./DentalNotesTabModule"),
    },
    {
        id: "perio",
        label: "Perio",
        shortLabel: "Perio",
        group: "specialty",
        icon: Activity,
        gate: clinical,
        load: () => import("./PerioTabModule"),
    },

    // ── Diagnostics (attLabScan) ──
    {
        id: "lab-report",
        label: "Lab Report",
        shortLabel: "Lab",
        group: "diagnostics",
        icon: Microscope,
        gate: labScan,
        load: () => import("./LabReportTabModule"),
    },
    {
        id: "scan",
        label: "Scan/Image",
        shortLabel: "Scan",
        group: "diagnostics",
        icon: ImageIcon,
        gate: labScan,
        load: () => import("./ScanTabModule"),
    },
    {
        id: "imaging",
        label: "Imaging",
        shortLabel: "Imaging",
        group: "diagnostics",
        icon: ImageIcon,
        gate: labScan,
        load: () => import("./ImagingTabModule"),
    },

    // ── Specialty: Eye (attEyeTest) ── (MUST precede nursing in the chain) ──
    {
        id: "eye-test",
        label: "Eye Test",
        shortLabel: "Eye",
        group: "specialty",
        icon: Eye,
        gate: eyeTest,
        load: () => import("./EyeTestTabModule"),
    },

    // ── Nursing / Inpatient (attNursing; ICU gated separately) ──
    {
        id: "nursing-notes",
        label: "Nursing Notes",
        shortLabel: "Nursing",
        group: "nursing",
        icon: ClipboardList,
        gate: nursing,
        load: () => import("./NursingNotesTabModule"),
    },
    {
        id: "mar",
        label: "Med Admin",
        shortLabel: "MAR",
        group: "nursing",
        icon: Pill,
        gate: nursing,
        load: () => import("./MedicationAdminTabModule"),
    },
    {
        id: "intake-output",
        label: "Intake/Output",
        shortLabel: "I/O",
        group: "nursing",
        icon: Activity,
        gate: nursing,
        load: () => import("./IntakeOutputTabModule"),
    },
    {
        id: "icu-chart",
        label: "ICU Chart",
        shortLabel: "ICU",
        group: "nursing",
        icon: ClipboardList,
        gate: icu,
        load: () => import("./IcuChartTabModule"),
    },

    // ── Orders (attTreatment / attPrescribe) ──
    {
        id: "treatment-plan",
        label: "Plan & Follow-up",
        shortLabel: "Follow-up",
        group: "orders",
        icon: ClipboardList,
        gate: treatment,
        load: () => import("./TreatmentPlanTabModule"),
    },
    {
        id: "dental-plan",
        label: "Treatment Plan",
        shortLabel: "Tx Plan",
        group: "orders",
        icon: Stethoscope,
        gate: treatment,
        load: () => import("./DentalPlanTabModule"),
    },
    {
        id: "lab-case",
        label: "Lab Case",
        shortLabel: "Lab",
        group: "orders",
        icon: Microscope,
        gate: treatment,
        load: () => import("./LabCaseTabModule"),
    },
    {
        id: "prescribe",
        label: "Prescribe",
        shortLabel: "Rx",
        group: "orders",
        icon: Pill,
        gate: prescribe,
        load: () => import("./PrescribeTabModule"),
    },

    // ── Billing (attBilling) ──
    {
        id: "billing",
        label: "Billing",
        shortLabel: "Bill",
        group: "billing",
        icon: ClipboardList,
        gate: billing,
        load: () => import("./BillingSummaryTabModule"),
    },

    // ── Audit (auditView) ── MUST stay last: appended so it never becomes the
    //    default tab via `firstVisibleTab` precedence (gated, restricted). ──
    {
        id: "audit-log",
        label: "Audit Log",
        shortLabel: "Audit",
        group: "billing",
        icon: History,
        gate: auditLog,
        load: () => import("./VisitAuditLogTabModule"),
    },
];

/** Lazy React components keyed by tab id, for the shell's Suspense outlet. */
export const lazyTabComponents: Record<string, EncounterTabComponent> = Object.fromEntries(
    encounterTabs.map((tab) => [tab.id, lazy(tab.load)]),
);

/**
 * Resolve the ordered visible tabs for a role + context, reusing the pure
 * resolver. Thin pass-through so UI callers import from one place.
 */
export function resolveVisibleTabs(can: CanFn, ctx: GateContext): RegisteredTab[] {
    return resolveVisibleTabsPure(encounterTabs, can, ctx) as RegisteredTab[];
}

/** The default/active tab id for a role + context (monolith precedence). */
export function firstVisibleTab(can: CanFn, ctx: GateContext): string {
    return firstVisibleTabPure(resolveVisibleTabs(can, ctx));
}
