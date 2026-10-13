/**
 * Pure derivations for the redesigned encounter workspace (visual re-skin).
 *
 * DB-free and React-free, like `lib/clinical/encounter.ts` and
 * `lib/clinical/attribution.ts`, so these can be unit-tested in isolation and
 * reused by the Overview section, the section rail, and the clinical-summary
 * checklist. Everything here is DERIVED from the existing attendance data — no
 * new persisted field, no fabricated clinical value (design A3 / Properties 2,
 * 3, 5).
 */

/** Loose attendance shape: the subset of fields these derivations read. */
export interface OverviewAttendance {
    patientId?: {
        allergies?: string[];
        chronicConditions?: string[];
    } & Record<string, unknown>;
    visitReason?: string | null;
    doctorNote?: string | null;
    nurseNote?: string | null;
    surgicalNote?: string | null;
    history?: Record<string, unknown> | null;
    physicExam?: Record<string, unknown> | null;
    diagnosis?: { primary?: string; secondary?: string[] } | null;
    plan?: { treatment?: string; followUp?: string } | null;
    eyeTest?: Record<string, unknown> | null;
    vitals?: Record<string, unknown> | null;
    labReport?: unknown;
    scan?: unknown;
    drugs?: unknown[];
    followUpDate?: string | Date | null;
    followUpInstructions?: string | null;
    // Append-only attributed version arrays (presence ⇒ attributed data exists).
    [key: `${string}Versions`]: unknown;
}

/** A displayable allergy for the critical-allergy callout. */
export interface CriticalAllergy {
    label: string;
    severe: boolean;
}

/** The derived model the Overview section renders. */
export interface OverviewModel {
    reasonForVisit: string | null;
    criticalAllergies: CriticalAllergy[];
    chronicConditions: string[];
    latestVitals: Record<string, unknown> | null;
    diagnosisSummary: string | null;
    hasPlan: boolean;
}

/** A single completion-checklist item. */
export interface ChecklistItem {
    id: string;
    label: string;
    state: "done" | "attention";
    /** Required items gate Sign encounter; optional ones only inform. */
    required: boolean;
}

/** Whether a value counts as "present" clinical content. */
function hasContent(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") {
        return Object.values(value as Record<string, unknown>).some((v) => hasContent(v));
    }
    if (typeof value === "number") return true;
    if (typeof value === "boolean") return value;
    return false;
}

/** Whether a tracked field has at least one recorded (attributed) version. */
function hasVersions(att: OverviewAttendance, field: string): boolean {
    const versions = att[`${field}Versions` as keyof OverviewAttendance];
    return Array.isArray(versions) && versions.length > 0;
}

/**
 * Section → whether it has recorded data for this visit. Derived only (A3):
 * tracked fields count as done when they have at least one attributed version
 * OR present scalar content (back-compat for legacy visits); other sections
 * fall back to the presence of their backing field. Unknown sections are
 * treated as not-done rather than throwing.
 */
export function sectionDoneState(
    att: OverviewAttendance | null | undefined,
    sectionId: string,
): "done" | "empty" {
    if (!att) return "empty";

    // Map a rail/registry section id to the attendance field(s) it reflects.
    const TRACKED: Record<string, keyof OverviewAttendance> = {
        "dr-notes": "doctorNote",
        "nurse-notes": "nurseNote",
        "surgical-notes": "surgicalNote",
        history: "history",
        "physic-exam": "physicExam",
        diagnosis: "diagnosis",
        "treatment-plan": "plan",
        "eye-test": "eyeTest",
        vitals: "vitals",
        "lab-report": "labReport",
        scan: "scan",
    };

    const field = TRACKED[sectionId];
    if (field) {
        const base = String(field);
        if (hasVersions(att, base)) return "done";
        return hasContent(att[field]) ? "done" : "empty";
    }

    // Non-tracked sections (prescribe, billing, nursing, etc.) — presence-based
    // best effort against a same-named field if one exists; otherwise empty.
    const maybe = att[sectionId as keyof OverviewAttendance];
    return hasContent(maybe) ? "done" : "empty";
}

/**
 * The critical-allergy list for the Overview callout and the summary alerts.
 * Reuses the SAME allergy source as the medical-alert banner (Property 4):
 * callers pass the already-built banner result; this just shapes it. We accept
 * the banner's `{ labels, hasSevere }` so there is no second allergy
 * computation here.
 */
export function criticalAllergiesFromBanner(
    banner: { labels: string[]; hasSevere: boolean } | null | undefined,
): CriticalAllergy[] {
    if (!banner || !Array.isArray(banner.labels)) return [];
    return banner.labels.map((label) => ({
        label,
        // A label is flagged severe when it carries the "(severe)" suffix the
        // banner adds; `hasSevere` corroborates at least one exists.
        severe: /\(severe\)/i.test(label),
    }));
}

/**
 * Assemble the Overview model from existing data only (Property 3). Any absent
 * datum becomes null / [] / false so the UI shows an empty state rather than a
 * fabricated value. The caller supplies the allergy banner result (shared
 * source) so allergies are not recomputed here.
 */
export function overviewModel(
    att: OverviewAttendance | null | undefined,
    banner?: { labels: string[]; hasSevere: boolean } | null,
): OverviewModel {
    if (!att) {
        return {
            reasonForVisit: null,
            criticalAllergies: [],
            chronicConditions: [],
            latestVitals: null,
            diagnosisSummary: null,
            hasPlan: false,
        };
    }

    const reasonForVisit = hasContent(att.visitReason) ? String(att.visitReason).trim() : null;
    const chronicConditions = Array.isArray(att.patientId?.chronicConditions)
        ? att.patientId!.chronicConditions!.filter((c) => hasContent(c))
        : [];
    const latestVitals = hasContent(att.vitals) ? (att.vitals as Record<string, unknown>) : null;
    const dxPrimary = att.diagnosis?.primary;
    const diagnosisSummary = hasContent(dxPrimary) ? String(dxPrimary).trim() : null;
    const hasPlan = hasContent(att.plan?.treatment) || hasContent(att.plan?.followUp);

    return {
        reasonForVisit,
        criticalAllergies: criticalAllergiesFromBanner(banner),
        chronicConditions,
        latestVitals,
        diagnosisSummary,
        hasPlan,
    };
}

/**
 * The completion checklist shown in the summary rail. Each item maps to data
 * that EXISTS today; absent data simply shows "attention" (Property 2/3).
 * Required items gate Sign encounter (Property 5). The caller supplies whether
 * a patient is linked (from `GateContext.hasPatient`) so we don't re-resolve it.
 */
export function buildChecklist(
    att: OverviewAttendance | null | undefined,
    ctx?: { hasPatient?: boolean },
): ChecklistItem[] {
    const a = att || {};
    const item = (
        id: string,
        label: string,
        done: boolean,
        required: boolean,
    ): ChecklistItem => ({ id, label, state: done ? "done" : "attention", required });

    const vitalsDone = sectionDoneState(a, "vitals") === "done";
    const diagnosisDone = sectionDoneState(a, "diagnosis") === "done";
    const assessmentDone =
        sectionDoneState(a, "physic-exam") === "done" || sectionDoneState(a, "dr-notes") === "done";
    const planDone = sectionDoneState(a, "treatment-plan") === "done";
    const reasonDone = hasContent((a as OverviewAttendance).visitReason);

    return [
        item("patient", "Patient identified", ctx?.hasPatient !== false, true),
        item("reason", "Reason for visit", reasonDone, false),
        item("vitals", "Vitals recorded", vitalsDone, true),
        item("assessment", "Assessment documented", assessmentDone, false),
        item("diagnosis", "Diagnosis documented", diagnosisDone, true),
        item("plan", "Follow-up / plan", planDone, false),
    ];
}

/**
 * Whether the encounter is ready to sign and which required items remain.
 * Ready only when EVERY required checklist item is done (Property 5). The sign
 * action itself still maps to the existing explicit Complete-visit server
 * action — this only computes readiness for the warn-then-confirm UX.
 */
export function signReadiness(checklist: ChecklistItem[]): {
    ready: boolean;
    outstanding: ChecklistItem[];
} {
    const outstanding = (checklist || []).filter(
        (c) => c.required && c.state !== "done",
    );
    return { ready: outstanding.length === 0, outstanding };
}