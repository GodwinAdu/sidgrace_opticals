import { model, models, Schema, Model } from "mongoose";

const BedHistorySchema = new Schema(
    {
        wardId: { type: Schema.Types.ObjectId, ref: "Ward" },
        bedId: { type: Schema.Types.ObjectId, ref: "Bed" },
        from: { type: Date, default: Date.now },
        to: { type: Date, default: null },
    },
    { _id: false }
);

const AdmissionSchema = new Schema<IAdmission>(
    {
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", required: true },
        admittingStaff: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        wardId: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
        bedId: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
        admittedAt: { type: Date, default: Date.now },
        expectedDischarge: { type: Date, default: null },
        reason: { type: String, default: "" },
        status: {
            type: String,
            enum: ["admitted", "discharged"],
            default: "admitted",
        },
        dischargedAt: { type: Date, default: null },
        dischargeSummary: { type: String, default: "" },
        // Trail of ward/bed moves for this stay (transfers).
        bedHistory: { type: [BedHistorySchema], default: [] },
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

AdmissionSchema.index({ patientId: 1, status: 1 });
AdmissionSchema.index({ attendanceId: 1 });

const Admission: Model<IAdmission> =
    models.Admission ?? model<IAdmission>("Admission", AdmissionSchema);

export default Admission;
