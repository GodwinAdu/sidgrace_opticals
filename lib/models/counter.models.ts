import { model, models, Schema, Model } from "mongoose";

interface ICounter {
    _id: string; // the sequence key, e.g. "invoice-2026"
    seq: number;
}

const CounterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter: Model<ICounter> =
    models.Counter ?? model<ICounter>("Counter", CounterSchema);

/**
 * Atomically increment and return the next value for a sequence key.
 * Uses an upsert + $inc so concurrent callers can never get the same number.
 */
export async function nextSequence(key: string): Promise<number> {
    const doc = await Counter.findByIdAndUpdate(
        key,
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return doc.seq;
}

export default Counter;
