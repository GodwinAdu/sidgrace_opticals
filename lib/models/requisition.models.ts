import { model, models, Schema, Model } from "mongoose";

/**
 * Procurement — Requisition.
 *
 * A `Requisition` is an internal request for stock that must be approved before
 * a purchase order can be raised from it (Requirement 10, criterion 1). It
 * carries a list of requested products (reusing `InventoryProduct`) with
 * quantities, and moves through the approval workflow draft → submitted →
 * approved/rejected. The allowed transitions live in the pure helper
 * lib/clinical/procurement so they can be unit-tested and shared with the UI.
 */

const RequisitionSchema = new Schema<IRequisition>(
    {
        requisitionNumber: { type: String, required: true, unique: true },
        title: { type: String, default: "" },
        department: { type: String, default: "" },
        storeId: { type: Schema.Types.ObjectId, ref: "InventoryStore", default: null },
        items: [
            {
                productId: { type: Schema.Types.ObjectId, ref: "InventoryProduct", required: true },
                quantity: { type: Number, required: true, min: 1 },
                note: { type: String, default: "" },
            },
        ],
        status: {
            type: String,
            enum: ["draft", "submitted", "approved", "rejected"],
            default: "draft",
        },
        reason: { type: String, default: "" },
        note: { type: String, default: "" },
        // Audit of the approval decision (role-gated at the action layer).
        requestedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        approvedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        approvedAt: { type: Date, default: null },
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

// Board reads filter by status and sort newest-first.
RequisitionSchema.index({ status: 1, createdAt: -1 });

const Requisition: Model<IRequisition> =
    models.Requisition ?? model<IRequisition>("Requisition", RequisitionSchema);

export default Requisition;
