import { model, models, Schema, Model } from "mongoose";

const BedSchema = new Schema<IBed>(
    {
        label: { type: String, required: true },
        wardId: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
        status: {
            type: String,
            enum: ["vacant", "occupied", "maintenance"],
            default: "vacant",
        },
        // The admission currently occupying this bed (null when vacant).
        currentAdmissionId: { type: Schema.Types.ObjectId, ref: "Admission", default: null },
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

// No two beds with the same label in the same ward.
BedSchema.index({ wardId: 1, label: 1 }, { unique: true });

const Bed: Model<IBed> = models.Bed ?? model<IBed>("Bed", BedSchema);

export default Bed;
