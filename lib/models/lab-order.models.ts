import { model, models, Schema, Model } from "mongoose";

const LabTestSchema = new Schema(
    {
        name: { type: String, required: true },
        result: { type: String, default: "" },
        unit: { type: String, default: "" },
        referenceRange: { type: String, default: "" },
        flag: { type: String, enum: ["normal", "high", "low", "abnormal", ""], default: "" },
    },
    { _id: false },
);

const LabOrderSchema = new Schema<ILabOrder>(
    {
        orderNumber: { type: String, required: true, unique: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        category: { type: String, enum: ["lab", "radiology"], default: "lab" },
        tests: { type: [LabTestSchema], default: [] },
        status: {
            type: String,
            enum: ["ordered", "collected", "resulted", "cancelled"],
            default: "ordered",
        },
        note: { type: String, default: "" },
        resultNote: { type: String, default: "" },
        orderedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        collectedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        resultedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        collectedAt: { type: Date, default: null },
        resultedAt: { type: Date, default: null },
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
    { timestamps: true },
);

LabOrderSchema.index({ patientId: 1, createdAt: -1 });
LabOrderSchema.index({ attendanceId: 1 });
LabOrderSchema.index({ status: 1 });

const LabOrder: Model<ILabOrder> =
    models.LabOrder ?? model<ILabOrder>("LabOrder", LabOrderSchema);

export default LabOrder;
