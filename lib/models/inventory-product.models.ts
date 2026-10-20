import { Schema, model, models, Model } from "mongoose";

const InventoryProductSchema: Schema<IInventoryProduct> = new Schema({
    name: {
        type: String,
        required: true,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryCategory',
    },
    purchasePrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    // ─────────── Drug / pharmacy fields (optional) ───────────
    isDrug: {
        type: Boolean,
        default: false,
    },
    strength: {
        type: String,
        default: "",
    },
    form: {
        type: String,
        default: "",
    },
    unit: {
        type: String,
        default: "",
    },
    reorderLevel: {
        type: Number,
        default: 0,
    },
    prescriptionRequired: {
        type: Boolean,
        default: false,
    },
    // ─────────── Chart-of-Accounts links (optional; null = fall back to defaults) ───────────
    inventoryAccountId: {
        type: Schema.Types.ObjectId,
        ref: "ChartAccount",
        default: null,
    },
    revenueAccountId: {
        type: Schema.Types.ObjectId,
        ref: "ChartAccount",
        default: null,
    },
    cogsAccountId: {
        type: Schema.Types.ObjectId,
        ref: "ChartAccount",
        default: null,
    },
    // ─────────── Batch / lot tracking (embedded; quantity stays the derived sum) ───────────
    batches: [
        {
            batchNumber: {
                type: String,
                required: true,
            },
            expiryDate: {
                type: Date,
                default: null,
            },
            quantity: {
                type: Number,
                required: true,
                min: 0,
            },
            manufactureDate: {
                type: Date,
                default: null,
            },
            costPerUnit: {
                type: Number,
                default: null,
            },
            supplierId: {
                type: Schema.Types.ObjectId,
                ref: "InventorySupplier",
                default: null,
            },
            receivedAt: {
                type: Date,
                default: null,
            },
        }
    ],
    // ─────────── Additional pharmacy fields (optional) ───────────
    genericName: {
        type: String,
        default: "",
    },
    manufacturer: {
        type: String,
        default: "",
    },
    barcode: {
        type: String,
        default: "",
    },
    storageConditions: {
        type: String,
        default: "",
    },
    controlledSubstance: {
        type: Boolean,
        default: false,
    },
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
type InventoryProductModel = Model<IInventoryProduct>;

// Create or retrieve the InventoryProduct model
const InventoryProduct: InventoryProductModel = models.InventoryProduct || model<IInventoryProduct>("InventoryProduct", InventoryProductSchema);

export default InventoryProduct;
