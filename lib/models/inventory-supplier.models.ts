import { Schema, model, models, Model } from "mongoose";

const InventorySupplierSchema: Schema<IInventorySupplier> = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    companyName: {
        type: String,
    },
    contactNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
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
type InventorySupplierModel = Model<IInventorySupplier>;

// Create or retrieve the InventorySupplier model
const InventorySupplier: InventorySupplierModel = models.InventorySupplier || model<IInventorySupplier>("InventorySupplier", InventorySupplierSchema);

export default InventorySupplier;
