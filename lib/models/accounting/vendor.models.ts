import { model, models, Schema, Model } from "mongoose";

/**
 * A vendor / supplier the clinic pays. Expenses and inventory purchases store a
 * `vendorId`, and the resulting `JournalEntry.vendorId` is stamped so vendor
 * spend is reportable (R11.1). When a vendor is referenced by posted activity it
 * is deactivated rather than hard-deleted (guard enforced in the action layer).
 */
const VendorSchema = new Schema<IVendor>(
    {
        name: { type: String, required: true, trim: true },
        contactName: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        address: { type: String, default: "" },
        // Registration / tax number.
        taxId: { type: String, default: "" },
        // Free-form terms, e.g. "net-30".
        paymentTerms: { type: String, default: "" },
        // Defaults to the settings A/P account when absent.
        payableAccountId: { type: Schema.Types.ObjectId, ref: "ChartAccount", default: null },
        isActive: { type: Boolean, default: true },
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

VendorSchema.index({ name: 1 });
VendorSchema.index({ isActive: 1 });

const Vendor: Model<IVendor> =
    models.Vendor ?? model<IVendor>("Vendor", VendorSchema);

export default Vendor;
