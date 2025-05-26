import { model, models, Schema, Model } from "mongoose";



// Schema definition
const StaffSchema = new Schema<IStaff>(
    {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        dateOfBirth: { type: Date },
        gender: {
            type: String,
            enum: ["male", "female", "other", "prefer-not-to-say"],
            default: "prefer-not-to-say",
        },
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true },
        role: {
            type: String,
            required: true,
        },
        department: { type: String, trim: true },
        specialization: { type: String, trim: true },
        licenseNumber: { type: String, trim: true, unique: true, sparse: true },
        bio: { type: String, trim: true },
        username: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        requirePasswordChange: { type: Boolean, default: true },
        isBanned: { type: Boolean, default: false },
        onLeave: { type: Boolean, default: false },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            default: null,
        },
        modifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            default: null,
        },
        del_flag: {
            type: Boolean,
            default: false,
        },
        mod_flag: {
            type: Boolean,
            default: false,
        },
        action_type: {
            type: String,
            enum: ["created", "updated", "deleted", "restored"],
            default: "created",
        },
    },
    {
        timestamps: true,
    }
);

// Export model with typing
const Staff: Model<IStaff> = models.Staff ?? model<IStaff>("Staff", StaffSchema);

export default Staff;
