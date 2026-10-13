import { model, models, Schema, Model } from "mongoose";

/**
 * Procurement — Goods Receipt Note (GRN).
 *
 * A `Grn` records the receipt of goods against a `PurchaseOrder`
 * (Requirement 10, criterion 2). Each received line reuses `InventoryProduct`
 * and, on receipt, increments that product's stock quantity (the same stock
 * increment pattern as `createPurchase`). The received quantities are
 * reconciled against the PO's ordered quantities by the pure helper
 * lib/clinical/procurement so over/under-receipts are visible and auditable.
 *
 * Receipt is stock-only: no ledger expense is posted at GRN time, so the
 * accounting ledger stays cash-basis (Requirement 14).
 */

const GrnSchema = new Schema<IGrn>(
    {
        grnNumber: { type: String, required: true, unique: true },
        purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "InventorySupplier", default: null },
        storeId: { type: Schema.Types.ObjectId, ref: "InventoryStore", default: null },
        items: [
            {
                productId: { type: Schema.Types.ObjectId, ref: "InventoryProduct", required: true },
                orderedQuantity: { type: Number, default: 0 },
                receivedQuantity: { type: Number, required: true, min: 0 },
                // received − ordered: short-shipment (negative) / over-receipt (positive).
                variance: { type: Number, default: 0 },
            },
        ],
        receivedDate: { type: Date, default: Date.now },
        note: { type: String, default: "" },
        receivedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

// Reads find a PO's receipts, and the board sorts newest-first.
GrnSchema.index({ purchaseOrderId: 1 });
GrnSchema.index({ createdAt: -1 });

const Grn: Model<IGrn> = models.Grn ?? model<IGrn>("Grn", GrnSchema);

export default Grn;
