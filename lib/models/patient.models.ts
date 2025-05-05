import mongoose from 'mongoose';


const patientSchema = new mongoose.Schema({
    fullName: {
        type: String, // Not stored, but can be computed in queries if needed
    },
    dob: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true,
    },
    address: String,
    phone: {
        type: String, // Changed to String to support formats like "+233..."
    },
    email: String,
    occupation: String,
    providerId: {
        type: String,
        default: ""
    },
    serviceNumber: String,
    emergencyName: String,
    emergencyPhone: {
        type: String,
    },
    registeredAt: String,
    registeredInfo: String,
    patientId: {
        type: String,
        unique: true,
    },
    originalId: {
        type: Number,
        unique: true,
    },
}, {
    timestamps: true,
});

export const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
