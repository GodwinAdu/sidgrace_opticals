import { model, models, Schema, Model } from "mongoose";

const RecallSchema = new Schema<IRecall>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        type: { type: String, required: true, default: "6-month checkup" },
        dueDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ["pending", "contacted", "scheduled", "completed", "cancelled"],
            default: "pending",
        },
        lastRemindedAt: { type: Date, default: null },
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

RecallSchema.index({ dueDate: 1, status: 1 });

const Recall: Model<IRecall> =
    models.Recall ?? model<IRecall>("Recall", RecallSchema);

export default Recall;
