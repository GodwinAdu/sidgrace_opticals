import { model, models, Schema, Model } from "mongoose";

/**
 * Emergency / A&E case. One record per ER visit, linked to the patient and
 * (optionally) an attendance/visit. Carries triage level + chief complaint,
 * bay assignment, and the final disposition that routes the patient onward
 * (admit / discharge / refer / transfer).
 */
const EmergencyCaseSchema = new Schema<IEmergencyCase>(
    {
        caseNumber: { type: String, required: true, unique: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        triageLevel: { type: String, required: true },
        chiefComplaint: { type: String, required: true },
        bay: { type: String, default: "" },
        status: {
            type: String,
            enum: ["waiting", "in-treatment", "disposed"],
            default: "waiting",
        },
        disposition: {
            type: String,
            enum: ["", "admit", "discharge", "refer", "transfer"],
            default: "",
        },
        dispositionNote: { type: String, default: "" },
        arrivedAt: { type: Date, default: Date.now },
        disposedAt: { type: Date, default: null },
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

EmergencyCaseSchema.index({ status: 1, triageLevel: 1, arrivedAt: 1 });
EmergencyCaseSchema.index({ patientId: 1, createdAt: -1 });

const EmergencyCase: Model<IEmergencyCase> =
    models.EmergencyCase ?? model<IEmergencyCase>("EmergencyCase", EmergencyCaseSchema);

export default EmergencyCase;
