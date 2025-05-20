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
