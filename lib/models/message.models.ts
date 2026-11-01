import { model, models, Schema } from "mongoose";

/**
 * One outgoing message to one recipient (the SMS outbox / history).
 * Written by the SMS backend (c:\proj\sidgrace-backend, src/models/message.models.ts);
 * the app only reads it for the SMS history screen. Keep both schemas in sync.
 *
 * status: pending -> sent | failed (permanent error) | cancelled (gave up after retries)
 */
const MessageSchema = new Schema({
    type: { type: String, enum: ["EMAIL", "SMS"] },
    recipientName: { type: String },
    recipientPhone: { type: String },
    recipientEmail: { type: String },
    recipientId: { type: Schema.Types.ObjectId },
    notificationId: { type: Schema.Types.ObjectId, ref: "Notification" },
    source: { type: String },
    subject: { type: String },
    message: { type: String },
    retryCount: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "sent", "failed", "cancelled"], default: "pending" },
    nextAttemptAt: { type: Date },
    sentAt: { type: Date },
    provider: { type: String },
    batch: { type: String },
    gatewayStatus: { type: String },
    normalizedPhone: { type: String },
    lastError: { type: String },
    createdBy: { type: String, default: "System" }
}, { timestamps: true });

const Message = models.Message ?? model("Message", MessageSchema);

export default Message;
