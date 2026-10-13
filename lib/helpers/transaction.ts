import mongoose, { type ClientSession } from "mongoose";

/**
 * Run `work` inside a MongoDB transaction when the deployment supports it
 * (replica set / Atlas), otherwise run it WITHOUT a session (standalone Mongo,
 * common in local dev) so the app still works.
 *
 * The callback receives a `session | null`; pass it to every query/save inside
 * so the operation is atomic where transactions are available. When `null`,
 * the writes run sequentially (best-effort, same as before this helper existed).
 *
 * Detection is by attempt-and-fallback: if starting/committing a transaction
 * throws the standalone-topology error, we transparently retry without one.
 */
export async function runInTransaction<T>(
    work: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
    let session: ClientSession | null = null;
    try {
        session = await mongoose.startSession();
    } catch {
        // Can't even start a session — run without one.
        return work(null);
    }

    try {
        let result: T;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result!;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Standalone Mongo rejects transactions — fall back to sessionless writes.
        if (
            message.includes("Transaction numbers") ||
            message.includes("replica set") ||
            message.includes("not supported") ||
            message.includes("Transactions are not supported")
        ) {
            console.warn("Transactions unsupported on this MongoDB; running without a session.");
            return work(null);
        }
        throw error;
    } finally {
        await session.endSession().catch(() => {});
    }
}
