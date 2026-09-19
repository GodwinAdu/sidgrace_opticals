"use server";

/**
 * Attendance-scoped clinical actions.
 *
 * These write the per-visit dental clinical records directly onto the
 * Attendance document (embedded snapshot) AND mirror each record into the
 * matching standalone collection (ClinicalNote / PerioChart / Imaging),
 * tagged with the patient so the clinical hub, patient timeline and reports
 * keep working. The standalone document _id is stored back on the embedded
 * entry to keep the two in sync.
 */

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import { withAuth, type User } from "../helpers/auth";
import Attendance from "../models/attendance.models";
import ClinicalNote from "../models/clinical-note.models";
import PerioChart from "../models/perio-chart.models";
import Imaging from "../models/imaging.models";
import { postLedgerEntry } from "./transaction.actions";
import Invoice from "../models/invoice.models";
import History from "../models/history.models";

interface DentalNoteInput {
    teeth?: number[];
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
}

interface PerioMeasurement {
    tooth: number;
    pocketDepth?: number[];
    bleeding?: boolean;
    recession?: number;
    mobility?: number;
}

interface ImagingInput {
    tooth?: number | null;
    type?: string;
    title?: string;
    fileUrl?: string;
    note?: string;
}

async function loadVisit(attendanceId: string) {
    const visit = await Attendance.findById(attendanceId);
    if (!visit) throw new Error("Attendance visit not found");
    // Older visits created before the billing field existed won't have a
    // `billing` subdocument. Initialize it so nested .set() paths materialize
    // and the returned billing object is never undefined.
    if (!visit.billing) {
        visit.set("billing", {
            invoiceId: null,
            invoiceNumber: "",
            consultationFee: 0,
            proceduresTotal: 0,
            otherCharges: [],
            totalCharged: 0,
            amountPaid: 0,
            balance: 0,
        });
    }
    return visit;
}

/* ─────────────── DENTAL NOTES ─────────────── */
async function _addVisitDentalNote(user: User, attendanceId: string, patientId: string, values: DentalNoteInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        // Mirror to the standalone ClinicalNote collection (timeline / clinical hub).
        const note = await ClinicalNote.create({
            patientId,
            appointmentId: null,
            teeth: values.teeth || [],
            subjective: values.subjective || "",
            objective: values.objective || "",
            assessment: values.assessment || "",
            plan: values.plan || "",
            authoredBy: user._id,
            createdBy: user._id,
        });

        // Embed a snapshot on the visit.
        visit.dentalNotes = visit.dentalNotes || [];
        visit.dentalNotes.push({
            teeth: values.teeth || [],
            subjective: values.subjective || "",
            objective: values.objective || "",
            assessment: values.assessment || "",
            plan: values.plan || "",
            authoredBy: user._id,
            noteId: note._id,
            createdAt: new Date(),
        });
        await visit.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ note, dentalNotes: visit.dentalNotes }));
    } catch (error) {
        console.error("Error adding visit dental note:", error);
        throw error;
    }
}
export const addVisitDentalNote = await withAuth(_addVisitDentalNote);

/* ─────────────── PERIO EXAM ─────────────── */
async function _saveVisitPerioExam(user: User, attendanceId: string, patientId: string, measurements: PerioMeasurement[], note: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        const chart = await PerioChart.create({
            patientId,
            appointmentId: null,
            measurements: measurements || [],
            note: note || "",
            examinedBy: user._id,
            createdBy: user._id,
        });

        visit.perioExam = {
            measurements: measurements || [],
            note: note || "",
            chartId: chart._id,
            recordedAt: new Date(),
        };
        await visit.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ chart, perioExam: visit.perioExam }));
    } catch (error) {
        console.error("Error saving visit perio exam:", error);
        throw error;
    }
}
export const saveVisitPerioExam = await withAuth(_saveVisitPerioExam);

/* ─────────────── IMAGING ─────────────── */
async function _addVisitImaging(user: User, attendanceId: string, patientId: string, values: ImagingInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values.fileUrl) throw new Error("Image file/URL is required");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        const image = await Imaging.create({
            patientId,
            appointmentId: null,
            tooth: values.tooth ?? null,
            type: values.type || "radiograph",
            title: values.title || "Untitled",
            fileUrl: values.fileUrl,
            note: values.note || "",
            takenAt: new Date(),
            createdBy: user._id,
        });

        visit.dentalImaging = visit.dentalImaging || [];
        visit.dentalImaging.push({
            tooth: values.tooth ?? null,
            type: values.type || "radiograph",
            title: values.title || "Untitled",
            fileUrl: values.fileUrl,
            note: values.note || "",
            imagingId: image._id,
            takenAt: new Date(),
        });
        await visit.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ image, dentalImaging: visit.dentalImaging }));
    } catch (error) {
        console.error("Error adding visit imaging:", error);
        throw error;
    }
}
export const addVisitImaging = await withAuth(_addVisitImaging);

/* ─────────────── READ (embedded snapshot for a visit) ─────────────── */
async function _getVisitClinical(user: User, attendanceId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await Attendance.findById(attendanceId)
            .select("dentalNotes perioExam dentalImaging dentalProcedures")
            .lean();
        if (!visit) return { dentalNotes: [], perioExam: null, dentalImaging: [], dentalProcedures: [] };
        return JSON.parse(JSON.stringify(visit));
    } catch (error) {
        console.error("Error reading visit clinical:", error);
        return { dentalNotes: [], perioExam: null, dentalImaging: [], dentalProcedures: [] };
    }
}
export const getVisitClinical = await withAuth(_getVisitClinical);

/* ─────────────── VISIT BILLING (cash-basis) ───────────────
 * Charges only BUILD the visit bill. Payments POST income to the ledger.
 * This keeps the accounting ledger on a cash basis: revenue is recorded when
 * the patient actually pays, not when a charge is entered.
 */
type PayMethod = "cash" | "card" | "mobile-money" | "bank-transfer" | "insurance" | "other";

interface VisitLike {
    dentalProcedures?: { cost?: number }[];
    billing?: {
        consultationFee?: number;
        otherCharges?: { label?: string; amount?: number }[];
        payments?: { amount?: number }[];
        amountPaid?: number;
    };
    set: (path: string, val: unknown) => void;
    markModified: (path: string) => void;
}

/**
 * Recomputes the visit's combined bill from its parts and refreshes the
 * totalCharged / amountPaid / balance rollup. Call after any charge change.
 * Mutates the passed mongoose document (does not save). The stored
 * billing.consultationFee is treated as the source of truth.
 */
function recomputeVisitBilling(visit: VisitLike) {
    // Convert to a plain object first — spreading a Mongoose subdocument does
    // not reliably copy its fields, which was silently dropping consultationFee.
    const raw = visit.billing as unknown as { toObject?: () => Record<string, unknown> } | undefined;
    const b = (raw?.toObject ? raw.toObject() : (raw as Record<string, unknown>)) || {};
    const consultationFee = Number(b.consultationFee) || 0;
    const proceduresTotal = (visit.dentalProcedures || []).reduce((s, p) => s + (Number(p.cost) || 0), 0);
    const otherCharges = (b.otherCharges as { amount?: number }[]) || [];
    const otherTotal = otherCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const totalCharged = consultationFee + proceduresTotal + otherTotal;
    const amountPaid = Number(b.amountPaid) || 0;
    const balance = Math.max(0, totalCharged - amountPaid);

    // Assign the full billing object and mark it modified. Setting individual
    // nested paths does NOT reliably persist when `billing` was previously
    // undefined on the document, so we replace the whole subtree.
    visit.set("billing", {
        ...b,
        consultationFee,
        proceduresTotal,
        otherCharges,
        totalCharged,
        amountPaid,
        balance,
    });
    visit.markModified("billing");
}

/**
 * Set the consultation fee for a visit. Builds the bill only — no ledger post.
 */
async function _setConsultationFee(user: User, attendanceId: string, amount: number, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        const fee = Number(amount) || 0;
        if (fee < 0) throw new Error("Consultation fee cannot be negative");

        visit.set("billing", { ...(visit.billing?.toObject?.() ?? visit.billing ?? {}), consultationFee: fee });
        recomputeVisitBilling(visit as unknown as VisitLike);
        await syncInvoiceIfExists(user, visit as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
        await visit.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.billing ?? {}));
    } catch (error) {
        console.error("Error setting consultation fee:", error);
        throw error;
    }
}
export const setConsultationFee = await withAuth(_setConsultationFee);

/* ─────────────── VISIT PROCEDURES (capture) ─────────────── */
interface VisitProcedureInput {
    procedureId?: string | null;
    procedureName?: string;
    tooth?: number | null;
    surface?: string;
    cost?: number;
    note?: string;
}

/**
 * Save the dental procedures performed this visit and rebuild the bill.
 * No ledger post — payments are what post revenue.
 */
async function _saveVisitProcedures(user: User, attendanceId: string, procedures: VisitProcedureInput[], path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        visit.dentalProcedures = (procedures || []).map((p) => ({
            procedureId: p.procedureId || null,
            procedureName: p.procedureName || "",
            tooth: p.tooth ?? null,
            surface: p.surface || "",
            cost: Number(p.cost) || 0,
            note: p.note || "",
            performedAt: new Date(),
        }));
        recomputeVisitBilling(visit as unknown as VisitLike);
        await syncInvoiceIfExists(user, visit as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
        await visit.save();

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ dentalProcedures: visit.dentalProcedures, billing: visit.billing }));
    } catch (error) {
        console.error("Error saving visit procedures:", error);
        throw error;
    }
}
export const saveVisitProcedures = await withAuth(_saveVisitProcedures);

/* ─────────────── OTHER CHARGES (manual line items) ─────────────── */
async function _setVisitOtherCharges(user: User, attendanceId: string, charges: { label: string; amount: number }[], path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);
        visit.set("billing", {
            ...(visit.billing?.toObject?.() ?? visit.billing ?? {}),
            otherCharges: (charges || []).map((c) => ({ label: c.label || "", amount: Number(c.amount) || 0 })),
        });
        recomputeVisitBilling(visit as unknown as VisitLike);
        await syncInvoiceIfExists(user, visit as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
        await visit.save();
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(visit.billing ?? {}));
    } catch (error) {
        console.error("Error setting other charges:", error);
        throw error;
    }
}
export const setVisitOtherCharges = await withAuth(_setVisitOtherCharges);

/* ─────────────── GENERATE INVOICE FROM VISIT ─────────────── */
async function generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments({});
    const seq = String(count + 1).padStart(5, "0");
    return `INV-${year}-${seq}`;
}

/** Build invoice line items + total from a visit's current charges. */
function buildVisitInvoiceItems(visit: {
    billing?: { consultationFee?: number; otherCharges?: { label?: string; amount?: number }[] };
    dentalProcedures?: { procedureId?: unknown; procedureName?: string; tooth?: number | null; cost?: number }[];
}) {
    // Typed loosely: Mongoose coerces string procedureId -> ObjectId on save.
    const items: Record<string, unknown>[] = [];
    const consultationFee = Number(visit.billing?.consultationFee) || 0;
    if (consultationFee > 0) {
        items.push({ description: "Consultation", procedureId: null, tooth: null, quantity: 1, unitPrice: consultationFee, amount: consultationFee });
    }
    for (const p of (visit.dentalProcedures || [])) {
        const cost = Number(p.cost) || 0;
        items.push({
            description: (p.procedureName || "Procedure") + (p.tooth ? ` (Tooth ${p.tooth})` : ""),
            procedureId: p.procedureId ? String(p.procedureId) : null,
            tooth: p.tooth ?? null,
            quantity: 1,
            unitPrice: cost,
            amount: cost,
        });
    }
    for (const c of (visit.billing?.otherCharges || [])) {
        const amt = Number(c.amount) || 0;
        items.push({ description: c.label || "Charge", procedureId: null, tooth: null, quantity: 1, unitPrice: amt, amount: amt });
    }
    const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    return { items, total };
}

/**
 * If the visit already has a linked invoice, refresh its line items/totals to
 * match the current charges (preserving payments). No-op when there is no
 * invoice yet. Also refreshes the mirrored balance on the visit. Call this
 * after any charge change so the invoice stays in sync automatically.
 * NOTE: caller is responsible for saving the visit doc.
 */
async function syncInvoiceIfExists(user: User, visit: {
    billing?: { invoiceId?: unknown; consultationFee?: number; otherCharges?: { label?: string; amount?: number }[] };
    dentalProcedures?: { procedureId?: unknown; procedureName?: string; tooth?: number | null; cost?: number }[];
    set: (path: string, val: unknown) => void;
}) {
    const invoiceId = visit.billing?.invoiceId;
    if (!invoiceId) return;
    const invoice = await Invoice.findById(String(invoiceId));
    if (!invoice) return;

    const { items, total } = buildVisitInvoiceItems(visit);
    const amountPaid = Number(invoice.amountPaid) || 0;
    invoice.items = items as never;
    invoice.subtotal = total;
    invoice.total = total;
    invoice.balance = Math.max(0, total - amountPaid);
    invoice.status = invoice.status === "cancelled"
        ? "cancelled"
        : amountPaid <= 0 ? "unpaid" : invoice.balance <= 0 ? "paid" : "partial";
    invoice.mod_flag = true;
    invoice.modifiedBy = user._id;
    await invoice.save();

    // Mirror the refreshed totals onto the visit for header/display.
    visit.set("billing.amountPaid", amountPaid);
    visit.set("billing.balance", invoice.balance);
}

/**
 * Generate a professional numbered Invoice from the visit's charges
 * (consultation + procedures + other charges). Stores the invoiceId +
 * number back on the visit. If an invoice already exists for the visit,
 * its line items/totals are refreshed instead of creating a duplicate.
 */
async function _createInvoiceFromVisit(user: User, attendanceId: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);
        recomputeVisitBilling(visit as unknown as VisitLike);

        const patientId = visit.patientId ? String(visit.patientId) : null;
        if (!patientId) throw new Error("Visit has no linked patient");

        const { items, total } = buildVisitInvoiceItems(visit as unknown as Parameters<typeof buildVisitInvoiceItems>[0]);
        if (items.length === 0) throw new Error("No charges to invoice. Add a consultation fee or procedures first.");

        const existingId = visit.billing?.invoiceId;
        let invoice;
        if (existingId) {
            invoice = await Invoice.findById(existingId);
        }

        if (invoice) {
            const amountPaid = Number(invoice.amountPaid) || 0;
            invoice.items = items as never;
            invoice.subtotal = total;
            invoice.total = total;
            invoice.balance = Math.max(0, total - amountPaid);
            invoice.status = invoice.status === "cancelled"
                ? "cancelled"
                : amountPaid <= 0 ? "unpaid" : invoice.balance <= 0 ? "paid" : "partial";
            invoice.mod_flag = true;
            invoice.modifiedBy = user._id;
            await invoice.save();
        } else {
            const invoiceNumber = await generateInvoiceNumber();
            invoice = await Invoice.create({
                invoiceNumber,
                patientId,
                items: items as never,
                subtotal: total,
                tax: 0,
                discount: 0,
                total,
                amountPaid: 0,
                balance: total,
                status: total > 0 ? "unpaid" : "paid",
                notes: "Generated from clinic visit",
                createdBy: user._id,
                action_type: "created",
            });
            await History.create({
                actionType: "INVOICE_CREATED",
                details: { itemId: invoice._id, deletedAt: new Date() },
                message: `${user.fullName} generated invoice ${invoiceNumber} from a visit on ${new Date().toLocaleString()}.`,
                performedBy: user._id,
                entityId: invoice._id,
                entityType: "INVOICE",
            });
        }

        visit.set("billing.invoiceId", invoice._id);
        visit.set("billing.invoiceNumber", invoice.invoiceNumber);
        visit.set("billing.amountPaid", Number(invoice.amountPaid) || 0);
        visit.set("billing.balance", Number(invoice.balance) || 0);
        await visit.save();

        if (path) revalidatePath(path);
        // Keep the billing/invoices list fresh on next navigation.
        revalidatePath("/dashboard/billing/invoices");
        return JSON.parse(JSON.stringify(invoice));
    } catch (error) {
        console.error("Error creating invoice from visit:", error);
        throw error;
    }
}
export const createInvoiceFromVisit = await withAuth(_createInvoiceFromVisit);

/** Fetch the invoice linked to a visit (or null). */
async function _getVisitInvoice(user: User, attendanceId: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);
        const invoiceId = visit.billing?.invoiceId;
        if (!invoiceId) return null;
        const invoice = await Invoice.findById(invoiceId).populate("patientId", "fullName patientId");
        return invoice ? JSON.parse(JSON.stringify(invoice)) : null;
    } catch (error) {
        console.error("Error fetching visit invoice:", error);
        return null;
    }
}
export const getVisitInvoice = await withAuth(_getVisitInvoice);

/* ─────────────── RECORD PAYMENT (through the invoice) ───────────────
 * Payments are recorded against the visit's Invoice via the Payment model.
 * This is the single revenue path: it creates a Payment, recomputes the
 * invoice's amountPaid/balance/status, and posts income to the ledger ONCE.
 * If the visit has no invoice yet, one is generated automatically first.
 */
async function _recordVisitPayment(user: User, attendanceId: string, amount: number, method: PayMethod, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);
        recomputeVisitBilling(visit as unknown as VisitLike);

        const pay = Number(amount) || 0;
        if (pay <= 0) throw new Error("Payment amount must be greater than zero");

        // Ensure there is an invoice to pay against.
        let invoiceId = visit.billing?.invoiceId ? String(visit.billing.invoiceId) : null;
        if (!invoiceId) {
            const inv = await _createInvoiceFromVisit(user, attendanceId);
            invoiceId = inv?._id ? String(inv._id) : null;
        }
        if (!invoiceId) throw new Error("Could not create an invoice for this visit");

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) throw new Error("Invoice not found");

        const total = Number(invoice.total) || 0;
        const alreadyPaid = Number(invoice.amountPaid) || 0;
        const outstanding = Math.max(0, total - alreadyPaid);
        if (outstanding <= 0) throw new Error("This invoice is already fully paid");
        if (pay > outstanding + 0.001) throw new Error("Payment exceeds the outstanding balance");

        const patientId = visit.patientId ? String(visit.patientId) : null;

        // 1) Save the Payment against the invoice.
        const { default: Payment } = await import("../models/payment.models");
        const payment = await Payment.create({
            patientId,
            invoiceId,
            amount: pay,
            method,
            note: "Visit payment",
            receivedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        // 2) Recompute the invoice from its payments.
        const invoicePayments = await Payment.find({ invoiceId, del_flag: false });
        const amountPaid = invoicePayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const balance = Math.max(0, total - amountPaid);
        invoice.amountPaid = amountPaid;
        invoice.balance = balance;
        invoice.status = invoice.status === "cancelled" ? "cancelled" : amountPaid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";
        await invoice.save();

        // 3) Post income to the ledger ONCE (cash-basis). Category by mix.
        const proceduresTotal = Number(visit.billing?.proceduresTotal) || 0;
        const consultationFee = Number(visit.billing?.consultationFee) || 0;
        const category = proceduresTotal > 0 ? "Procedure" : consultationFee > 0 ? "Consultation" : "Other Income";
        await postLedgerEntry(user, {
            type: "income",
            category,
            amount: pay,
            accountName: "Clinic Revenue",
            method,
            source: "payment",
            sourceId: payment._id ? String(payment._id) : null,
            patientId,
            description: `Payment for invoice ${invoice.invoiceNumber}`,
        });

        // 4) Mirror the invoice's paid/balance onto the visit for display.
        visit.set("billing.amountPaid", amountPaid);
        visit.set("billing.balance", balance);
        await visit.save();

        if (path) revalidatePath(path);
        // A payment posts revenue and updates the invoice — keep the billing,
        // transactions and accounting pages fresh on next navigation.
        revalidatePath("/dashboard/billing/invoices");
        revalidatePath(`/dashboard/billing/invoices/${invoiceId}`);
        revalidatePath("/dashboard/account/transactions");
        revalidatePath("/dashboard/account/income-statement");
        return JSON.parse(JSON.stringify({ billing: visit.billing, invoice }));
    } catch (error) {
        console.error("Error recording visit payment:", error);
        throw error;
    }
}
export const recordVisitPayment = await withAuth(_recordVisitPayment);
