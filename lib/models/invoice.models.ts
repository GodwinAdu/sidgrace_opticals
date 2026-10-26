import { model, models, Schema, Model } from "mongoose";

const InvoiceItemSchema = new Schema(
    {
        description: { type: String, required: true },
        procedureId: { type: Schema.Types.ObjectId, ref: "Procedure", default: null },
        tooth: { type: Number, default: null },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
    },
    { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
    {
        invoiceNumber: { type: String, required: true, unique: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        // Direct link to the clinical visit this invoice bills (when it was
        // generated from an attendance). Null for manual / plan invoices.
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        // How the invoice came to exist, so the billing list can distinguish
        // auto-generated visit bills from manually created ones.
        source: {
            type: String,
            enum: ["visit", "manual", "plan"],
            default: "manual",
        },
        treatmentPlanId: { type: Schema.Types.ObjectId, ref: "TreatmentPlan", default: null },
        items: { type: [InvoiceItemSchema], default: [] },
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        amountPaid: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["draft", "unpaid", "partial", "paid", "cancelled"],
            default: "unpaid",
        },
        dueDate: { type: Date, default: null },
        notes: { type: String, default: "" },
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

InvoiceSchema.index({ patientId: 1, createdAt: -1 });
InvoiceSchema.index({ attendanceId: 1 });

const Invoice: Model<IInvoice> =
    models.Invoice ?? model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;
