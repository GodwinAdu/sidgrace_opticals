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
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    return doc.seq;
}

/**
 * Produce the next sequence-based value that does NOT already exist, advancing
 * the counter past any collisions. This self-heals a counter that is behind the
 * real data (e.g. records created by an older countDocuments()-based scheme
 * before the atomic counter existed): it keeps incrementing until `exists`
 * reports the formatted candidate is free.
 *
 * `format(seq)` builds the human number from a sequence value; `exists(value)`
 * returns true when that value is already taken. A safety cap prevents an
 * infinite loop in pathological cases.
 */
export async function nextUniqueNumber(
    key: string,
    format: (seq: number) => string,
    exists: (value: string) => Promise<boolean>,
    maxTries = 1000,
): Promise<string> {
    for (let i = 0; i < maxTries; i++) {
        const seq = await nextSequence(key);
        const candidate = format(seq);
        if (!(await exists(candidate))) return candidate;
        // else: collision with legacy data ? advance and try the next value.
    }
    throw new Error(`Could not allocate a unique number for "${key}" after ${maxTries} tries`);
}

export default Counter;
