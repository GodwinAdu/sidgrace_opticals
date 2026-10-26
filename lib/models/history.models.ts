import { model, models, Schema } from "mongoose";


// Define an enum for action types
const actionTypes = [
    'ACCOUNT_CREATED',
    'ACCOUNT_UPDATED',
    'ACCOUNT_DELETED',
    'ACCOUNT_RESTORED',

    'STAFF_CREATED',
    'STAFF_UPDATED',
    'STAFF_DELETED',
    'STAFF_RESTORED',
    'STAFF_PASSWORD_RESET',
    'STAFF_PASSWORD_CHANGED',
    'STAFF_PROFILE_UPDATED',

    'INVENTORY_CATEGORY_CREATED',
    'INVENTORY_CATEGORY_UPDATED',
    'INVENTORY_CATEGORY_DELETED',
    'INVENTORY_CATEGORY_RESTORED',

    'INVENTORY_ISSUE_CREATED',
    'INVENTORY_ISSUE_UPDATED',
    'INVENTORY_ISSUE_DELETED',
    'INVENTORY_ISSUE_RESTORED',

    'INVENTORY_PRODUCT_CREATED',
    'INVENTORY_PRODUCT_UPDATED',
    'INVENTORY_PRODUCT_DELETED',
    'INVENTORY_PRODUCT_RESTORED',

    'INVENTORY_PURCHASE_CREATED',
    'INVENTORY_PURCHASE_UPDATED',
    'INVENTORY_PURCHASE_DELETED',
    'INVENTORY_PURCHASE_RESTORED',

    'INVENTORY_STORE_CREATED',
    'INVENTORY_STORE_UPDATED',
    'INVENTORY_STORE_DELETED',
    'INVENTORY_STORE_RESTORED',

    'INVENTORY_SUPPLIER_CREATED',
    'INVENTORY_SUPPLIER_UPDATED',
    'INVENTORY_SUPPLIER_DELETED',
    'INVENTORY_SUPPLIER_RESTORED',

    'LEAVE_CATEGORY_CREATED',
    'LEAVE_CATEGORY_UPDATED',
    'LEAVE_CATEGORY_DELETED',
    'LEAVE_CATEGORY_RESTORED',

    'MARK_ENTRIES_CREATED',
    'MARK_ENTRIES_UPDATED',
    'MARK_ENTRIES_DELETED',
    'MARK_ENTRIES_RESTORED',

    'MEAL_PAYMENT_CREATED',
    'MEAL_PAYMENT_UPDATED',
    'MEAL_PAYMENT_DELETED',
    'MEAL_PAYMENT_RESTORED',

    'MEAL_PLAN_CREATED',
    'MEAL_PLAN_UPDATED',
    'MEAL_PLAN_DELETED',
    'MEAL_PLAN_RESTORED',

    'MEAL_SCHEDULE_CREATED',
    'MEAL_SCHEDULE_UPDATED',
    'MEAL_SCHEDULE_DELETED',
    'MEAL_SCHEDULE_RESTORED',

    'MEAL_TIMETABLE_CREATED',
    'MEAL_TIMETABLE_UPDATED',
    'MEAL_TIMETABLE_DELETED',
    'MEAL_TIMETABLE_RESTORED',

    'MOOD_CREATED',
    'MOOD_UPDATED',
    'MOOD_DELETED',
    'MOOD_RESTORED',

    'PARENT_CREATED',
    'PARENT_UPDATED',
    'PARENT_DELETED',
    'PARENT_RESTORED',

    'ROLE_CREATED',
    'ROLE_UPDATED',
    'ROLE_DELETED',
    'ROLE_RESTORED',

    'PATIENT_CREATED',
    'PATIENT_UPDATED',
    'PATIENT_DELETED',
    'PATIENT_RESTORED',
    'ATTENDANCE_CREATED',
    'ATTENDANCE_UPDATED',
    'ATTENDANCE_DELETED',
    'ATTENDANCE_RESTORED',

    "APPOINTMENT_CREATED",
    "APPOINTMENT_UPDATED",
    "APPOINTMENT_DELETED",
    "APPOINTMENT_RESTORED",

    // ── Dental clinic feature set ──────────────────────────────
    "PROCEDURE_CREATED",
    "PROCEDURE_UPDATED",
    "PROCEDURE_DELETED",
    "PROCEDURE_RESTORED",

    "DENTAL_CHART_CREATED",
    "DENTAL_CHART_UPDATED",
    "DENTAL_CHART_DELETED",
    "DENTAL_CHART_RESTORED",

    "TREATMENT_PLAN_CREATED",
    "TREATMENT_PLAN_UPDATED",
    "TREATMENT_PLAN_DELETED",
    "TREATMENT_PLAN_RESTORED",

    "PERIO_CHART_CREATED",
    "PERIO_CHART_UPDATED",
    "PERIO_CHART_DELETED",
    "PERIO_CHART_RESTORED",

    "CLINICAL_NOTE_CREATED",
    "CLINICAL_NOTE_UPDATED",
    "CLINICAL_NOTE_DELETED",
    "CLINICAL_NOTE_RESTORED",
    "CLINICAL_SECTION_RECORDED",

    "IMAGING_CREATED",
    "IMAGING_UPDATED",
    "IMAGING_DELETED",
    "IMAGING_RESTORED",

    "INVOICE_CREATED",
    "INVOICE_UPDATED",
    "INVOICE_DELETED",
    "INVOICE_RESTORED",

    "PAYMENT_CREATED",
    "PAYMENT_UPDATED",
    "PAYMENT_DELETED",
    "PAYMENT_RESTORED",

    "INSURANCE_CREATED",
    "INSURANCE_UPDATED",
    "INSURANCE_DELETED",
    "INSURANCE_RESTORED",

    "CLAIM_CREATED",
    "CLAIM_UPDATED",
    "CLAIM_DELETED",
    "CLAIM_RESTORED",

    "RECALL_CREATED",
    "RECALL_UPDATED",
    "RECALL_DELETED",
    "RECALL_RESTORED",

    "REMINDER_SENT",

    "WAITLIST_CREATED",
    "WAITLIST_UPDATED",
    "WAITLIST_DELETED",
    "WAITLIST_RESTORED",

    "CONSENT_CREATED",
    "CONSENT_UPDATED",
    "CONSENT_DELETED",
    "CONSENT_RESTORED",

    "LAB_CASE_CREATED",
    "LAB_CASE_UPDATED",
    "LAB_CASE_DELETED",
    "LAB_CASE_RESTORED",

    "ROSTER_CREATED",
    "ROSTER_UPDATED",
    "ROSTER_DELETED",
    "ROSTER_RESTORED",

    "BRANCH_CREATED",
    "BRANCH_UPDATED",
    "BRANCH_DELETED",
    "BRANCH_RESTORED",

    "NOTIFICATION_CREATED",

    "TRANSACTION_CREATED",
    "TRANSACTION_UPDATED",
    "TRANSACTION_DELETED",
    "TRANSACTION_RESTORED",

    // ── Accounting core (journal entries, ledger, periods) ────
    "JOURNAL_ENTRY_CREATED",
    "JOURNAL_ENTRY_UPDATED",
    "JOURNAL_ENTRY_POSTED",
    "JOURNAL_ENTRY_REVERSED",
    "ACCOUNTING_PERIOD_CONFIGURED",
    "ACCOUNTING_PERIOD_CLOSED",
    "ACCOUNTING_PERIOD_REOPENED",

    // ── Pharmacy ──────────────────────────────────────────────
    "PRESCRIPTION_CREATED",
    "PRESCRIPTION_UPDATED",
    "PRESCRIPTION_DELETED",
    "PRESCRIPTION_RESTORED",
    "PRESCRIPTION_DISPENSED",
    "PHARMACY_SALE_CREATED",
    "PHARMACY_SALE_VOIDED",

    // ── Billing settlement ────────────────────────────────────
    "OUTSTANDING_SETTLED",

    // ── Inpatient / nursing ───────────────────────────────────
    "WARD_CREATED",
    "WARD_UPDATED",
    "WARD_DELETED",
    "WARD_RESTORED",

    "BED_CREATED",
    "BED_UPDATED",
    "BED_DELETED",
    "BED_RESTORED",

    "ADMISSION_CREATED",
    "ADMISSION_UPDATED",
    "ADMISSION_DELETED",
    "ADMISSION_RESTORED",
    "PATIENT_ADMITTED",
    "PATIENT_TRANSFERRED",
    "PATIENT_DISCHARGED",

    // ── Lab / radiology orders ────────────────────────────────
    "LAB_ORDER_CREATED",
    "LAB_ORDER_UPDATED",
    "LAB_ORDER_RESULTED",
    "LAB_ORDER_DELETED",
    "LAB_ORDER_RESTORED",

    // ── Structured EMR (problems / allergies / immunizations) ──
    "PROBLEM_CREATED",
    "PROBLEM_UPDATED",
    "PROBLEM_DELETED",
    "PROBLEM_RESTORED",

    "ALLERGY_CREATED",
    "ALLERGY_UPDATED",
    "ALLERGY_DELETED",
    "ALLERGY_RESTORED",

    "IMMUNIZATION_CREATED",
    "IMMUNIZATION_UPDATED",
    "IMMUNIZATION_DELETED",
    "IMMUNIZATION_RESTORED",

    // ── Emergency / A&E ───────────────────────────────────────
    "EMERGENCY_CASE_CREATED",
    "EMERGENCY_CASE_UPDATED",
    "EMERGENCY_CASE_DELETED",
    "EMERGENCY_CASE_RESTORED",
    "EMERGENCY_BAY_ASSIGNED",
    "EMERGENCY_DISPOSED",

    // ── CPOE (unified orders) ─────────────────────────────────
    "CPOE_ORDER_PLACED",

    // ── Operating theatre / surgery ───────────────────────────
    "THEATRE_CREATED",
    "THEATRE_UPDATED",
    "THEATRE_DELETED",
    "THEATRE_RESTORED",
    "SURGERY_CASE_CREATED",
    "SURGERY_CASE_UPDATED",
    "SURGERY_CASE_DELETED",
    "SURGERY_CASE_RESTORED",
    "SURGERY_STATUS_CHANGED",
    "SURGERY_NOTE_RECORDED",
    "SURGERY_BILLED",

    // ── Maternity / obstetrics ────────────────────────────────
    "ANC_RECORD_CREATED",
    "ANC_RECORD_UPDATED",
    "ANC_RECORD_DELETED",
    "ANC_RECORD_RESTORED",
    "ANC_VISIT_ADDED",
    "DELIVERY_RECORD_CREATED",
    "DELIVERY_RECORD_UPDATED",
    "DELIVERY_RECORD_DELETED",
    "DELIVERY_RECORD_RESTORED",
    "NEWBORN_REGISTERED",

    // ── ICU charting (time-stamped observations) ──────────────
    "ICU_CHART_ENTRY_CREATED",

    // ── Blood bank & specimen tracking ────────────────────────
    "BLOOD_UNIT_CREATED",
    "BLOOD_UNIT_UPDATED",
    "BLOOD_UNIT_DELETED",
    "BLOOD_UNIT_RESTORED",
    "BLOOD_UNIT_RESERVED",
    "BLOOD_UNIT_ISSUED",
    "BLOOD_UNIT_DISCARDED",
    "SPECIMEN_CREATED",
    "SPECIMEN_UPDATED",
    "SPECIMEN_DELETED",
    "SPECIMEN_RESTORED",
    "SPECIMEN_STATUS_CHANGED",

    // ── Referrals (in / out) ──────────────────────────────────
    "REFERRAL_CREATED",
    "REFERRAL_UPDATED",
    "REFERRAL_DELETED",
    "REFERRAL_RESTORED",
    "REFERRAL_STATUS_CHANGED",

    // ── Document management (DMS) + consent archive ───────────
    "PATIENT_DOCUMENT_CREATED",
    "PATIENT_DOCUMENT_UPDATED",
    "PATIENT_DOCUMENT_DELETED",
    "PATIENT_DOCUMENT_RESTORED",

    // ── Queue management & bed-transfer approvals ─────────────
    "QUEUE_TICKET_CREATED",
    "QUEUE_TICKET_UPDATED",
    "QUEUE_TICKET_DELETED",
    "QUEUE_TICKET_RESTORED",
    "QUEUE_TICKET_STATUS_CHANGED",
    "BED_TRANSFER_REQUESTED",
    "BED_TRANSFER_APPROVED",
    "BED_TRANSFER_REJECTED",

    // ── Procurement (requisition → PO → GRN) ──────────────────
    "REQUISITION_CREATED",
    "REQUISITION_UPDATED",
    "REQUISITION_DELETED",
    "REQUISITION_RESTORED",
    "REQUISITION_STATUS_CHANGED",
    "PURCHASE_ORDER_CREATED",
    "PURCHASE_ORDER_UPDATED",
    "PURCHASE_ORDER_DELETED",
    "PURCHASE_ORDER_RESTORED",
    "PURCHASE_ORDER_STATUS_CHANGED",
    "GRN_CREATED",
    "GRN_DELETED",
    "GRN_RESTORED",

    // ── Equipment / biomedical assets + maintenance ───────────
    "ASSET_CREATED",
    "ASSET_UPDATED",
    "ASSET_DELETED",
    "ASSET_RESTORED",
    "ASSET_STATUS_CHANGED",
    "ASSET_MAINTENANCE_LOGGED",

    // ── HR & payroll (leave / timesheet / payroll run) ────────
    "LEAVE_REQUEST_CREATED",
    "LEAVE_REQUEST_UPDATED",
    "LEAVE_REQUEST_DELETED",
    "LEAVE_REQUEST_RESTORED",
    "LEAVE_REQUEST_STATUS_CHANGED",
    "TIMESHEET_CREATED",
    "TIMESHEET_UPDATED",
    "TIMESHEET_DELETED",
    "TIMESHEET_RESTORED",
    "PAYROLL_RUN_CREATED",
    "PAYROLL_RUN_DELETED",
    "PAYROLL_RUN_RESTORED",

    // ── Accounting (double-entry ledger) ──────────────────────
    "CHART_ACCOUNT_CREATED",
    "CHART_ACCOUNT_UPDATED",
    "CHART_ACCOUNT_DEACTIVATED",
    "CHART_ACCOUNT_DELETED",
    "CHART_ACCOUNT_SEEDED",
    "ACCOUNTING_SETTINGS_UPDATED",

    // ── Vendors (accounts-payable master) ─────────────────────
    "VENDOR_CREATED",
    "VENDOR_UPDATED",
    "VENDOR_DEACTIVATED",
    "VENDOR_DELETED",

    // ── Expense approval rules ────────────────────────────────
    "APPROVAL_RULE_CREATED",
    "APPROVAL_RULE_UPDATED",
    "APPROVAL_RULE_DELETED",

    // ── Expenses (capture → submit → approve → post) ──────────
    "EXPENSE_CAPTURED",
    "EXPENSE_SUBMITTED",
    "EXPENSE_APPROVED",
    "EXPENSE_REJECTED",
    "EXPENSE_POSTED",

    // ── Budgets (budget vs actual) ────────────────────────────
    "BUDGET_CREATED",
    "BUDGET_UPDATED",
    "BUDGET_DELETED"
];

const historySchema = new Schema(
    {
        actionType: {
            type: String,
            enum: actionTypes,
            required: true,
        },
        details: {
            type: Schema.Types.Mixed, // For dynamic details (e.g., JSON object)
            required: true,
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Staff', // Reference to the user who performed the action
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: false, // ID of the affected entity (e.g., product, sale, user)
        },
        message: {
            type: String, // Optional message about the action
        },
        entityType: {
            type: String,
            required: false, // Type of entity affected (e.g., 'Product', 'Sale', 'User')
        },
    },
    {
        timestamps: true, // Adds `createdAt` and `updatedAt` fields
    }
);

const History = models.History || model('History', historySchema);

export default History;
