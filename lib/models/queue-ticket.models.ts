import { model, models, Schema, Model } from "mongoose";

/**
 * Queue management module.
 *
 * A `QueueTicket` is a token issued at a service point (OPD / pharmacy / lab).
 * Each service restarts its numbering every day (`number` is unique per service
 * per `day`), and the ticket moves through a small lifecycle
 * (waiting → called → serving → done, with skipped as an early terminal exit)
 * suitable for a public display screen. The allowed transitions and the display
 * ordering live in the pure helper lib/clinical/queue so they can be
 * unit-tested and shared with the UI.
 *
 * A ticket may optionally link to a `Patient` and the `Attendance` (visit) it
 * belongs to, but a label (e.g. a walk-in name) is enough to issue one.
 */

const QueueTicketSchema = new Schema<IQueueTicket>(
    {
        service: {
            type: String,
            enum: ["opd", "pharmacy", "lab"],
            required: true,
        },
        // Per-service, per-day token number (restarts at 1 each day per service).
        number: { type: Number, required: true },
        // The calendar day the ticket belongs to, as YYYY-MM-DD, so numbering
        // resets daily and the display shows only today's queue.
        day: { type: String, required: true },
        label: { type: String, default: "" },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
        attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", default: null },
        status: {
            type: String,
            enum: ["waiting", "called", "serving", "done", "skipped"],
            default: "waiting",
        },
        note: { type: String, default: "" },
        calledAt: { type: Date, default: null },
        servedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        issuedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
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

// A token number is unique within a service for a given day.
QueueTicketSchema.index({ service: 1, day: 1, number: 1 }, { unique: true });
// Display reads filter by service + day and order by status/number.
QueueTicketSchema.index({ service: 1, day: 1, status: 1, number: 1 });

const QueueTicket: Model<IQueueTicket> =
    models.QueueTicket ?? model<IQueueTicket>("QueueTicket", QueueTicketSchema);

export default QueueTicket;
