import { model, models, Schema, Model } from "mongoose";

const ClinicalNoteSchema = new Schema<IClinicalNote>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
        teeth: { type: [Number], default: [] },
        subjective: { type: String, default: "" },
        objective: { type: String, default: "" },
        assessment: { type: String, default: "" },
        plan: { type: String, default: "" },
        authoredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

ClinicalNoteSchema.index({ patientId: 1, createdAt: -1 });

const ClinicalNote: Model<IClinicalNote> =
    models.ClinicalNote ?? model<IClinicalNote>("ClinicalNote", ClinicalNoteSchema);

export default ClinicalNote;
