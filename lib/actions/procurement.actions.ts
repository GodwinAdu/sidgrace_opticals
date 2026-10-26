"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Requisition from "../models/requisition.models";
import PurchaseOrder from "../models/purchase-order.models";
import Grn from "../models/grn.models";
import InventoryProduct from "../models/inventory-product.models";
import InventorySupplier from "../models/inventory-supplier.models";
import History from "../models/history.models";
import { User, withAuth } from "../helpers/auth";
import { nextSequence } from "../models/counter.models";
import { deleteDocument } from "./trash.actions";
import {
    canTransitionRequisition,
    canIssuePurchaseOrder,
    canTransitionPurchaseOrder,
    canReceiveGrn,
    reconcileGrn,
    type RequisitionStatus,
    type PurchaseOrderStatus,
    type OrderedLine,
    type ReceivedLine,
} from "../clinical/procurement";

const PROCUREMENT_PATH = "/dashboard/procurement";

async function generateRequisitionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`requisition-${year}`);
    return `REQ-${year}-${String(seq).padStart(5, "0")}`;
}

async function generatePurchaseOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`purchase-order-${year}`);
    return `PO-${year}-${String(seq).padStart(5, "0")}`;
}

async function generateGrnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await nextSequence(`grn-${year}`);
    return `GRN-${year}-${String(seq).padStart(5, "0")}`;
}

/* ═══════════════════════════════ REQUISITIONS ═══════════════════════════════ */

interface RequisitionItemInput {
    productId: string;
    quantity: number;
    note?: string;
}

interface CreateRequisitionInput {
    title?: string;
    department?: string;
    storeId?: string | null;
    reason?: string;
    note?: string;
    items: RequisitionItemInput[];
}

/**
 * Raise a stock requisition. Requires at least one line with a product and a
 * positive quantity. A new requisition starts in `draft` so it can be edited
 * before being submitted for approval. Gated by `procurementManagement`.
 */
async function _createRequisition(user: User, values: CreateRequisitionInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        const items = (values?.items || []).filter((i) => i?.productId && Number(i?.quantity) > 0);
        if (items.length === 0) throw new Error("At least one requisition line with a quantity is required");
        await connectToDB();

        const requisitionNumber = await generateRequisitionNumber();
        const requisition = await Requisition.create({
            requisitionNumber,
            title: values.title?.trim() || "",
            department: values.department?.trim() || "",
            storeId: values.storeId || null,
            items: items.map((i) => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                note: i.note?.trim() || "",
            })),
            status: "draft",
            reason: values.reason?.trim() || "",
            note: values.note?.trim() || "",
            requestedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "REQUISITION_CREATED",
            details: { itemId: requisition._id, lines: items.length },
            message: `${user.fullName} raised requisition ${requisitionNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: requisition._id,
            entityType: "REQUISITION",
        });

        revalidatePath(PROCUREMENT_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(requisition));
    } catch (error) {
        console.error("Error creating requisition:", error);
        throw error;
    }
}
export const createRequisition = await withAuth(_createRequisition, "procurementManagement");

async function _getRequisitions(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const requisitions = await Requisition.find(query)
            .populate("items.productId", "name unit")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(requisitions || []));
    } catch (error) {
        console.error("Error fetching requisitions:", error);
        return [];
    }
}
export const getRequisitions = await withAuth(_getRequisitions);

/**
 * Advance a requisition's approval workflow (draft → submitted →
 * approved/rejected). The move is validated against the allowed transitions so
 * an invalid status can never be persisted, and an approval decision stamps the
 * approver + time for audit. Gated by `procurementManagement`.
 */
async function _updateRequisitionStatus(user: User, id: string, status: RequisitionStatus, note?: string, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A requisition is required");
        await connectToDB();

        const requisition = await Requisition.findById(id);
        if (!requisition) throw new Error("Requisition not found");

        if (!canTransitionRequisition(requisition.status as RequisitionStatus, status)) {
            throw new Error(`Cannot move a requisition from ${requisition.status} to ${status}`);
        }

        requisition.status = status;
        if (note && note.trim()) requisition.note = note.trim();
        if (status === "approved" || status === "rejected") {
            requisition.approvedBy = user._id as never;
            requisition.approvedAt = new Date();
        }
        requisition.mod_flag = true;
        requisition.modifiedBy = user._id as never;
        requisition.action_type = "updated";
        await requisition.save();

        await History.create({
            actionType: "REQUISITION_STATUS_CHANGED",
            details: { itemId: requisition._id, status },
            message: `${user.fullName} marked requisition ${requisition.requisitionNumber} as ${status} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: requisition._id,
            entityType: "REQUISITION",
        });

        revalidatePath(PROCUREMENT_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(requisition));
    } catch (error) {
        console.error("Error updating requisition status:", error);
        throw error;
    }
}
export const updateRequisitionStatus = await withAuth(_updateRequisitionStatus, "procurementManagement");

async function _deleteRequisition(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const requisition = await Requisition.findById(id);
        if (!requisition || !requisition._id) throw new Error("Requisition not found");

        await deleteDocument({
            actionType: "REQUISITION_DELETED",
            documentId: requisition._id.toString(),
            collectionName: "Requisition",
            userId: `${user._id}`,
            trashMessage: `Requisition ${requisition.requisitionNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted requisition ${requisition.requisitionNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(PROCUREMENT_PATH);
        return { success: true, message: "Requisition deleted successfully" };
    } catch (error) {
        console.error("Error deleting requisition:", error);
        throw error;
    }
}
export const deleteRequisition = await withAuth(_deleteRequisition, "procurementManagement");

/* ══════════════════════════════ PURCHASE ORDERS ═════════════════════════════ */

interface PurchaseOrderItemInput {
    productId: string;
    quantity: number;
    unitPrice?: number;
}

interface CreatePurchaseOrderInput {
    requisitionId: string;
    supplierId: string;
    storeId?: string | null;
    expectedDate?: Date | string | null;
    note?: string;
    // Optional override of line items; defaults to the requisition's lines.
    items?: PurchaseOrderItemInput[];
}

/**
 * Issue a purchase order to a supplier from an APPROVED requisition
 * (Requirement 10, criteria 1 & 2). The requisition must be approved — this is
 * the enforced approval gate — and the supplier must exist. The PO reuses the
 * requisition's lines (or an explicit override) and starts in `draft`. Gated by
 * `procurementManagement`.
 */
async function _createPurchaseOrder(user: User, values: CreatePurchaseOrderInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.requisitionId) throw new Error("An approved requisition is required");
        if (!values?.supplierId) throw new Error("A supplier is required");
        await connectToDB();

        const requisition = await Requisition.findById(values.requisitionId);
        if (!requisition) throw new Error("Requisition not found");
        if (!canIssuePurchaseOrder(requisition.status as RequisitionStatus)) {
            throw new Error("A purchase order can only be raised from an approved requisition");
        }

        const supplier = await InventorySupplier.findById(values.supplierId).select("name");
        if (!supplier) throw new Error("Supplier not found");

        // Default the PO lines to the requisition's lines, pricing each at the
        // product's current purchase price unless an explicit override is given.
        let items: { productId: string; quantity: number; unitPrice: number }[];
        if (values.items && values.items.length > 0) {
            items = values.items
                .filter((i) => i?.productId && Number(i?.quantity) > 0)
                .map((i) => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) || 0 }));
        } else {
            items = [];
            for (const line of requisition.items) {
                const product = await InventoryProduct.findById(line.productId).select("purchasePrice");
                items.push({
                    productId: String(line.productId),
                    quantity: Number(line.quantity),
                    unitPrice: Number(product?.purchasePrice) || 0,
                });
            }
        }
        if (items.length === 0) throw new Error("A purchase order needs at least one line");

        const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const poNumber = await generatePurchaseOrderNumber();

        const po = await PurchaseOrder.create({
            poNumber,
            requisitionId: requisition._id,
            supplierId: supplier._id,
            storeId: values.storeId || requisition.storeId || null,
            items,
            total,
            status: "draft",
            expectedDate: values.expectedDate ? new Date(values.expectedDate) : null,
            note: values.note?.trim() || "",
            issuedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        await History.create({
            actionType: "PURCHASE_ORDER_CREATED",
            details: { itemId: po._id, requisitionId: requisition._id, supplierId: supplier._id, total },
            message: `${user.fullName} raised purchase order ${poNumber} to ${supplier.name} from requisition ${requisition.requisitionNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: po._id,
            entityType: "PURCHASE_ORDER",
        });

        revalidatePath(PROCUREMENT_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(po));
    } catch (error) {
        console.error("Error creating purchase order:", error);
        throw error;
    }
}
export const createPurchaseOrder = await withAuth(_createPurchaseOrder, "procurementManagement");

async function _getPurchaseOrders(user: User, status?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (status && status !== "all") query.status = status;
        const orders = await PurchaseOrder.find(query)
            .populate("supplierId", "name")
            .populate("requisitionId", "requisitionNumber")
            .populate("items.productId", "name unit")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(orders || []));
    } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
    }
}
export const getPurchaseOrders = await withAuth(_getPurchaseOrders);

/**
 * Advance a purchase order's workflow (draft → ordered → received/cancelled).
 * Receipt itself is driven by a GRN (`receiveGrn`), so this action only allows
 * draft → ordered and the cancellations; moving straight to `received` here is
 * rejected. The move is validated against the allowed transitions. Gated by
 * `procurementManagement`.
 */
async function _updatePurchaseOrderStatus(user: User, id: string, status: PurchaseOrderStatus, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!id) throw new Error("A purchase order is required");
        if (status === "received") {
            throw new Error("A purchase order is received by recording a goods-receipt note");
        }
        await connectToDB();

        const po = await PurchaseOrder.findById(id);
        if (!po) throw new Error("Purchase order not found");

        if (!canTransitionPurchaseOrder(po.status as PurchaseOrderStatus, status)) {
            throw new Error(`Cannot move a purchase order from ${po.status} to ${status}`);
        }

        po.status = status;
        if (status === "ordered") po.orderedAt = new Date();
        po.mod_flag = true;
        po.modifiedBy = user._id as never;
        po.action_type = "updated";
        await po.save();

        await History.create({
            actionType: "PURCHASE_ORDER_STATUS_CHANGED",
            details: { itemId: po._id, status },
            message: `${user.fullName} marked purchase order ${po.poNumber} as ${status} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: po._id,
            entityType: "PURCHASE_ORDER",
        });

        revalidatePath(PROCUREMENT_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(po));
    } catch (error) {
        console.error("Error updating purchase order status:", error);
        throw error;
    }
}
export const updatePurchaseOrderStatus = await withAuth(_updatePurchaseOrderStatus, "procurementManagement");

async function _deletePurchaseOrder(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const po = await PurchaseOrder.findById(id);
        if (!po || !po._id) throw new Error("Purchase order not found");

        await deleteDocument({
            actionType: "PURCHASE_ORDER_DELETED",
            documentId: po._id.toString(),
            collectionName: "PurchaseOrder",
            userId: `${user._id}`,
            trashMessage: `Purchase order ${po.poNumber} (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `${user.fullName} deleted purchase order ${po.poNumber} on ${new Date().toLocaleString()}.`,
        });

        revalidatePath(PROCUREMENT_PATH);
        return { success: true, message: "Purchase order deleted successfully" };
    } catch (error) {
        console.error("Error deleting purchase order:", error);
        throw error;
    }
}
export const deletePurchaseOrder = await withAuth(_deletePurchaseOrder, "procurementManagement");

/* ═══════════════════════════════════ GRN ════════════════════════════════════ */

interface GrnItemInput {
    productId: string;
    receivedQuantity: number;
}

interface ReceiveGrnInput {
    purchaseOrderId: string;
    receivedDate?: Date | string | null;
    note?: string;
    // Optional per-line received quantities; defaults to the ordered quantities.
    items?: GrnItemInput[];
}

/**
 * Receive goods against a purchase order via a GRN (Requirement 10,
 * criterion 2). The PO must be in `ordered` status. Each received line is
 * reconciled against the PO's ordered quantity (over/under-receipt is recorded
 * as a variance), the received quantity increments the product's inventory
 * stock (same increment pattern as `createPurchase`), and the PO is marked
 * `received`.
 *
 * Receipt is stock-only — no ledger expense is posted here — so the accounting
 * ledger stays cash-basis (Requirement 14). Gated by `procurementManagement`.
 */
async function _receiveGrn(user: User, values: ReceiveGrnInput, path?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        if (!values?.purchaseOrderId) throw new Error("A purchase order is required");
        await connectToDB();

        const po = await PurchaseOrder.findById(values.purchaseOrderId);
        if (!po) throw new Error("Purchase order not found");
        if (!canReceiveGrn(po.status as PurchaseOrderStatus)) {
            throw new Error("Only an ordered purchase order can be received");
        }

        const ordered: OrderedLine[] = po.items.map((i) => ({
            productId: String(i.productId),
            quantity: Number(i.quantity),
        }));

        // Default each received line to the full ordered quantity.
        const received: ReceivedLine[] =
            values.items && values.items.length > 0
                ? values.items
                      .filter((i) => i?.productId && Number(i?.receivedQuantity) >= 0)
                      .map((i) => ({ productId: i.productId, quantity: Number(i.receivedQuantity) }))
                : ordered.map((o) => ({ productId: o.productId, quantity: o.quantity }));

        const reconciled = reconcileGrn(ordered, received);

        // Increment inventory stock for each received product (same as createPurchase).
        for (const line of reconciled) {
            if (line.received <= 0) continue;
            const product = await InventoryProduct.findById(line.productId);
            if (product) {
                product.quantity += line.received;
                await product.save();
            }
        }

        const grnNumber = await generateGrnNumber();
        const grn = await Grn.create({
            grnNumber,
            purchaseOrderId: po._id,
            supplierId: po.supplierId,
            storeId: po.storeId || null,
            items: reconciled.map((l) => ({
                productId: l.productId,
                orderedQuantity: l.ordered,
                receivedQuantity: l.received,
                variance: l.variance,
            })),
            receivedDate: values.receivedDate ? new Date(values.receivedDate) : new Date(),
            note: values.note?.trim() || "",
            receivedBy: user._id,
            createdBy: user._id,
            action_type: "created",
        });

        // Close the PO out: delivery has been taken.
        po.status = "received";
        po.receivedAt = new Date();
        po.mod_flag = true;
        po.modifiedBy = user._id as never;
        po.action_type = "updated";
        await po.save();

        await History.create({
            actionType: "GRN_CREATED",
            details: { itemId: grn._id, purchaseOrderId: po._id, lines: reconciled.length },
            message: `${user.fullName} received goods for purchase order ${po.poNumber} as GRN ${grnNumber} on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: grn._id,
            entityType: "GRN",
        });

        revalidatePath(PROCUREMENT_PATH);
        if (path) revalidatePath(path);
        return JSON.parse(JSON.stringify(grn));
    } catch (error) {
        console.error("Error receiving GRN:", error);
        throw error;
    }
}
export const receiveGrn = await withAuth(_receiveGrn, "procurementManagement");

async function _getGrns(user: User, purchaseOrderId?: string) {
    try {
        if (!user) throw new Error("User not authenticated");
        await connectToDB();
        const query: Record<string, unknown> = { del_flag: false };
        if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId;
        const grns = await Grn.find(query)
            .populate("supplierId", "name")
            .populate("purchaseOrderId", "poNumber")
            .populate("items.productId", "name unit")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return JSON.parse(JSON.stringify(grns || []));
    } catch (error) {
        console.error("Error fetching GRNs:", error);
        return [];
    }
}
export const getGrns = await withAuth(_getGrns);
