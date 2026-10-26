import { model, models, Schema, Model } from "mongoose";

const WardSchema = new Schema<IWard>(
    {
        name: { type: String, required: true },
        type: {
            type: String,
            enum: ["general", "private", "semi-private", "icu", "maternity", "pediatric", "other"],
            default: "general",
        },
        // Per-day bed charge for this ward (0 = no bed charge).
        dailyRate: { type: Number, default: 0 },
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

const Ward: Model<IWard> = models.Ward ?? model<IWard>("Ward", WardSchema);

export default Ward;
