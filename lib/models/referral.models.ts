import { model, models, Schema, Model } from "mongoose";

/**
 * Referrals (in/out) module.
 *
 * A `Referral` records a patient being referred in to this facility or out to
 * another facility/provider. It carries the direction, the other party
 * (facility / provider / contact), the clinical reason, and a workflow status
 * that moves pending → accepted/declined → completed (with cancelled reachable
 * from the live states). The allowed transitions live in the pure helper
 * lib/clinical/referral so they can be unit-tested and shared with the UI.
 *
 * Every referral links to a `Patient` and may optionally link to the
 * `Attendance` (visit) it arose from, per Requirement 6.
 */

const ReferralSchema = new Schema<IReferral>(
    {
        referralNumber: { type: String, required: true, unique: true },
        direction: {
            type: String,
            enum: ["in", "out"],
            required: true,
        },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        // The other party in the referral (where the patient came from / is going).
        facility: { type: String, default: "" },
        provider: { type: String, default: "" },
        contact: { type: String, default: "" },
        reason: { type: String, required: true },
        specialty: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined", "completed", "cancelled"],
            default: "pending",
        },
        note: { type: String, default: "" },
        referredBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

// Board reads filter by direction/status and sort newest-first; per-patient
// reads find a patient's referral history.
ReferralSchema.index({ direction: 1, status: 1, createdAt: -1 });
ReferralSchema.index({ patientId: 1, createdAt: -1 });

export const Referral: Model<IReferral> =
    models.Referral ?? model<IReferral>("Referral", ReferralSchema);

export default Referral;
