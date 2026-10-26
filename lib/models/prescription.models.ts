import { model, models, Schema, Model } from "mongoose";

const PrescriptionItemSchema = new Schema(
    {
        // Optional link to an inventory drug product (so pharmacy can dispense it).
        productId: { type: Schema.Types.ObjectId, ref: "InventoryProduct", default: null },
        drugName: { type: String, required: true },
        dosage: { type: String, default: "" },
        frequency: { type: String, default: "" },
        duration: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        dispensedQuantity: { type: Number, default: 0 },
        instructions: { type: String, default: "" },
    },
    { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        prescribedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        status: {
            type: String,
            enum: ["pending", "partially-dispensed", "dispensed", "cancelled"],
            default: "pending",
        },
        items: { type: [PrescriptionItemSchema], default: [] },
        notes: { type: String, default: "" },
        dispensedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        dispensedAt: { type: Date, default: null },
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

PrescriptionSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ status: 1, createdAt: -1 });

const Prescription: Model<IPrescription> =
    models.Prescription ?? model<IPrescription>("Prescription", PrescriptionSchema);

export default Prescription;
