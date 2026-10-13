"use client";

/**
 * ClinicalSummaryRail — the right-hand summary panel for the redesigned
 * workspace (R3). Shows encounter context, safety alerts, and the completion
 * checklist. Alerts reuse the EXISTING allergy / medical-alert source (the same
 * `buildAllergyBanner` the MedicalAlertBanner uses) — no new alert computation
 * (Property 4). The checklist comes from the pure `buildChecklist` derivation
 * (Property 2/5). Everything is read-only and derived; nothing is persisted.
 *
 * Hidden on narrow viewports (the layout only mounts it at xl+), so this
 * component assumes it is shown and focuses on content (R3.4).
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Check, CircleDot, Stethoscope } from "lucide-react";
import { getAllergiesByPatient } from "@/lib/actions/emr.actions";
import { buildAllergyBanner, type AllergyLike } from "@/lib/clinical/emr";
import { buildChecklist, type ChecklistItem } from "@/lib/clinical/encounter-overview";
import { useEncounter } from "./EncounterProvider";
import type { AdmissionContext } from "./types";

export interface ClinicalSummaryRailProps {
    /** Active admission context, when the visit is inpatient. */
    admission?: AdmissionContext | null;
}

export default function ClinicalSummaryRail({ admission }: ClinicalSummaryRailProps) {
    const { state } = useEncounter();
    const attendance = state.attendance;
    const patient = attendance.patientId || {};
    const patientMongoId = patient._id ? String(patient._id) : "";

    // Structured allergies — SAME source as the medical-alert banner (Property 4).
    const [structured, setStructured] = useState<AllergyLike[]>([]);
    useEffect(() => {
        let active = true;
        if (!patientMongoId) {
            setStructured([]);
            return;
        }
        getAllergiesByPatient(patientMongoId)
            .then((list) => {
                if (active) setStructured(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (active) setStructured([]);
            });
        return () => {
            active = false;
        };
    }, [patientMongoId]);

    const freeText = ((patient.allergies as string[] | undefined) || []).filter(Boolean) as string[];
    const banner = buildAllergyBanner(structured, freeText);

    const checklist: ChecklistItem[] = buildChecklist(attendance as never, {
        hasPatient: !!patient._id,
    });
    const attentionCount = checklist.filter((c) => c.state !== "done").length;

    const wardName =
        typeof admission?.wardId === "object" && admission?.wardId ? admission.wardId.name : "";
    const bedLabel =
        typeof admission?.bedId === "object" && admission?.bedId ? admission.bedId.label : "";

    return (
        <aside className="hidden w-[270px] shrink-0 border-l bg-background xl:block dark:border-gray-700">
            <div className="sticky top-0 flex max-h-screen flex-col gap-6 overflow-y-auto p-4">
                {/* Context */}
                <section>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Clinical summary
                    </p>
                    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                                <Stethoscope className="size-4" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold capitalize text-sky-950 dark:text-sky-200">
                                    {attendance.visitType || "Visit"}
                                </p>
                                <p className="text-[10px] capitalize text-sky-800/70 dark:text-sky-300/70">
                                    {attendance.status}
                                </p>
                            </div>
                        </div>
                        {(wardName || bedLabel) && (
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-sky-100 pt-3 text-[10px] dark:border-sky-900">
                                <div>
                                    <p className="text-sky-800/70 dark:text-sky-300/70">Ward</p>
                                    <p className="mt-0.5 font-semibold text-sky-950 dark:text-sky-200">{wardName || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-sky-800/70 dark:text-sky-300/70">Bed</p>
                                    <p className="mt-0.5 font-semibold text-sky-950 dark:text-sky-200">{bedLabel || "—"}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Alerts */}
                {(banner.count > 0 || attendance.patientId?.chronicConditions?.length) && (
                    <section>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">Alerts &amp; attention</p>
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            {banner.labels.map((label) => {
                                const severe = /\(severe\)/i.test(label);
                                return (
                                    <div
                                        key={label}
                                        className={`rounded-lg border p-3 ${severe ? "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30" : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30"}`}
                                    >
                                        <div className="flex gap-2">
                                            <AlertTriangle
                                                className={`mt-0.5 size-3.5 shrink-0 ${severe ? "text-rose-600" : "text-amber-600"}`}
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <p className="text-[11px] font-semibold">Allergy</p>
                                                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{label}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Completion checklist */}
                <section className="rounded-xl border p-3 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Completion checklist</p>
                        {attentionCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                {attentionCount}
                            </span>
                        )}
                    </div>
                    <ul className="mt-3 flex flex-col gap-2">
                        {checklist.map((item) => (
                            <li key={item.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span
                                    className={`flex size-4 items-center justify-center rounded-full ${item.state === "done" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                                >
                                    {item.state === "done" ? (
                                        <Check className="size-2.5" aria-hidden="true" />
                                    ) : (
                                        <CircleDot className="size-2.5" aria-hidden="true" />
                                    )}
                                </span>
                                <span className={item.state === "done" ? "" : "text-foreground"}>{item.label}</span>
                                {item.required && item.state !== "done" && (
                                    <span className="ml-auto text-[9px] font-semibold uppercase text-amber-600">Required</span>
                                )}
                            </li>
                        ))}
                    </ul>
                    {attentionCount > 0 && (
                        <p className="mt-3 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            {attentionCount} item{attentionCount === 1 ? "" : "s"} need attention before completion.
                        </p>
                    )}
                </section>
            </div>
        </aside>
    );
}