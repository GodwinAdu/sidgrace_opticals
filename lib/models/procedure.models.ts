import { model, models, Schema, Model } from "mongoose";

const ProcedureSchema = new Schema<IProcedure>(
    {
        code: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true, default: "General" },
        description: { type: String, trim: true },
        defaultDuration: { type: Number, default: 30 },
        price: { type: Number, default: 0, min: 0 },
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

const Procedure: Model<IProcedure> =
    models.Procedure ?? model<IProcedure>("Procedure", ProcedureSchema);

export default Procedure;
