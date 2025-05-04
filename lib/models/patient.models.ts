import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    patient_id: {
        type: String,
        required: true,
        unique: true,
    },
    patient_surname: {
        type: String,
        required: true,
    },
    patient_othernames: {
        type: String,
        required: true,
    },
    patient_dob: {
        type: String, // You can convert this to Date if the format is consistent
        required: true,
    },
    patient_gender: {
        type: String,
        enum: ['M', 'F'],
        required: true,
    },
    patient_address: {
        type: String,
    },
    patient_phone: {
        type: Number,
    },
    patient_email: {
        type: String,
    },
    patient_occupation: {
        type: Number,
    },
    service_provider_id: {
        type: Number,
        required: true,
    },
    service_number: {
        type: String,
    },
    emergency_contact: {
        type: String,
    },
    emergency_phone: {
        type: Number,
    },
    date_registered: {
        type: String, // Consider changing to Date if consistent format
    },
    date_info: {
        type: String,
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
});

export const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
