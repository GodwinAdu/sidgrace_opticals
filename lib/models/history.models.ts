import { model, models, Schema } from "mongoose";


// Define an enum for action types
const actionTypes = [
    'ACCOUNT_CREATED',
    'ACCOUNT_UPDATED',
    'ACCOUNT_DELETED',
    'ACCOUNT_RESTORED',

   

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

    'ROOM_CREATED',
    'ROOM_UPDATED',
    'ROOM_DELETED',
    'ROOM_RESTORED',

    "SALARY_PAYMENT_CREATED",
    'SALARY_PAYMENT_UPDATED',
    'SALARY_PAYMENT_DELETED',
    'SALARY_PAYMENT_RESTORED',

    'SALARY_STRUCTURE_CREATED',
    'SALARY_STRUCTURE_UPDATED',
    'SALARY_STRUCTURE_DELETED',
    'SALARY_STRUCTURE_RESTORED',

    'SCHOOL_CREATED',
    'SCHOOL_UPDATED',
    'SCHOOL_DELETED',
    'SCHOOL_RESTORED',

    'SESSION_CREATED',
    'SESSION_UPDATED',
    'SESSION_DELETED',
    'SESSION_RESTORED',

    'STUDENT_CATEGORY_CREATED',
    'STUDENT_CATEGORY_UPDATED',
    'STUDENT_CATEGORY_DELETED',
    'STUDENT_CATEGORY_RESTORED',

    'STUDENT_CREATED',
    'STUDENT_UPDATED',
    'STUDENT_DELETED',
    'STUDENT_RESTORED',

    'SUBJECT_CREATED',
    'SUBJECT_UPDATED',
    'SUBJECT_DELETED',
    'SUBJECT_RESTORED',

    'TERM_CREATED',
    'TERM_UPDATED',
    'TERM_DELETED',
    'TERM_RESTORED',

    'TIMETABLE_CREATED',
    'TIMETABLE_UPDATED',
    'TIMETABLE_DELETED',
    'TIMETABLE_RESTORED',

    'GRADE_RANGE_CREATED',
    'GRADE_RANGE_UPDATED',
    'GRADE_RANGE_DELETED',
    'GRADE_RANGE_DELETED'

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
