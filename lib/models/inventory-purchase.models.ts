import { Schema, model, models, Model } from "mongoose";

const InventoryPurchaseSchema: Schema<IInventoryPurchase> = new Schema({
    supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'InventorySupplier',
        required: true
    },
    storeId: {
        type: Schema.Types.ObjectId,
        ref: "InventoryStore",
        required: true,
    },
    status: {
        type: String,
        enum: ["Pending", "Ordered", "Received", "Rejected"],
        default: "Pending"
    },
    purchaseDate: {
        type: Date,
        required: true,
    },
    purchaseItems: [
        {
            products: {
                type: Schema.Types.ObjectId,
                ref: "InventoryProduct",
            },
            quantity: {
                type: Number,
                default: 1,
            },
            discount: {
                type: Number,
                default: 0,
            },
        }
    ],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    mod_flag: {
        type: Boolean,
        default: false
    },
    del_flag: {
        type: Boolean,
        default: false
    },
    modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    action_type: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false, // Removing version key.
    minimize: false, // Enabling full document update.
});

// Define the model type
type InventoryPurchaseModel = Model<IInventoryPurchase>;

// Create or retrieve the InventoryPurchase model
const InventoryPurchase: InventoryPurchaseModel = models.InventoryPurchase || model<IInventoryPurchase>("InventoryPurchase", InventoryPurchaseSchema);

export default InventoryPurchase;
