import { model, models, Schema, Model } from "mongoose";

/**
 * HR & payroll collections (Requirement 9).
 *
 * Three independent collections, all keyed to the existing `Staff` model:
 *
 *  - `LeaveRequest` — a typed, date-ranged leave request moving through the
 *    pending → approved/rejected/cancelled workflow (status machine lives in
 *    lib/clinical/hr).
 *  - `Timesheet` — a recorded time/attendance entry for a staff member, either
 *    a clock-in/out pair or a plain daily entry with hours.
 *  - `PayrollRun` — a pay run for a period with one `lines[]` entry per staff
 *    member (base + allowances − deductions) and cached totals. Posting a run
 *    books the gross total to the accounting ledger as an expense; the posted
 *    transaction id is stored so the entry can be reversed on delete.
 */

/* ───────────────────────────── Leave request ────────────────────────────── */

const LeaveRequestSchema = new Schema<ILeaveRequest>(
    {
        staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        type: {
            type: String,
            enum: ["annual", "sick", "maternity", "paternity", "unpaid", "other"],
            default: "annual",
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        days: { type: Number, default: 0, min: 0 }, // inclusive whole-day span
        reason: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending",
        },
        approver: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
        decidedAt: { type: Date, default: null },
        decisionNote: { type: String, default: "" },
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

LeaveRequestSchema.index({ status: 1, createdAt: -1 });

export const LeaveRequest: Model<ILeaveRequest> =
    models.LeaveRequest ?? model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

/* ─────────────────────────────── Timesheet ──────────────────────────────── */

const TimesheetSchema = new Schema<ITimesheet>(
    {
        staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        date: { type: Date, required: true },
        clockIn: { type: Date, default: null },
        clockOut: { type: Date, default: null },
        hours: { type: Number, default: 0, min: 0 }, // daily entry hours
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

TimesheetSchema.index({ staffId: 1, date: -1 });

export const Timesheet: Model<ITimesheet> =
    models.Timesheet ?? model<ITimesheet>("Timesheet", TimesheetSchema);

/* ────────────────────────────── Payroll run ─────────────────────────────── */

const PayAdjustmentSchema = new Schema<IPayAdjustment>(
    {
        label: { type: String, default: "" },
        amount: { type: Number, default: 0 },
    },
    { _id: false }
);

const PayrollLineSchema = new Schema<IPayrollLine>(
    {
        staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
        staffName: { type: String, default: "" }, // snapshot at run time
        basePay: { type: Number, default: 0 },
        allowances: { type: [PayAdjustmentSchema], default: [] },
        deductions: { type: [PayAdjustmentSchema], default: [] },
        gross: { type: Number, default: 0 }, // computed: max(0, base + allowances − deductions)
    },
    { _id: true }
);

const PayrollRunSchema = new Schema<IPayrollRun>(
    {
        runNumber: { type: String, required: true, unique: true }, // e.g. PAY-2026-00001
        periodLabel: { type: String, default: "" },                // human label, e.g. "June 2026"
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        lines: { type: [PayrollLineSchema], default: [] },
        totalBase: { type: Number, default: 0 },
        totalAllowances: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        totalGross: { type: Number, default: 0 }, // amount posted to the ledger
        status: {
            type: String,
            enum: ["draft", "posted"],
            default: "posted",
        },
        transactionId: { type: Schema.Types.ObjectId, ref: "Transaction", default: null },
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

PayrollRunSchema.index({ createdAt: -1 });

export const PayrollRun: Model<IPayrollRun> =
    models.PayrollRun ?? model<IPayrollRun>("PayrollRun", PayrollRunSchema);
