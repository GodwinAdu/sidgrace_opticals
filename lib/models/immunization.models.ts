import { model, models, Schema, Model } from "mongoose";

/**
 * Structured immunization record (longitudinal, patient-scoped).
 */
const ImmunizationSchema = new Schema<IImmunization>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        vaccine: { type: String, required: true },
        dose: { type: String, default: "" },
        administeredDate: { type: Date, default: null },
        route: { type: String, default: "" },
        site: { type: String, default: "" },
        batchNumber: { type: String, default: "" },
        note: { type: String, default: "" },
        recordedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

ImmunizationSchema.index({ patientId: 1, administeredDate: -1 });

const Immunization: Model<IImmunization> =
    models.Immunization ?? model<IImmunization>("Immunization", ImmunizationSchema);

export default Immunization;
