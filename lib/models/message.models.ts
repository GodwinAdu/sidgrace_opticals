import { model, models, Schema } from "mongoose";

const MessageSchema = new Schema({
    type: { type: String, enum: ["EMAIL", "SMS"] },
    senderName: { type: String },
    senderPhone: { type: String },
    senderEmail: { type: String },
    subject: { type: String },
    message: { type: String },
    status: { type: String, enum: ["pending", "sent", "cancelled"], default: "pending" },
    createdBy: { type: String, default: "System" }
}, { timestamps: true });

const Message = models.Message ?? model("Message", MessageSchema);

export default Message;