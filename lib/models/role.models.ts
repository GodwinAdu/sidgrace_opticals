import { Schema, model, models, Model } from "mongoose";

const RoleSchema: Schema<IRole> = new Schema({
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String },
    dashboard: {
        type: Boolean,
        default: false
    },
    opdManagement: {
        type: Boolean,
        default: false
    },
    attendantManagement: {
        type: Boolean,
        default: false
    },
    patientManagement: {
        type: Boolean,
        default: false
    },
    staffManagement: {
        type: Boolean,
        default: false
    },
    appointmentManagement: {
        type: Boolean,
        default: false
    },
    accountManagement: {
        type: Boolean,
        default: false
    },
    salesManagement: {
        type: Boolean,
        default: false
    },
    messaging: {
        type: Boolean,
        default: false
    },
    inventoryManagement: {
        type: Boolean,
        default: false
    },
    report: {
        type: Boolean,
        default: false
    },
    trash: {
        type: Boolean,
        default: false
    },
    history: {
        type: Boolean,
        default: false
    },
    addOpd: {
        type: Boolean,
        default: false
    },
    manageOpd: {
        type: Boolean,
        default: false
    },
    viewOpd: {
        type: Boolean,
        default: false
    },
    editOpd: {
        type: Boolean,
        default: false
    },
    deleteOpd: {
        type: Boolean,
        default: false
    },
    addAttendance: {
        type: Boolean,
        default: false
    },
    manageAttendance: {
        type: Boolean,
        default: false
    },
    viewAttendance: {
        type: Boolean,
        default: false
    },
    editAttendance: {
        type: Boolean,
        default: false
    },
    deleteAttendance: {
        type: Boolean,
        default: false
    },
    addStaff: {
        type: Boolean,
        default: false
    },
    manageStaff: {
        type: Boolean,
        default: false
    },
    viewStaff: {
        type: Boolean,
        default: false
    },
    editStaff: {
        type: Boolean,
        default: false
    },
    deleteStaff: {
        type: Boolean,
        default: false
    },
    addPatient: {
        type: Boolean,
        default: false
    },
    managePatient: {
        type: Boolean,
        default: false
    },
    viewPatient: {
        type: Boolean,
        default: false
    },
    editPatient: {
        type: Boolean,
        default: false
    },
    deletePatient: {
        type: Boolean,
        default: false
    },
    addAppointment: {
        type: Boolean,
        default: false
    },
    manageAppointment: {
        type: Boolean,
        default: false
    },
    viewAppointment: {
        type: Boolean,
        default: false
    },
    editAppointment: {
        type: Boolean,
        default: false
    },
    deleteAppointment: {
        type: Boolean,
        default: false
    },
    addAccount: {
        type: Boolean,
        default: false
    },
    manageAccount: {
        type: Boolean,
        default: false
    },
    viewAccount: {
        type: Boolean,
        default: false
    },
    editAccount: {
        type: Boolean,
        default: false
    },
    deleteAccount: {
        type: Boolean,
        default: false
    },
    addSales: {
        type: Boolean,
        default: false
    },
    manageSales: {
        type: Boolean,
        default: false
    },
    viewSales: {
        type: Boolean,
        default: false
    },
    editSales: {
        type: Boolean,
        default: false
    },
    deleteSales: {
        type: Boolean,
        default: false
    },
    addInventory: {
        type: Boolean,
        default: false
    },
    manageInventory: {
        type: Boolean,
        default: false
    },
    viewInventory: {
        type: Boolean,
        default: false
    },
    editInventory: {
        type: Boolean,
        default: false
    },
    deleteInventory: {
        type: Boolean,
        default: false
    },
    AccountReport: {
        type: Boolean,
        default: false
    },
    inventoryReport: {
        type: Boolean,
        default: false
    },
    attendanceReport: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    mod_flag: {
        type: Boolean,
        default: false
    },
    del_flag: {
        type: Boolean,
        default: false
    },
    modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null
    },
    action_type: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false,
});

type RoleModel = Model<IRole>

const Role: RoleModel = models.Role || model<IRole>("Role", RoleSchema);

export default Role;
