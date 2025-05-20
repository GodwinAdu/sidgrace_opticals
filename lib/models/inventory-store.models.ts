import { Schema, model, models, Model } from "mongoose";

const InventoryStoreSchema: Schema<IInventoryStore> = new Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        required: true,
    },
    categories: [{
        type: Schema.Types.ObjectId,
        ref: 'InventoryCategory',
        default: []
    }],
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
type InventoryStoreModel = Model<IInventoryStore>;

// Create or retrieve the InventoryStore model
const InventoryStore: InventoryStoreModel = models.InventoryStore || model<IInventoryStore>("InventoryStore", InventoryStoreSchema);

export default InventoryStore;
