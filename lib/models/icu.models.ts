import { model, models, Schema, Model } from "mongoose";

/**
 * ICU charting module.
 *
 * `IcuChartEntry` is a single time-stamped observation recorded against an
 * admission while the patient is in intensive care. Entries are **append-only**:
 * once written they are never edited or deleted (there is no update/delete
 * action and no `del_flag` soft-delete flow), so the chart is an immutable
 * clinical flow-sheet. Each entry carries one observation `type` (vitals /
 * ventilator settings / GCS / fluids / note) plus the structured fields for
 * that type; unused fields are simply left null. The patient id is denormalised
 * from the admission for direct per-patient querying.
 *
 * Ordering into a timeline and GCS totalling are handled by the pure helpers in
 * lib/clinical/icu so they can be unit-tested without a database.
 */

const IcuChartEntrySchema = new Schema<IIcuChartEntry>(
    {
        admissionId: { type: Schema.Types.ObjectId, ref: "Admission", required: true },
        patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
        type: {
            type: String,
            enum: ["vitals", "ventilator", "gcs", "fluids", "note"],
            required: true,
        },
        // When the observation was taken (defaults to now; may be back-dated).
        recordedAt: { type: Date, default: Date.now },

        // ── Vitals ──────────────────────────────────────────────
        temperature: { type: Number, default: null }, // °C
        pulse: { type: Number, default: null }, // bpm
        bloodPressure: { type: String, default: "" }, // e.g. "120/80"
        respiratoryRate: { type: Number, default: null }, // /min
        spo2: { type: Number, default: null }, // %

        // ── Ventilator settings ─────────────────────────────────
        ventMode: { type: String, default: "" }, // e.g. "SIMV", "AC/VC"
        fio2: { type: Number, default: null }, // %
        peep: { type: Number, default: null }, // cmH2O
        tidalVolume: { type: Number, default: null }, // ml

        // ── Glasgow Coma Scale ──────────────────────────────────
        gcsEye: { type: Number, default: null }, // 1–4
        gcsVerbal: { type: Number, default: null }, // 1–5
        gcsMotor: { type: Number, default: null }, // 1–6
        gcsTotal: { type: Number, default: null }, // 3–15 (derived on write)

        // ── Fluids ──────────────────────────────────────────────
        fluidDirection: {
            type: String,
            enum: ["in", "out", ""],
            default: "",
        },
        fluidKind: { type: String, default: "" }, // e.g. "Normal saline", "Urine"
        fluidVolumeMl: { type: Number, default: null },

        // Free-text note (for any type).
        note: { type: String, default: "" },

        recordedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        createdBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        action_type: {
            type: String,
            enum: ["created"],
            default: "created",
        },
    },
    { timestamps: true }
);

// Timeline reads are per-admission (and sometimes per-patient), newest/oldest
// by recordedAt — index for both.
IcuChartEntrySchema.index({ admissionId: 1, recordedAt: 1 });
IcuChartEntrySchema.index({ patientId: 1, recordedAt: -1 });

const IcuChartEntry: Model<IIcuChartEntry> =
    models.IcuChartEntry ?? model<IIcuChartEntry>("IcuChartEntry", IcuChartEntrySchema);

export default IcuChartEntry;
