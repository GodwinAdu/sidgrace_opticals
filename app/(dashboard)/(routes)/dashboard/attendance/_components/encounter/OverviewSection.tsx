"use client";

/**
 * OverviewSection — the default landing section of the redesigned workspace
 * (R2). Summarizes the encounter from EXISTING data via the pure `overviewModel`
 * derivation: reason for visit, a critical allergy callout (reusing the shared
 * allergy banner source), the latest vitals, a diagnosis summary, and quick
 * links that navigate (via `onSelect`) to the matching section. Where a datum is
 * absent it shows an empty state — nothing is fabricated (Property 3).
 */

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, HeartPulse, ShieldCheck } from "lucide-react";
import { getAllergiesByPatient } from "@/lib/actions/emr.actions";
import { buildAllergyBanner, type AllergyLike } from "@/lib/clinical/emr";
import { overviewModel } from "@/lib/clinical/encounter-overview";
import { useEncounter } from "./EncounterProvider";

export interface OverviewSectionProps {
    /** Navigate to another section (same handler the rail uses). */
    onSelect: (id: string) => void;
}

/** A labelled vitals metric; renders only when the value is present. */
function Metric({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
    if (value === null || value === undefined || value === "") return null;
    return (
        <div className="rounded-xl border bg-background p-3 dark:border-gray-700">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <div className="mt-1 flex items-end gap-1">
                <strong className="text-xl tracking-tight">{String(value)}</strong>
                {unit && <span className="pb-0.5 text-[11px] text-muted-foreground">{unit}</span>}
            </div>
        </div>
    );
}

export default function OverviewSection({ onSelect }: OverviewSectionProps) {
    const { state } = useEncounter();
    const attendance = state.attendance;
    const patient = attendance.patientId || {};
    const patientMongoId = patient._id ? String(patient._id) : "";

    const [structured, setStructured] = useState<AllergyLike[]>([]);
    useEffect(() => {
        let active = true;
        if (!patientMongoId) {
            setStructured([]);
            return;
        }
        getAllergiesByPatient(patientMongoId)
            .then((list) => active && setStructured(Array.isArray(list) ? list : []))
            .catch(() => active && setStructured([]));
        return () => {
            active = false;
        };
    }, [patientMongoId]);

    const freeText = ((patient.allergies as string[] | undefined) || []).filter(Boolean) as string[];
    const banner = buildAllergyBanner(structured, freeText);
    const model = overviewModel(attendance as never, banner);

    const vitals = (model.latestVitals || {}) as Record<string, unknown>;

    return (
        <div className="flex flex-col gap-5">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Encounter overview</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Overview</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    A focused view of the patient&apos;s current clinical picture.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {/* Reason for visit */}
                <div className="rounded-xl border bg-background p-4 sm:col-span-2 dark:border-gray-700">
                    <p className="text-xs font-semibold">Reason for visit</p>
                    {model.reasonForVisit ? (
                        <p className="mt-3 text-lg font-semibold">{model.reasonForVisit}</p>
                    ) : (
                        <p className="mt-3 text-sm italic text-muted-foreground">Not documented</p>
                    )}
                </div>

                {/* Critical allergy */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="size-4" aria-hidden="true" />
                        <p className="text-xs font-semibold">Critical context</p>
                    </div>
                    {model.criticalAllergies.length > 0 ? (
                        <p className="mt-3 text-sm font-semibold text-amber-950 dark:text-amber-200">
                            {model.criticalAllergies.map((a) => a.label).join(", ")}
                        </p>
                    ) : (
                        <p className="mt-3 text-sm italic text-amber-800/70 dark:text-amber-300/70">
                            No known allergies recorded
                        </p>
                    )}
                </div>

                {/* Diagnosis summary */}
                <button
                    type="button"
                    onClick={() => onSelect("diagnosis")}
                    className="rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted/50 dark:border-gray-700"
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                        <p className="text-xs font-semibold">Diagnosis</p>
                    </div>
                    {model.diagnosisSummary ? (
                        <p className="mt-3 text-sm font-semibold">{model.diagnosisSummary}</p>
                    ) : (
                        <p className="mt-3 text-sm italic text-muted-foreground">Not documented</p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        Open diagnosis <ArrowRight className="size-3" aria-hidden="true" />
                    </span>
                </button>
            </div>

            {/* Latest vitals */}
            <div className="rounded-xl border bg-background p-4 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HeartPulse className="size-4 text-muted-foreground" aria-hidden="true" />
                        <h3 className="text-sm font-semibold">Latest vitals</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelect("vitals")}
                        className="text-xs font-medium text-primary hover:underline"
                    >
                        Open vitals
                    </button>
                </div>
                {model.latestVitals ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Metric label="Blood pressure" value={vitals.bloodPressure} unit="mmHg" />
                        <Metric label="Pulse" value={vitals.pulse} unit="bpm" />
                        <Metric label="Temperature" value={vitals.temperature} unit="°C" />
                        <Metric label="Resp. rate" value={vitals.respiratoryRate} unit="/min" />
                        <Metric label="Weight" value={vitals.weight} unit="kg" />
                        <Metric label="Height" value={vitals.height} unit="cm" />
                        <Metric label="BMI" value={vitals.bmi} />
                    </div>
                ) : (
                    <p className="mt-4 text-sm italic text-muted-foreground">No vitals recorded yet.</p>
                )}
            </div>

            {/* Chronic conditions */}
            {model.chronicConditions.length > 0 && (
                <div className="rounded-xl border bg-background p-4 dark:border-gray-700">
                    <h3 className="text-sm font-semibold">Chronic conditions</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {model.chronicConditions.map((c) => (
                            <span
                                key={c}
                                className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}