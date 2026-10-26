import { model, models, Schema, Model } from "mongoose";

/**
 * Equipment / biomedical asset register.
 *
 * An `Asset` is a piece of equipment with a human-readable `tag`, a `location`
 * (ward / department) and an operational `status` (Requirement 11, criterion
 * 1). It carries an optional maintenance `scheduleIntervalDays` plus an
 * append-only log of `maintenanceRecords` (service history). The next-due date
 * and the due/overdue status are COMPUTED from the schedule + last service by
 * the pure helpers in lib/clinical/assets — never stored — so the register
 * always reflects the current moment.
 *
 * The allowed status transitions live in that same pure helper so they can be
 * unit-tested and shared with the UI.
 */

const MaintenanceRecordSchema = new Schema<IMaintenanceRecord>(
    {
        type: {
            type: String,
            enum: ["preventive", "corrective", "calibration", "inspection"],
            default: "preventive",
        },
        description: { type: String, default: "" },
        servicedAt: { type: Date, default: Date.now },
        servicedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        cost: { type: Number, default: 0 },
        note: { type: String, default: "" },
    },
    { _id: true, timestamps: true }
);

const AssetSchema = new Schema<IAsset>(
    {
        assetTag: { type: String, required: true, unique: true }, // e.g. AST-2026-00001
        name: { type: String, required: true },
        category: { type: String, default: "" },
        serialNumber: { type: String, default: "" },
        location: { type: String, default: "" }, // ward / department
        status: {
            type: String,
            enum: ["active", "maintenance", "retired"],
            default: "active",
        },
        // Maintenance schedule: next-due = lastServiced + interval. 0 = unscheduled.
        scheduleIntervalDays: { type: Number, default: 0, min: 0 },
        lastServicedAt: { type: Date, default: null },
        maintenanceRecords: { type: [MaintenanceRecordSchema], default: [] },
        note: { type: String, default: "" },
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

// Register reads filter by status/location and sort newest-first.
AssetSchema.index({ status: 1, createdAt: -1 });

const Asset: Model<IAsset> = models.Asset ?? model<IAsset>("Asset", AssetSchema);

export default Asset;
