import { Schema, model, models } from "mongoose"

const AppointmentSchema = new Schema({
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: "Doctor",
        required: false,
    },
    date: {
        type: Date,
        required: true,
    },
    timeSlot: {
        type: String,
        required: true,
    },
    appointmentType: {
        type: String,
        enum: ["examination", "consultation", "followup", "procedure", "surgery", "emergency"],
        required: true,
    },
    examinationType: {
        type: String,
        enum: ["comprehensive", "routine", "contact", "pediatric"],
        required: false,
    },
    procedureType: {
        type: String,
        enum: ["visual-field", "oct", "topography", "minor"],
        required: false,
    },
    reason: {
        type: String,
        required: false,
    },
    duration: {
        type: Number,
        required: true,
        default: 30,
    },
    priority: {
        type: String,
        enum: ["normal", "urgent", "emergency"],
        default: "normal",
    },
    status: {
        type: String,
        enum: ["scheduled", "completed", "cancelled", "no-show", "rescheduled"],
        default: "scheduled",
    },
    notes: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

// Create compound index for efficient querying
AppointmentSchema.index({ date: 1, timeSlot: 1 })
AppointmentSchema.index({ patientId: 1, date: 1 })
AppointmentSchema.index({ status: 1, date: 1 })

const Appointment = models.Appointment || model("Appointment", AppointmentSchema)

export default Appointment
