"use client";

/**
 * EncounterWorkspace — composition root for the attendance detail screen,
 * re-skinned to the NOVACARE layout (encounter-workspace-redesign spec).
 *
 * The ENGINE is unchanged: it still owns the `EncounterProvider`, resolves
 * role-visible sections via the registry (`resolveVisibleTabs`), mounts only the
 * active section in a lazy `Suspense` outlet, preserves historical read-only
 * mode, attribution, audit, and billing, and finalizes via the existing
 * Complete-visit action (now surfaced as "Sign encounter").
 *
 * Only the PRESENTATION changed: the stacked header → tab-bar → outlet → footer
 * layout became a 3-column grid —
 *
 *   PatientHeader (full width, sticky)
 *   ┌──────────────┬────────────────────────────┬────────────────────┐
 *   │ SectionRail  │  Overview OR lazy section    │  ClinicalSummary   │
 *   │ (left)       │  outlet (center)             │  rail (right, xl+) │
 *   └──────────────┴────────────────────────────┴────────────────────┘
 *   EncounterFooter (full width) + Sign encounter
 *
 * "Overview" is a synthetic first rail entry (not a registry tab); selecting it
 * renders `OverviewSection`. All other rail entries are the registry's
 * role-gated sections and mount their existing components unchanged.
 */

import { Suspense, useMemo, useState } from "react";
import { History, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    firstVisibleTab,
    lazyTabComponents,
    resolveVisibleTabs,
    type GateContext,
} from "./tabs/registry";
import type { EncounterTabProps } from "./tabs/types";
import { sectionDoneState } from "@/lib/clinical/encounter-overview";
import { EncounterProvider, useEncounter } from "./EncounterProvider";
import PatientHeader from "./PatientHeader";
import MedicalAlertBanner from "./MedicalAlertBanner";
import PreviousVisitPicker from "./PreviousVisitPicker";
import SectionRail, { type SectionRailItem } from "./SectionRail";
import OverviewSection from "./OverviewSection";
import ClinicalSummaryRail from "./ClinicalSummaryRail";
import EncounterFooter from "./EncounterFooter";
import type { AdmissionContext, AttendanceData, PreviousVisit } from "./types";

/** Synthetic rail id for the Overview landing section (not a registry tab). */
const OVERVIEW_ID = "overview";

export interface EncounterWorkspaceProps {
    initialAttendance: AttendanceData;
    previousVisits?: PreviousVisit[];
    role?: IRole | null;
    admission?: AdmissionContext | null;
}

/** Loading fallback while a lazy section module code-splits in. */
function SectionLoading() {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading section…
        </div>
    );
}

function EncounterWorkspaceInner({
    previousVisits,
    admission,
}: {
    previousVisits?: PreviousVisit[];
    admission?: AdmissionContext | null;
}) {
    const { state, mode, can, canEdit, patchSection, patchBilling, returnToCurrent } = useEncounter();
    const attendance = state.attendance;
    const isHistorical = mode === "historical";

    const ctx: GateContext = useMemo(
        () => ({ hasAdmission: !!admission, hasPatient: !!attendance.patientId?._id }),
        [admission, attendance.patientId],
    );

    const visibleTabs = useMemo(() => resolveVisibleTabs(can, ctx), [can, ctx]);
    const defaultTab = useMemo(() => firstVisibleTab(can, ctx), [can, ctx]);

    // Rail = synthetic Overview first, then the role-visible registry sections.
    const railItems: SectionRailItem[] = useMemo(
        () => [
            { id: OVERVIEW_ID, label: "Overview", icon: LayoutDashboard },
            ...visibleTabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
        ],
        [visibleTabs],
    );

    // Derived per-section done state (never stored).
    const doneState = useMemo(() => {
        const map: Record<string, boolean> = {};
        for (const t of visibleTabs) {
            map[t.id] = sectionDoneState(attendance as never, t.id) === "done";
        }
        return map;
    }, [visibleTabs, attendance]);

    // Default landing is Overview; fall back to default tab if the active
    // registry section stops being visible.
    const [activeId, setActiveId] = useState<string>(OVERVIEW_ID);
    const resolvedActive =
        activeId === OVERVIEW_ID || visibleTabs.some((t) => t.id === activeId)
            ? activeId
            : defaultTab;

    const ActiveTab = resolvedActive === OVERVIEW_ID ? null : lazyTabComponents[resolvedActive];

    const tabProps: EncounterTabProps = {
        attendance: attendance as unknown as Record<string, unknown>,
        attendanceId: attendance._id ? String(attendance._id) : undefined,
        patientId: attendance.patientId?._id ? String(attendance.patientId._id) : undefined,
        readOnly: !canEdit,
        admission: admission ?? null,
        onPatchSection: patchSection,
        onPatchBilling: (billing) => patchBilling(billing),
    };

    return (
        <div id="encounter-printable" className="flex flex-col print:gap-2 print:pb-0">
            <PatientHeader admission={admission} />

            {isHistorical && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mx-4 mt-3 flex flex-col gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900 shadow-sm dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200 sm:flex-row sm:items-center sm:justify-between lg:mx-6"
                >
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-semibold">Historical View — read-only</p>
                            <p className="text-xs text-orange-800/90 dark:text-orange-300/90">
                                You are viewing a previous visit. Editing and saving are disabled. Return to the
                                current visit to make changes.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={returnToCurrent}
                        className="shrink-0 border-orange-300 bg-white/70 text-orange-900 hover:bg-white dark:border-orange-700 dark:bg-transparent dark:text-orange-200"
                    >
                        ← Return to Current Visit
                    </Button>
                </div>
            )}

            {/* 3-column grid: rail | main | summary (summary at xl+). */}
            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_270px]">
                {/* Left: section rail (chrome; hidden on print). On mobile it is a
                    sticky horizontal strip (the rail renders its own sticky bar);
                    at lg+ it becomes a sticky vertical column with a right border. */}
                <aside className="bg-background print:hidden lg:border-r dark:border-gray-700">
                    <div className="lg:sticky lg:top-0">
                        <SectionRail
                            items={railItems}
                            activeId={resolvedActive}
                            onSelect={setActiveId}
                            doneState={doneState}
                        />
                    </div>
                </aside>

                {/* Center: main content. */}
                <section className="min-w-0 px-4 py-5 lg:px-6">
                    <div className="mx-auto flex max-w-[960px] flex-col gap-4">
                        <MedicalAlertBanner />

                        <div className="print:hidden">
                            <PreviousVisitPicker previousVisits={previousVisits} />
                        </div>

                        <div
                            role="region"
                            aria-label={resolvedActive === OVERVIEW_ID ? "Overview" : resolvedActive}
                            className="min-w-0"
                        >
                            {resolvedActive === OVERVIEW_ID ? (
                                <OverviewSection onSelect={setActiveId} />
                            ) : (
                                <div className="rounded-lg border bg-background p-4 dark:border-gray-700 dark:bg-gray-900 print:border-0 print:p-0">
                                    <Suspense fallback={<SectionLoading />}>
                                        {ActiveTab ? (
                                            <ActiveTab {...tabProps} />
                                        ) : (
                                            <p className="py-8 text-center text-sm text-muted-foreground">
                                                No section available.
                                            </p>
                                        )}
                                    </Suspense>
                                </div>
                            )}
                        </div>

                        <EncounterFooter />
                    </div>
                </section>

                {/* Right: clinical summary rail (xl+ only; chrome). */}
                <div className="print:hidden">
                    <ClinicalSummaryRail admission={admission} />
                </div>
            </div>
        </div>
    );
}

export default function EncounterWorkspace({
    initialAttendance,
    previousVisits,
    role,
    admission,
}: EncounterWorkspaceProps) {
    return (
        <EncounterProvider initialAttendance={initialAttendance} role={role}>
            <EncounterWorkspaceInner previousVisits={previousVisits} admission={admission} />
        </EncounterProvider>
    );
}