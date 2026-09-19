import { model, models, Schema, Model } from "mongoose";

const ImagingSchema = new Schema<IImaging>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
        tooth: { type: Number, default: null },
        type: {
            type: String,
            enum: ["radiograph", "intraoral-photo", "panoramic", "cbct", "other"],
            default: "radiograph",
        },
        title: { type: String, required: true, trim: true },
        fileUrl: { type: String, required: true },
        note: { type: String, default: "" },
        takenAt: { type: Date, default: Date.now },
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

ImagingSchema.index({ patientId: 1, createdAt: -1 });

const Imaging: Model<IImaging> =
    models.Imaging ?? model<IImaging>("Imaging", ImagingSchema);

export default Imaging;
