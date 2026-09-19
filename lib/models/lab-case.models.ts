import { model, models, Schema, Model } from "mongoose";

const LabCaseSchema = new Schema<ILabCase>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        labName: { type: String, required: true, trim: true },
        caseType: { type: String, required: true, default: "crown" },
        tooth: { type: Number, default: null },
        sentDate: { type: Date, default: Date.now },
        expectedDate: { type: Date, default: null },
        receivedDate: { type: Date, default: null },
        cost: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["sent", "in-progress", "received", "fitted", "cancelled"],
            default: "sent",
        },
        note: { type: String, default: "" },
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

LabCaseSchema.index({ status: 1, sentDate: -1 });

const LabCase: Model<ILabCase> =
    models.LabCase ?? model<ILabCase>("LabCase", LabCaseSchema);

export default LabCase;
