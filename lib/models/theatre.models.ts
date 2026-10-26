import { model, models, Schema, Model } from "mongoose";

/**
 * Operating theatre / surgery module.
 *
 * `Theatre` is a bookable operating room. `SurgeryCase` is one scheduled
 * operation linked to a patient, a procedure, surgeon(s), and a theatre. A case
 * moves scheduled → in-progress → completed / cancelled; on completion its cost
 * is posted onto the patient's invoice via the shared invoice sync path. The
 * slot-conflict guard (pure logic in lib/clinical/theatre) prevents two active
 * cases overlapping in the same theatre.
 */

const TheatreSchema = new Schema<ITheatre>(
    {
        name: { type: String, required: true, trim: true },
        location: { type: String, default: "", trim: true },
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

export const Theatre: Model<ITheatre> =
    models.Theatre ?? model<ITheatre>("Theatre", TheatreSchema);

const SurgeryCaseSchema = new Schema<ISurgeryCase>(
    {
        caseNumber: { type: String, required: true, unique: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        // Catalogued procedure being performed (drives the billable cost).
        procedureId: { type: Schema.Types.ObjectId, ref: "Procedure", default: null },
        procedureName: { type: String, default: "", trim: true },
        surgeons: [{ type: Schema.Types.ObjectId, ref: "Staff" }],
        theatreId: { type: Schema.Types.ObjectId, ref: "Theatre", required: true },
        scheduledAt: { type: Date, required: true },
        durationMinutes: { type: Number, default: 60 },
        status: {
            type: String,
            enum: ["scheduled", "in-progress", "completed", "cancelled"],
            default: "scheduled",
        },
        preOpNote: { type: String, default: "" },
        postOpNote: { type: String, default: "" },
        cost: { type: Number, default: 0, min: 0 },
        // Set once the completed case has been charged, so we never bill twice.
        billed: { type: Boolean, default: false },
        invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
        completedAt: { type: Date, default: null },
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

SurgeryCaseSchema.index({ theatreId: 1, scheduledAt: 1 });
SurgeryCaseSchema.index({ status: 1, scheduledAt: 1 });
SurgeryCaseSchema.index({ patientId: 1, createdAt: -1 });

export const SurgeryCase: Model<ISurgeryCase> =
    models.SurgeryCase ?? model<ISurgeryCase>("SurgeryCase", SurgeryCaseSchema);

export default SurgeryCase;
