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
import { postLedgerEntry, postLedgerEntryLines } from "./accounting/bridge.actions";
import { getSettingsInternal } from "./accounting/accounting-settings.actions";
import Invoice from "../models/invoice.models";
import History from "../models/history.models";
import InventoryProduct from "../models/inventory-product.models";
import ChartAccount from "../models/accounting/chart-account.models";
import { nextSequence } from "../models/counter.models";
import { makeVersion } from "../clinical/attribution";
import { writeVisitAuditEntry } from "../helpers/clinical-audit";
import {
    type Batch,
    type ConsumedBatch,
    depleteFefo,
    restoreStock,
    sumBatchQuantity,
    coerceLegacyToOpeningBatch,
    isInsufficientStockError,
} from "../inventory/batches";
import { pickAccountCode } from "../inventory/account-resolution";
import {
    buildCogsReliefJournalLines,
    type ConsumedBatchCost,
} from "../inventory/postings";

/**
 * Derive the denormalised `authoredByName` / `authoredByRole` snapshots from the
 * authenticated `user`, reusing the exact precedence encoded by the pure
 * `makeVersion` helper (name = fullName; role = specialization || role) so every
 * attributed write stamps identical attribution for the same user.
 */
function authorSnapshot(user: User) {
    const version = makeVersion(null, user as never, new Date());
    return { authoredByName: version.authoredByName, authoredByRole: version.authoredByRole };
}

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
        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.dentalNotes = visit.dentalNotes || [];
        visit.dentalNotes.push({
            teeth: values.teeth || [],
            subjective: values.subjective || "",
            objective: values.objective || "",
            assessment: values.assessment || "",
            plan: values.plan || "",
            authoredBy: user._id,
            authoredByName,
            authoredByRole,
            noteId: note._id,
            createdAt: new Date(),
        });
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "dentalNotes", noteId: String(note._id) },
            message: `${authoredByName || "A staff member"} recorded a dental note.`,
        });

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

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.perioExam = {
            measurements: measurements || [],
            note: note || "",
            chartId: chart._id,
            authoredBy: user._id,
            authoredByName,
            authoredByRole,
            recordedAt: new Date(),
        };
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "perioExam", chartId: String(chart._id) },
            message: `${authoredByName || "A staff member"} recorded a periodontal exam.`,
        });

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

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.dentalImaging = visit.dentalImaging || [];
        visit.dentalImaging.push({
            tooth: values.tooth ?? null,
            type: values.type || "radiograph",
            title: values.title || "Untitled",
            fileUrl: values.fileUrl,
            note: values.note || "",
            authoredBy: user._id,
            authoredByName,
            authoredByRole,
            imagingId: image._id,
            takenAt: new Date(),
        });
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "dentalImaging", imagingId: String(image._id) },
            message: `${authoredByName || "A staff member"} added a dental imaging record.`,
        });

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
        dispensedProducts?: { total?: number }[];
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
    const dispensedProducts = (b.dispensedProducts as { total?: number }[]) || [];
    const productsTotal = dispensedProducts.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const totalCharged = consultationFee + proceduresTotal + otherTotal + productsTotal;
    const amountPaid = Number(b.amountPaid) || 0;
    const balance = Math.max(0, totalCharged - amountPaid);

    // Assign the full billing object and mark it modified. Setting individual
    // nested paths does NOT reliably persist when `billing` was previously
    // undefined on the document, so we replace the whole subtree.
    visit.set("billing", {
        ...b,
        consultationFee,
        proceduresTotal,
        productsTotal,
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

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        visit.dentalProcedures = (procedures || []).map((p) => ({
            procedureId: p.procedureId || null,
            procedureName: p.procedureName || "",
            tooth: p.tooth ?? null,
            surface: p.surface || "",
            cost: Number(p.cost) || 0,
            note: p.note || "",
            authoredBy: user._id,
            authoredByName,
            authoredByRole,
            performedAt: new Date(),
        }));
        recomputeVisitBilling(visit as unknown as VisitLike);
        await syncInvoiceIfExists(user, visit as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "dentalProcedures", count: (procedures || []).length },
            message: `${authoredByName || "A staff member"} recorded ${(procedures || []).length} dental procedure(s).`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ dentalProcedures: visit.dentalProcedures, billing: visit.billing }));
    } catch (error) {
        console.error("Error saving visit procedures:", error);
        throw error;
    }
}
export const saveVisitProcedures = await withAuth(_saveVisitProcedures);

/**
 * APPEND procedures to the visit (does not replace existing ones) and rebuild
 * the bill. Used when sending items from a treatment plan to the current visit
 * bill. Ensures an invoice exists first so the charge is reflected even on
 * visits created before auto-invoicing. No ledger post.
 */
async function _addProceduresToVisit(user: User, attendanceId: string, procedures: VisitProcedureInput[], path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!procedures || procedures.length === 0) throw new Error("No procedures to add");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        const { authoredByName, authoredByRole } = authorSnapshot(user);
        const existing = (visit.dentalProcedures || []) as unknown[];
        const appended = (procedures || []).map((p) => ({
            procedureId: p.procedureId || null,
            procedureName: p.procedureName || "",
            tooth: p.tooth ?? null,
            surface: p.surface || "",
            cost: Number(p.cost) || 0,
            note: p.note || "",
            authoredBy: user._id,
            authoredByName,
            authoredByRole,
            performedAt: new Date(),
        }));
        visit.dentalProcedures = [...existing, ...appended] as never;

        recomputeVisitBilling(visit as unknown as VisitLike);

        // Guarantee an invoice exists so the bill reflects the new charges.
        if (!visit.billing?.invoiceId) {
            await _ensureVisitInvoice(user, attendanceId);
            // reload to pick up the invoiceId written by ensureVisitInvoice
            const refreshed = await loadVisit(attendanceId);
            refreshed.dentalProcedures = visit.dentalProcedures;
            recomputeVisitBilling(refreshed as unknown as VisitLike);
            await syncInvoiceIfExists(user, refreshed as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
            await refreshed.save();
            // Best-effort audit AFTER the clinical save (R7.3).
            await writeVisitAuditEntry({
                attendanceId,
                performedBy: String(user._id ?? user.id),
                details: { field: "dentalProcedures", count: appended.length },
                message: `${authoredByName || "A staff member"} added ${appended.length} dental procedure(s) to the visit.`,
            });
            if (path) revalidatePath(path);
            return JSON.parse(JSON.stringify({ dentalProcedures: refreshed.dentalProcedures, billing: refreshed.billing }));
        }

        await syncInvoiceIfExists(user, visit as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
        await visit.save();

        // Best-effort audit AFTER the clinical save (R7.3).
        await writeVisitAuditEntry({
            attendanceId,
            performedBy: String(user._id ?? user.id),
            details: { field: "dentalProcedures", count: appended.length },
            message: `${authoredByName || "A staff member"} added ${appended.length} dental procedure(s) to the visit.`,
        });

        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify({ dentalProcedures: visit.dentalProcedures, billing: visit.billing }));
    } catch (error) {
        console.error("Error adding procedures to visit:", error);
        throw error;
    }
}
export const addProceduresToVisit = await withAuth(_addProceduresToVisit);

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

/* ─────────────── DISPENSE PRODUCTS / DRUGS (inventory → visit bill) ─────────────── */
interface DispenseItemInput {
    productId: string;
    quantity: number;
}

/* ── Batch <-> schema conversion helpers (Mongoose stores Dates; the pure
 *    engine in lib/inventory/batches.ts speaks ISO strings). Mirrors the
 *    toIso / toDateOrNull / toPureBatch pattern in inventory-product.actions.ts
 *    so stock math stays identical between the app and the property tests. ── */

/** Normalize a `Date | string | null | undefined` to an ISO string or `null`. */
function toIso(value: string | Date | null | undefined): string | null {
    if (value == null || value === "") return null;
    const d = value instanceof Date ? value : new Date(value);
    const ms = d.getTime();
    return Number.isNaN(ms) ? null : d.toISOString();
}

/** Normalize a `Date | string | null | undefined` to a `Date` or `null` (schema side). */
function toDateOrNull(value: string | Date | null | undefined): Date | null {
    const iso = toIso(value);
    return iso == null ? null : new Date(iso);
}

/** Map a persisted product batch (Dates) to the pure engine's {@link Batch} shape (ISO strings). */
function toPureBatch(b: {
    batchNumber?: string;
    expiryDate?: Date | string | null;
    quantity?: number | null;
    manufactureDate?: Date | string | null;
    costPerUnit?: number | null;
    supplierId?: unknown;
    receivedAt?: Date | string | null;
}): Batch {
    return {
        batchNumber: String(b.batchNumber ?? ""),
        expiryDate: toIso(b.expiryDate ?? null),
        quantity: Number(b.quantity) || 0,
        manufactureDate: toIso(b.manufactureDate ?? null),
        costPerUnit: b.costPerUnit ?? null,
        supplierId: b.supplierId == null ? null : String(b.supplierId),
        receivedAt: toIso(b.receivedAt ?? null),
    };
}

/** Map a pure {@link Batch} back to the schema shape (ISO strings → Dates) for persistence. */
function toSchemaBatch(b: Batch) {
    return {
        batchNumber: b.batchNumber,
        expiryDate: toDateOrNull(b.expiryDate),
        quantity: Number(b.quantity) || 0,
        manufactureDate: toDateOrNull(b.manufactureDate),
        costPerUnit: b.costPerUnit ?? null,
        supplierId: (b.supplierId ?? null) as unknown,
        receivedAt: toDateOrNull(b.receivedAt),
    };
}

/**
 * Read the current batches off a product as pure {@link Batch}es, lazily coercing
 * a legacy scalar `quantity` into an opening batch (R7.1/R7.2) when the product
 * has a positive scalar quantity and no batches yet. Does NOT persist.
 */
function readProductBatches(product: {
    quantity?: number | null;
    batches?: unknown[] | null;
}): Batch[] {
    const existing = Array.isArray(product.batches)
        ? (product.batches as Parameters<typeof toPureBatch>[0][]).map(toPureBatch)
        : [];
    return coerceLegacyToOpeningBatch(Number(product.quantity) || 0, existing);
}

/**
 * Resolve an active, non-deleted ChartAccount by its `code`, returning its id as
 * a string, or null when the code is unset / unmatched. Mirrors the bridge's own
 * `resolveAccountByCode` and inventory-purchase's `resolveCodeToAccountId`.
 */
async function resolveCodeToAccountId(code: string | null | undefined): Promise<string | null> {
    if (!code) return null;
    const account = await ChartAccount.findOne({ code: String(code), del_flag: { $ne: true } });
    return account ? String(account._id) : null;
}

/**
 * Resolve a product's account link (a ChartAccount `_id`) to its `code`, so it
 * can feed the pure `pickAccountCode` resolver alongside the settings default
 * code. Returns null when the link is unset or the referenced account no longer
 * resolves to an active, non-deleted account. Mirrors inventory-purchase's
 * `resolveLinkIdToCode`.
 */
async function resolveLinkIdToCode(id: unknown): Promise<string | null> {
    if (!id) return null;
    const account = await ChartAccount.findOne({ _id: String(id), del_flag: { $ne: true } });
    return account ? String(account.code) : null;
}

/**
 * Dispense inventory products/drugs to the patient on this visit. Sets the
 * visit's dispensedProducts to the given list (full replace), reconciles
 * InventoryProduct stock by the DELTA vs what was previously dispensed on this
 * visit (so editing quantities doesn't double-decrement), prices each line at
 * the product's salePrice, then rebuilds the bill + syncs the invoice.
 * Guards against dispensing more than available stock.
 */
async function _dispenseVisitProducts(user: User, attendanceId: string, items: DispenseItemInput[], path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        const prevRaw = visit.billing?.dispensedProducts;
        const prev: { productId?: unknown; quantity?: number }[] = prevRaw
            ? (typeof (prevRaw as { toObject?: () => unknown }).toObject === "function"
                ? (prevRaw as unknown as { toObject: () => { productId?: unknown; quantity?: number }[] }).toObject()
                : (prevRaw as { productId?: unknown; quantity?: number }[]))
            : [];

        // Map previously-dispensed quantity per product.
        const prevQty = new Map<string, number>();
        for (const p of prev) {
            if (p.productId) prevQty.set(String(p.productId), (prevQty.get(String(p.productId)) || 0) + (Number(p.quantity) || 0));
        }

        const dispensed: { productId: string; name: string; quantity: number; unitPrice: number; total: number }[] = [];
        // Validate stock (delta) and build the priced list.
        for (const it of (items || [])) {
            const qty = Number(it.quantity) || 0;
            if (qty <= 0) continue;
            const product = await InventoryProduct.findById(it.productId);
            if (!product) throw new Error("Product not found");
            const unitPrice = Number(product.salePrice) || 0;
            dispensed.push({
                productId: String(it.productId),
                name: product.name,
                quantity: qty,
                unitPrice,
                total: unitPrice * qty,
            });
        }

        // ── Reconcile stock through the batch engine (R6.3/R6.4/R8.4/R8.5) ──
        // Mirror the scalar DELTA logic: for each product touched this visit,
        // delta = newly-dispensed − previously-dispensed. A POSITIVE delta
        // deplete()s that many units FEFO (skipping expired lots); a NEGATIVE
        // delta restore()s the difference. The pure engine computes the next
        // batch state WITHOUT mutating, so we stage every change and only
        // persist once ALL depletions succeed — an insufficient/expired-stock
        // error on any product aborts the whole op with no stock/ledger change.
        const now = new Date();
        const newQty = new Map<string, number>();
        for (const d of dispensed) newQty.set(d.productId, (newQty.get(d.productId) || 0) + d.quantity);
        const allIds = new Set<string>([...prevQty.keys(), ...newQty.keys()]);

        // consumedByProduct carries the per-batch cost breakdown produced by the
        // FEFO depletion so task 7.2 can post the COGS-relief JE from real
        // depleted-batch cost. Only POSITIVE-delta depletions produce rows.
        const consumedByProduct = new Map<string, ConsumedBatch[]>();
        // Per-product fallback cost (product.purchasePrice) feeding
        // computeCogsAmount/buildCogsReliefJournalLines when a consumed row's
        // costPerUnit is null. Keyed by String(productId), stashed during deplete.
        const fallbackPriceByProduct = new Map<string, number>();
        // First-seen COGS / Inventory account link codes (mirrors 6.1's single-JE
        // approach: the first depleted product carrying a link wins the account
        // resolution for the whole dispense; otherwise we fall back to defaults).
        let cogsLinkCode: string | null = null;
        let inventoryLinkCode: string | null = null;

        // Stage {product doc, next pure batch state} per changed product; persist
        // in a second pass so a throw mid-loop leaves nothing written.
        const pending: {
            product: IInventoryProduct;
            batches: Batch[];
        }[] = [];

        for (const id of allIds) {
            const delta = (newQty.get(id) || 0) - (prevQty.get(id) || 0);
            if (delta === 0) continue;

            const product = await InventoryProduct.findById(id);
            if (!product) continue;

            // Batch-aware view, lazily coercing a legacy scalar quantity to an
            // opening batch so products that predate batch tracking still work.
            const currentBatches = readProductBatches(product as unknown as { quantity?: number | null; batches?: unknown[] | null });

            let nextBatches: Batch[];
            if (delta > 0) {
                // Deplete FEFO. depleteFefo throws InsufficientStockError when the
                // non-expired available quantity (expired lots skipped per R8.5) is
                // less than the request, WITHOUT mutating the input batches.
                try {
                    const result = depleteFefo(currentBatches, delta, now);
                    nextBatches = result.batches;
                    consumedByProduct.set(String(id), result.consumed);
                    // Stash the per-product fallback cost (used when a consumed
                    // row has no costPerUnit) and claim the first COGS / Inventory
                    // account links for the single whole-dispense JE (R4.2/R4.3).
                    fallbackPriceByProduct.set(String(id), Number((product as unknown as { purchasePrice?: number }).purchasePrice) || 0);
                    const prod = product as unknown as { cogsAccountId?: unknown; inventoryAccountId?: unknown };
                    if (cogsLinkCode == null && prod.cogsAccountId) {
                        cogsLinkCode = await resolveLinkIdToCode(prod.cogsAccountId);
                    }
                    if (inventoryLinkCode == null && prod.inventoryAccountId) {
                        inventoryLinkCode = await resolveLinkIdToCode(prod.inventoryAccountId);
                    }
                } catch (err) {
                    if (isInsufficientStockError(err)) {
                        // Available = non-expired stock the engine would allow.
                        throw new Error(
                            `Not enough stock for ${product.name}. Available: ${err.available}`,
                        );
                    }
                    throw err;
                }
            } else {
                // Negative delta → return the difference to stock.
                nextBatches = restoreStock(currentBatches, -delta);
            }

            pending.push({ product: product as unknown as IInventoryProduct, batches: nextBatches });
        }

        // All depletions succeeded — now persist the staged batch states and keep
        // product.quantity = sumBatchQuantity(batches) (R6.1).
        for (const { product, batches } of pending) {
            if (!product) continue;
            product.batches = batches.map(toSchemaBatch) as unknown as IInventoryProduct["batches"];
            product.quantity = sumBatchQuantity(batches);
            await (product as unknown as { save: () => Promise<unknown> }).save();
        }

        // ── Post the COGS-relief JE only (R4.2/R4.3/R4.4/R4.5/R10.3) ──
        // Revenue is recognised EXACTLY ONCE by the existing payment path
        // (`recordVisitPayment` posts `type: "income"`); dispense posts NO revenue
        // JE. The only accounting here is the cost-of-goods-sold relief: debit COGS,
        // credit Inventory for the real depleted-batch cost.
        //
        // Single-JE scope (mirrors 6.1's purchase approach): the first depleted
        // product carrying a cogs/inventory link wins the account resolution;
        // otherwise we fall back to the settings defaults (COGS → expense,
        // Inventory → inventory). Per-product fallback prices are folded into the
        // consumed rows so a single `buildCogsReliefJournalLines` call computes the
        // correct aggregate amount across all depleted products.
        //
        // Skip-and-complete: if COGS or Inventory doesn't resolve, or the amount is
        // not strictly positive, nothing is posted and the dispense completes.
        if (consumedByProduct.size > 0) {
            const settings = await getSettingsInternal();
            const defaults = settings?.defaultAccounts || {};

            const cogsCode = pickAccountCode(cogsLinkCode, defaults.expense);
            const inventoryCode = pickAccountCode(inventoryLinkCode, defaults.inventory);
            const cogsAccountId = await resolveCodeToAccountId(cogsCode);
            const inventoryAccountId = await resolveCodeToAccountId(inventoryCode);

            if (cogsAccountId && inventoryAccountId) {
                // Fold each product's fallback price into its consumed rows: a
                // null costPerUnit becomes the product's purchasePrice, so the
                // single builder call (fallbackPrice 0) sums the real cost.
                const consumed: ConsumedBatchCost[] = [];
                for (const [pid, rows] of consumedByProduct) {
                    const fallback = fallbackPriceByProduct.get(pid) ?? 0;
                    for (const row of rows) {
                        consumed.push({
                            quantity: Number(row.quantity) || 0,
                            costPerUnit: row.costPerUnit == null ? fallback : row.costPerUnit,
                        });
                    }
                }

                const built = buildCogsReliefJournalLines({
                    consumed,
                    fallbackPrice: 0,
                    cogsAccountId,
                    inventoryAccountId,
                    memo: "COGS relief",
                });

                if (built) {
                    await postLedgerEntryLines(user, {
                        lines: built.lines,
                        memo: "COGS relief",
                        // No "dispense" source exists in the JE enum; use the
                        // neutral "bridge" origin (NOT "payment", to avoid any
                        // conflation with the revenue payment entries). Linked to
                        // the visit via sourceId for traceability.
                        source: "bridge",
                        sourceId: String(visit._id),
                        vendorId: null,
                    });
                }
            }
        }

        visit.set("billing", {
            ...(visit.billing?.toObject?.() ?? visit.billing ?? {}),
            dispensedProducts: dispensed,
        });
        recomputeVisitBilling(visit as unknown as VisitLike);
        await syncInvoiceIfExists(user, visit as unknown as Parameters<typeof syncInvoiceIfExists>[1]);
        await visit.save();

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/inventory/products");
        return JSON.parse(JSON.stringify(visit.billing ?? {}));
    } catch (error) {
        console.error("Error dispensing products:", error);
        throw error;
    }
}
export const dispenseVisitProducts = await withAuth(_dispenseVisitProducts);

/* ─────────────── GENERATE INVOICE FROM VISIT ─────────────── */
async function generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // Shares the same atomic sequence as invoice.actions so visit-generated and
    // manual invoices never collide.
    const seq = await nextSequence(`invoice-${year}`);
    return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

/** Build invoice line items + total from a visit's current charges. */
function buildVisitInvoiceItems(visit: {
    billing?: {
        consultationFee?: number;
        otherCharges?: { label?: string; amount?: number }[];
        dispensedProducts?: { name?: string; quantity?: number; unitPrice?: number; total?: number }[];
    };
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
    for (const d of (visit.billing?.dispensedProducts || [])) {
        const qty = Number(d.quantity) || 0;
        const unit = Number(d.unitPrice) || 0;
        const amt = Number(d.total) || unit * qty;
        items.push({ description: d.name || "Product", procedureId: null, tooth: null, quantity: qty || 1, unitPrice: unit, amount: amt });
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
    _id?: unknown;
    billing?: {
        invoiceId?: unknown;
        consultationFee?: number;
        otherCharges?: { label?: string; amount?: number }[];
        dispensedProducts?: { name?: string; quantity?: number; unitPrice?: number; total?: number }[];
    };
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
    // Self-heal the visit link on invoices created before these fields existed.
    if (!invoice.attendanceId && visit._id) invoice.attendanceId = visit._id as never;
    if (!invoice.source || invoice.source === "manual") invoice.source = "visit";
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
                attendanceId: visit._id,
                source: "visit",
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

/**
 * Ensure a visit has a linked invoice, creating one from current charges if it
 * does not. Unlike createInvoiceFromVisit this NEVER throws on "no charges" —
 * it creates an empty draft so the billing page always has a target to manage.
 * Idempotent: returns the existing invoice when one is already linked.
 * Intended to be called at OPD check-in (after the attendance is saved).
 */
async function _ensureVisitInvoice(user: User, attendanceId: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const visit = await loadVisit(attendanceId);

        const existingId = visit.billing?.invoiceId ? String(visit.billing.invoiceId) : null;
        if (existingId) {
            const existing = await Invoice.findById(existingId);
            if (existing) return JSON.parse(JSON.stringify(existing));
        }

        const patientId = visit.patientId ? String(visit.patientId) : null;
        if (!patientId) throw new Error("Visit has no linked patient");

        recomputeVisitBilling(visit as unknown as VisitLike);
        const { items, total } = buildVisitInvoiceItems(visit as unknown as Parameters<typeof buildVisitInvoiceItems>[0]);

        const invoiceNumber = await generateInvoiceNumber();
        const invoice = await Invoice.create({
            invoiceNumber,
            patientId,
            attendanceId: visit._id,
            source: "visit",
            items: items as never,
            subtotal: total,
            tax: 0,
            discount: 0,
            total,
            amountPaid: 0,
            balance: total,
            status: total > 0 ? "unpaid" : "draft",
            notes: "Generated at check-in",
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "INVOICE_CREATED",
            details: { itemId: invoice._id, deletedAt: new Date() },
            message: `${user.fullName} opened invoice ${invoiceNumber} at check-in on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: invoice._id,
            entityType: "INVOICE",
        });

        visit.set("billing.invoiceId", invoice._id);
        visit.set("billing.invoiceNumber", invoice.invoiceNumber);
        visit.set("billing.amountPaid", 0);
        visit.set("billing.balance", Number(invoice.balance) || 0);
        await visit.save();

        if (path) revalidatePath(path);
        revalidatePath("/dashboard/billing/invoices");
        return JSON.parse(JSON.stringify(invoice));
    } catch (error) {
        console.error("Error ensuring visit invoice:", error);
        throw error;
    }
}
export const ensureVisitInvoice = await withAuth(_ensureVisitInvoice);

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
        // journal entries and accounting pages fresh on next navigation.
        revalidatePath("/dashboard/billing/invoices");
        revalidatePath(`/dashboard/billing/invoices/${invoiceId}`);
        revalidatePath("/dashboard/account/journal-entries");
        revalidatePath("/dashboard/account/income-statement");
        return JSON.parse(JSON.stringify({ billing: visit.billing, invoice }));
    } catch (error) {
        console.error("Error recording visit payment:", error);
        throw error;
    }
}
export const recordVisitPayment = await withAuth(_recordVisitPayment);
