import { model, models, Schema, Model } from "mongoose";

const PerioMeasurementSchema = new Schema(
    {
        tooth: { type: Number, required: true },
        pocketDepth: { type: [Number], default: [] },
        bleeding: { type: Boolean, default: false },
        recession: { type: Number, default: 0 },
        mobility: { type: Number, default: 0 },
    },
    { _id: false }
);

const PerioChartSchema = new Schema<IPerioChart>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
        measurements: { type: [PerioMeasurementSchema], default: [] },
        note: { type: String, default: "" },
        examinedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

PerioChartSchema.index({ patientId: 1, createdAt: -1 });

const PerioChart: Model<IPerioChart> =
    models.PerioChart ?? model<IPerioChart>("PerioChart", PerioChartSchema);

export default PerioChart;
