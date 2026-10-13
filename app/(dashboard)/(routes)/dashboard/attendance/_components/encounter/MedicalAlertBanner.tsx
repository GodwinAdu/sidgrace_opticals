"use client";

/**
 * MedicalAlertBanner — the patient-safety strip under the header (Req 3.2).
 *
 * Reproduces the legacy `ConsultingPage.tsx` alert logic exactly, reusing the
 * unchanged pure helper `buildAllergyBanner` from `lib/clinical/emr.ts`
 * (covered by `tests/emr-banner.test.ts`, which this component does NOT touch):
 *   - structured allergies are fetched for the linked patient via
 *     `getAllergiesByPatient` and merged with the visit's legacy free-text
 *     allergies through `buildAllergyBanner`;
 *   - the patient's chronic conditions are shown alongside;
 *   - styling escalates to a "Severe Allergy Alert" when any structured allergy
 *     is severe (`banner.hasSevere`), otherwise it reads "Medical Alert".
 *
 * The banner renders nothing when there are neither allergies nor chronic
 * conditions, matching the monolith. It reads the working visit/patient from
 * `useEncounter()`.
 */

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getAllergiesByPatient } from "@/lib/actions/emr.actions";
import { buildAllergyBanner, type AllergyLike } from "@/lib/clinical/emr";
import { useEncounter } from "./EncounterProvider";

export default function MedicalAlertBanner() {
    const { state } = useEncounter();
    const patient = state.attendance.patientId || {};
    const patientMongoId = patient._id ? String(patient._id) : "";

    // Structured allergy records (new EMR) for the linked patient. Fetched
    // client-side exactly as the legacy header did.
    const [structuredAllergies, setStructuredAllergies] = useState<AllergyLike[]>([]);
    useEffect(() => {
        let active = true;
        if (!patientMongoId) {
            setStructuredAllergies([]);
            return;
        }
        getAllergiesByPatient(patientMongoId)
            .then((list) => {
                if (active) setStructuredAllergies(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (active) setStructuredAllergies([]);
            });
        return () => {
            active = false;
        };
    }, [patientMongoId]);

    const freeTextAllergies = ((patient.allergies as string[] | undefined) || []).filter(
        Boolean,
    ) as string[];
    const banner = buildAllergyBanner(structuredAllergies, freeTextAllergies);
    const chronic = ((patient.chronicConditions as string[] | undefined) || []).filter(Boolean);

    // Nothing to warn about → render nothing (matches monolith).
    if (banner.count === 0 && chronic.length === 0) return null;

    return (
        <div
            role="alert"
            className="flex flex-wrap items-start gap-x-6 gap-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900 dark:bg-red-950/40"
        >
            <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />{" "}
                {banner.hasSevere ? "Severe Allergy Alert" : "Medical Alert"}
            </span>
            {banner.count > 0 && (
                <span className="text-red-700 dark:text-red-300">
                    <span className="font-medium">Allergies:</span> {banner.labels.join(", ")}
                </span>
            )}
            {chronic.length > 0 && (
                <span className="text-red-700 dark:text-red-300">
                    <span className="font-medium">Chronic:</span> {chronic.join(", ")}
                </span>
            )}
        </div>
    );
}
