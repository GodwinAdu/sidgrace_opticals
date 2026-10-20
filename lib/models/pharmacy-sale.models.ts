import { model, models, Schema, Model } from "mongoose";

/**
 * A single depleted-batch row captured on a sale item, so a void can restore
 * stock into the originally-consumed lot and the COGS relief can be traced.
 */
const PharmacySaleBatchLineSchema = new Schema(
    {
        batchNumber: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        costPerUnit: { type: Number, default: null },
    },
    { _id: false }
);

/**
 * A priced cart line on a walk-in pharmacy sale. Mirrors InvoiceItemSchema's
 * embedded, `_id: false` convention.
 */
const PharmacySaleItemSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "InventoryProduct", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        prescriptionRequired: { type: Boolean, default: false },
        controlledSubstance: { type: Boolean, default: false },
        batchBreakdown: { type: [PharmacySaleBatchLineSchema], default: [] },
    },
    { _id: false }
);

const PharmacySaleSchema = new Schema<IPharmacySale>(
    {
        saleNumber: { type: String, required: true, unique: true },
        items: { type: [PharmacySaleItemSchema], default: [] },
        subTotal: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        customerName: { type: String, default: "" },
        customerPhone: { type: String, default: "" },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
        paymentMethod: {
            type: String,
            enum: ["cash", "card", "mobile-money", "bank-transfer", "other"],
            default: "cash",
        },
        paymentReference: { type: String, default: "" },
        amountTendered: { type: Number, default: 0 },
        change: { type: Number, default: 0 },
        authorizationNote: { type: String, default: "" },
        status: {
            type: String,
            enum: ["completed", "voided"],
            default: "completed",
        },
        journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },
        cogsJournalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },
        soldBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        voidedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        voidReason: { type: String, default: "" },
        createdBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        modifiedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        mod_flag: { type: Boolean, default: false },
        del_flag: { type: Boolean, default: false },
        action_type: {
            type: String,
            enum: ["created", "updated", "deleted", "restored", "voided"],
            default: "created",
        },
    },
    { timestamps: true }
);

PharmacySaleSchema.index({ createdAt: -1 });
PharmacySaleSchema.index({ patientId: 1, createdAt: -1 });

const PharmacySale: Model<IPharmacySale> =
    models.PharmacySale ?? model<IPharmacySale>("PharmacySale", PharmacySaleSchema);

export default PharmacySale;
