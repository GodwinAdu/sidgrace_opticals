import { model, models, Schema, Model } from "mongoose";

/**
 * Bed-transfer approval module.
 *
 * A `BedTransfer` records a *requested* ward/bed move for an active admission
 * that must be approved before the physical bed swap happens. This extends the
 * existing one-shot transfer flow (admission.actions `transferBed`) with an
 * approval step: `requestBedTransfer` creates a `pending-approval` record and
 * `approveBedTransfer` performs the actual move (free old bed, occupy new bed,
 * update bedHistory) once approved. The allowed transitions live in the pure
 * helper lib/clinical/queue so they can be unit-tested and shared with the UI.
 *
 * The request captures where the patient is now (from) and where they should go
 * (to) so the approver has the full picture, and who requested / decided it.
 */

const BedTransferSchema = new Schema<IBedTransfer>(
    {
        admissionId: { type: Schema.Types.ObjectId, ref: "Admission", required: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
        // Where the patient is at request time (snapshot for the approver).
        fromWardId: { type: Schema.Types.ObjectId, ref: "Ward", default: null },
        fromBedId: { type: Schema.Types.ObjectId, ref: "Bed", default: null },
        // The requested target bed/ward.
        toWardId: { type: Schema.Types.ObjectId, ref: "Ward", default: null },
        toBedId: { type: Schema.Types.ObjectId, ref: "Bed", required: true },
        reason: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending-approval", "approved", "rejected"],
            default: "pending-approval",
        },
        decisionNote: { type: String, default: "" },
        requestedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        decidedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        decidedAt: { type: Date, default: null },
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

// Approver worklist filters by status; per-admission reads find a stay's requests.
BedTransferSchema.index({ status: 1, createdAt: -1 });
BedTransferSchema.index({ admissionId: 1, createdAt: -1 });

const BedTransfer: Model<IBedTransfer> =
    models.BedTransfer ?? model<IBedTransfer>("BedTransfer", BedTransferSchema);

export default BedTransfer;
