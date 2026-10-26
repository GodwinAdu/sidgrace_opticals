import { model, models, Schema, Model } from "mongoose";

/**
 * Procurement — Purchase Order.
 *
 * A `PurchaseOrder` is issued to a supplier (reusing `InventorySupplier`) from
 * an APPROVED requisition (Requirement 10, criteria 1 & 2). It reuses
 * `InventoryProduct` for its line items and records the ordered quantity and
 * unit price per line so the monetary total can be shown. The PO moves through
 * draft → ordered → received/cancelled; the received step is driven by a GRN.
 * The allowed transitions live in the pure helper lib/clinical/procurement.
 */

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        poNumber: { type: String, required: true, unique: true },
        requisitionId: { type: Schema.Types.ObjectId, ref: "Requisition", required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "InventorySupplier", required: true },
        storeId: { type: Schema.Types.ObjectId, ref: "InventoryStore", default: null },
        items: [
            {
                productId: { type: Schema.Types.ObjectId, ref: "InventoryProduct", required: true },
                quantity: { type: Number, required: true, min: 1 },
                unitPrice: { type: Number, default: 0 },
            },
        ],
        total: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["draft", "ordered", "received", "cancelled"],
            default: "draft",
        },
        expectedDate: { type: Date, default: null },
        orderedAt: { type: Date, default: null },
        receivedAt: { type: Date, default: null },
        note: { type: String, default: "" },
        issuedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        modifiedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        mod_flag: { type: Boolean, default: false },
        del_flag: { type: Boolean, default: false },
        action_type: {
            type: String,
            enum: ["created", "updated", "deleted", "restored"],
            default: "created",
        },
    },
    { timestamps: true }
);

// Board reads filter by status/supplier and sort newest-first.
PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ requisitionId: 1 });

const PurchaseOrder: Model<IPurchaseOrder> =
    models.PurchaseOrder ?? model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);

export default PurchaseOrder;
