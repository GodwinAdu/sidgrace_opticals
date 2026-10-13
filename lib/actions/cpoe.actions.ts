"use server";

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { User, withAuth } from "../helpers/auth";
import Allergy from "../models/allergy.models";
import History from "../models/history.models";
import { createLabOrder } from "./lab-order.actions";
import { createPrescription } from "./prescription.actions";
import { checkDrugAllergies, type AllergyWarning } from "../clinical/cpoe";
import { searchIcd10 } from "../clinical/cpoe";
import { ICD10_CODES } from "../clinical/icd10";

/* ═══════════════════════════════════════════════════════════════
 *  ICD-10 SEARCH (read)
 * ═══════════════════════════════════════════════════════════════ */

async function _searchIcd10Codes(user: User, query: string, limit = 20) {
    if (!user) throw new Error("User not authenticated");
    // Pure, in-memory search over the static code list — no DB round-trip.
    return searchIcd10(query, ICD10_CODES, limit);
}
export const searchIcd10Codes = await withAuth(_searchIcd10Codes);

/* ═══════════════════════════════════════════════════════════════
 *  ALLERGY DECISION SUPPORT (read)
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Decision support: compare the drugs about to be prescribed against the
 * patient's structured, active allergy list and return any warnings. Pure
 * matching logic lives in lib/clinical/cpoe; this just supplies the data.
 */
async function _checkDrugAllergyWarnings(user: User, patientId: string, drugNames: string[]) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!patientId) return [] as AllergyWarning[];
        await connectToDB();
        const allergies = await Allergy.find({ patientId, del_flag: false }).lean();
        return checkDrugAllergies(
            drugNames || [],
            allergies as unknown as { substance?: string; severity?: string; status?: string; reaction?: string }[],
        );
    } catch (error) {
        console.error("Error checking drug allergies:", error);
        return [] as AllergyWarning[];
    }
}
export const checkDrugAllergyWarnings = await withAuth(_checkDrugAllergyWarnings);

/* ═══════════════════════════════════════════════════════════════
 *  UNIFIED ORDER PLACEMENT (write)
 * ═══════════════════════════════════════════════════════════════ */

interface UnifiedLabTest {
    name: string;
}
interface UnifiedDrug {
    productId?: string | null;
    drugName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
}

interface UnifiedOrderInput {
    patientId: string;
    attendanceId?: string | null;
    labTests?: UnifiedLabTest[];
    radiologyTests?: UnifiedLabTest[];
    drugs?: UnifiedDrug[];
    note?: string;
    /** Set true to place even when allergy warnings were raised (acknowledged). */
    acknowledgeAllergyWarnings?: boolean;
}

interface UnifiedOrderResult {
    labOrderId?: string;
    radiologyOrderId?: string;
    prescriptionId?: string;
    allergyWarnings: AllergyWarning[];
    blocked: boolean;
}

/**
 * Place lab, radiology, and drug orders from one call, delegating to the
 * existing `createLabOrder` + `createPrescription` actions (which keep their
 * own auth, numbering, and audit). Before prescribing, we run the allergy
 * check; if there are warnings and the clinician hasn't acknowledged them, we
 * stop before writing anything and return the warnings so the UI can confirm.
 */
async function _placeUnifiedOrder(user: User, values: UnifiedOrderInput, path?: string): Promise<UnifiedOrderResult> {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.patientId) throw new Error("A patient is required");

        const labTests = (values.labTests || []).filter((t) => t?.name?.trim());
        const radiologyTests = (values.radiologyTests || []).filter((t) => t?.name?.trim());
        const drugs = (values.drugs || []).filter((d) => d?.drugName?.trim());

        if (labTests.length === 0 && radiologyTests.length === 0 && drugs.length === 0) {
            throw new Error("Add at least one lab, radiology, or drug order");
        }

        await connectToDB();

        // Decision support: check drugs against structured allergies first.
        let allergyWarnings: AllergyWarning[] = [];
        if (drugs.length > 0) {
            const allergies = await Allergy.find({ patientId: values.patientId, del_flag: false }).lean();
            allergyWarnings = checkDrugAllergies(
                drugs.map((d) => d.drugName),
                allergies as unknown as { substance?: string; severity?: string; status?: string; reaction?: string }[],
            );
            if (allergyWarnings.length > 0 && !values.acknowledgeAllergyWarnings) {
                // Block the write and let the caller confirm. Nothing is created.
                return { allergyWarnings, blocked: true };
            }
        }

        const result: UnifiedOrderResult = { allergyWarnings, blocked: false };

        if (labTests.length > 0) {
            const order = await createLabOrder(
                {
                    patientId: values.patientId,
                    attendanceId: values.attendanceId || null,
                    category: "lab",
                    tests: labTests.map((t) => ({ name: t.name.trim() })),
                    note: values.note || "",
                },
                path,
            );
            result.labOrderId = order?._id;
        }

        if (radiologyTests.length > 0) {
            const order = await createLabOrder(
                {
                    patientId: values.patientId,
                    attendanceId: values.attendanceId || null,
                    category: "radiology",
                    tests: radiologyTests.map((t) => ({ name: t.name.trim() })),
                    note: values.note || "",
                },
                path,
            );
            result.radiologyOrderId = order?._id;
        }

        if (drugs.length > 0) {
            const prescription = await createPrescription(
                {
                    patientId: values.patientId,
                    appointmentId: values.attendanceId || null,
                    items: drugs.map((d) => ({
                        productId: d.productId || null,
                        drugName: d.drugName.trim(),
                        dosage: d.dosage || "",
                        frequency: d.frequency || "",
                        duration: d.duration || "",
                        quantity: Number(d.quantity) || 1,
                        instructions: d.instructions || "",
                    })),
                    notes: values.note || "",
                },
                path,
            );
            result.prescriptionId = prescription?._id;
        }

        await History.create({
            actionType: "CPOE_ORDER_PLACED",
            details: {
                patientId: values.patientId,
                labs: labTests.length,
                radiology: radiologyTests.length,
                drugs: drugs.length,
                allergyWarnings: allergyWarnings.length,
            },
            message: `${user.fullName} placed a unified order (${labTests.length} lab, ${radiologyTests.length} radiology, ${drugs.length} drug) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: values.patientId as unknown as undefined,
            entityType: "CPOE_ORDER",
        });

        if (path) revalidatePath(path);
        return result;
    } catch (error) {
        console.error("Error placing unified order:", error);
        throw error;
    }
}
export const placeUnifiedOrder = await withAuth(_placeUnifiedOrder, "attPrescribe");
