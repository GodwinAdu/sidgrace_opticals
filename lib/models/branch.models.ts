import { model, models, Schema, Model } from "mongoose";

const BranchSchema = new Schema<IBranch>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        address: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
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

const Branch: Model<IBranch> =
    models.Branch ?? model<IBranch>("Branch", BranchSchema);

export default Branch;
