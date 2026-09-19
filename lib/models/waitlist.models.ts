import { model, models, Schema, Model } from "mongoose";

const WaitlistSchema = new Schema<IWaitlist>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        reason: { type: String, default: "" },
        preferredDate: { type: Date, default: null },
        priority: {
            type: String,
            enum: ["normal", "urgent", "emergency"],
            default: "normal",
        },
        status: {
            type: String,
            enum: ["waiting", "contacted", "scheduled", "removed"],
            default: "waiting",
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

WaitlistSchema.index({ status: 1, priority: 1, createdAt: 1 });

const Waitlist: Model<IWaitlist> =
    models.Waitlist ?? model<IWaitlist>("Waitlist", WaitlistSchema);

export default Waitlist;
