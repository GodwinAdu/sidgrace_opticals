import { model, models, Schema, Model } from "mongoose";

const RosterSchema = new Schema<IRoster>(
    {
        staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        date: { type: Date, required: true },
        shiftStart: { type: String, default: "09:00" },
        shiftEnd: { type: String, default: "17:00" },
        room: { type: String, default: "" },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
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

RosterSchema.index({ date: 1, staffId: 1 });

const Roster: Model<IRoster> =
    models.Roster ?? model<IRoster>("Roster", RosterSchema);

export default Roster;
