import { models, model, Schema, type Model } from "mongoose";

/**
 * Durable error sink. Server-action failures are recorded here (best-effort) so
 * problems can be diagnosed after the fact instead of vanishing into stdout.
 * Writing is fire-and-forget and never throws into the caller.
 */
interface IErrorLog {
    message: string;
    stack?: string;
    context?: string;
    userId?: string;
    createdAt?: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
    {
        message: { type: String, required: true },
        stack: { type: String, default: "" },
        context: { type: String, default: "" },
        userId: { type: String, default: "" },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

// Cap the collection so it can't grow without bound (10k docs).
ErrorLogSchema.index({ createdAt: -1 });

const ErrorLog: Model<IErrorLog> =
    models.ErrorLog ?? model<IErrorLog>("ErrorLog", ErrorLogSchema);

/** Record an error durably. Never throws. */
export async function logError(error: unknown, context?: string, userId?: string): Promise<void> {
    try {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        // Always echo to stdout too for live tailing.
        console.error(`[${context || "action"}]`, message);
        await ErrorLog.create({ message, stack: stack || "", context: context || "", userId: userId || "" });
    } catch {
        // Swallow — logging must never break the request.
    }
}

export default ErrorLog;
