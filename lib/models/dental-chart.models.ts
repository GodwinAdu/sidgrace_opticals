import { model, models, Schema, Model } from "mongoose";

const ToothConditionSchema = new Schema(
    {
        tooth: { type: Number, required: true },
        surface: { type: String, default: "whole" },
        condition: { type: String, required: true },
        note: { type: String, default: "" },
        recordedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const DentalChartSchema = new Schema<IDentalChart>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        numberingSystem: { type: String, enum: ["FDI", "Universal"], default: "Universal" },
        conditions: { type: [ToothConditionSchema], default: [] },
        generalNotes: { type: String, default: "" },
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

// One chart per patient
DentalChartSchema.index({ patientId: 1 }, { unique: true });

const DentalChart: Model<IDentalChart> =
    models.DentalChart ?? model<IDentalChart>("DentalChart", DentalChartSchema);

export default DentalChart;
