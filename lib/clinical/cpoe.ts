/**
 * Pure CPOE (Computerized Provider Order Entry) helpers.
 *
 * Kept free of DB / React so they can be unit-tested in isolation and reused
 * on both the server (actions) and client (unified order screen). Two pieces
 * of logic live here:
 *   1. ICD-10 code search — filters the static code list by a free-text query.
 *   2. Allergy-vs-drug decision support — matches a drug being prescribed
 *      against the patient's structured allergy list and surfaces warnings.
 */

import { ICD10_CODES, type Icd10Code } from "./icd10";
import type { AllergyLike } from "./emr";

/* ═══════════════════════════════════════════════════════════════
 *  ICD-10 SEARCH
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Filter the ICD-10 code list by a query that matches either the code or the
 * description (case-insensitive, substring). An empty / whitespace query
 * returns the first `limit` codes so the picker shows sensible defaults.
 * Results are capped at `limit` so the UI stays snappy.
 */
export function searchIcd10(
    query: string,
    codes: Icd10Code[] = ICD10_CODES,
    limit = 20,
): Icd10Code[] {
    const q = String(query ?? "").trim().toLowerCase();
    const source = codes || [];
    if (!q) return source.slice(0, limit);
    const matches = source.filter(
        (c) =>
            c.code.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q),
    );
    return matches.slice(0, limit);
}

/* ═══════════════════════════════════════════════════════════════
 *  ALLERGY-vs-DRUG DECISION SUPPORT
 * ═══════════════════════════════════════════════════════════════ */

export interface AllergyWarning {
    /** The drug name the clinician is about to prescribe. */
    drugName: string;
    /** The allergy substance that matched. */
    substance: string;
    severity: string;
    reaction: string;
}

/** Normalise a clinical name for matching: lowercase, trimmed, punctuation out. */
function normalizeName(value?: string): string {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Does the drug being prescribed match a recorded allergy substance?
 *
 * We match conservatively but usefully: a hit is either an exact normalised
 * match, or one name containing the other as a whole word (so "Amoxicillin"
 * matches an allergy to "amoxicillin", and a drug "Penicillin V" matches an
 * allergy to "penicillin"). Very short tokens (< 4 chars) only match exactly
 * to avoid noisy false positives.
 */
export function drugMatchesAllergy(drugName?: string, substance?: string): boolean {
    const drug = normalizeName(drugName);
    const sub = normalizeName(substance);
    if (!drug || !sub) return false;
    if (drug === sub) return true;

    // Word-boundary containment either direction. Guard against trivially short
    // substances producing noise.
    if (sub.length >= 4 && new RegExp(`\\b${escapeRegExp(sub)}\\b`).test(drug)) return true;
    if (drug.length >= 4 && new RegExp(`\\b${escapeRegExp(drug)}\\b`).test(sub)) return true;
    return false;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Given the drugs about to be prescribed and the patient's allergy list,
 * return one warning per (drug, matching active allergy) pair. Inactive
 * allergies are ignored. The result is empty when nothing matches, so the
 * caller can treat a non-empty array as "warn the clinician".
 */
export function checkDrugAllergies(
    drugNames: string[],
    allergies: AllergyLike[] = [],
): AllergyWarning[] {
    const warnings: AllergyWarning[] = [];
    const activeAllergies = (allergies || []).filter(
        (a) => a && String(a.substance || "").trim() && (a.status ?? "active") !== "inactive",
    );
    for (const drugName of drugNames || []) {
        if (!String(drugName || "").trim()) continue;
        for (const a of activeAllergies) {
            if (drugMatchesAllergy(drugName, a.substance)) {
                warnings.push({
                    drugName: String(drugName).trim(),
                    substance: String(a.substance || "").trim(),
                    severity: String(a.severity || "unknown"),
                    reaction: String(a.reaction || ""),
                });
            }
        }
    }
    return warnings;
}

/* ═══════════════════════════════════════════════════════════════
 *  ORDER SETS (named bundles)
 * ═══════════════════════════════════════════════════════════════ */

export interface OrderSetItem {
    type: "lab" | "radiology" | "drug";
    /** Lab/radiology test name, or drug name. */
    name: string;
    /** Optional default dosing for drug items. */
    dosage?: string;
    frequency?: string;
    duration?: string;
}

export interface OrderSet {
    id: string;
    name: string;
    description?: string;
    items: OrderSetItem[];
}

/**
 * A small set of common named bundles. Selecting one pre-fills the unified
 * order screen with its lab / radiology / drug lines, which the clinician can
 * then edit before placing. Static (like the ICD-10 list) — not DB-backed.
 */
export const ORDER_SETS: OrderSet[] = [
    {
        id: "malaria-workup",
        name: "Malaria workup",
        description: "Febrile illness — malaria screen",
        items: [
            { type: "lab", name: "Malaria Parasite (MP) / RDT" },
            { type: "lab", name: "Full Blood Count (FBC)" },
            { type: "drug", name: "Artemether/Lumefantrine", dosage: "80/480mg", frequency: "BD", duration: "3 days" },
            { type: "drug", name: "Paracetamol", dosage: "1g", frequency: "TDS", duration: "3 days" },
        ],
    },
    {
        id: "basic-metabolic",
        name: "Basic metabolic panel",
        description: "Routine chemistry screen",
        items: [
            { type: "lab", name: "Urea & Electrolytes (U&E)" },
            { type: "lab", name: "Fasting Blood Sugar (FBS)" },
            { type: "lab", name: "Liver Function Test (LFT)" },
        ],
    },
    {
        id: "chest-infection",
        name: "Chest infection",
        description: "Lower respiratory tract infection",
        items: [
            { type: "radiology", name: "Chest X-ray (PA)" },
            { type: "lab", name: "Full Blood Count (FBC)" },
            { type: "drug", name: "Amoxicillin/Clavulanate", dosage: "625mg", frequency: "TDS", duration: "7 days" },
        ],
    },
    {
        id: "uti-workup",
        name: "UTI workup",
        description: "Suspected urinary tract infection",
        items: [
            { type: "lab", name: "Urinalysis" },
            { type: "lab", name: "Urine Culture & Sensitivity" },
            { type: "drug", name: "Nitrofurantoin", dosage: "100mg", frequency: "BD", duration: "5 days" },
        ],
    },
];

export function getOrderSet(id: string, sets: OrderSet[] = ORDER_SETS): OrderSet | undefined {
    return (sets || []).find((s) => s.id === id);
}
