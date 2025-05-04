import { model, models, Schema, Model } from "mongoose";


const DepartmentSchema = new Schema<IDepartment>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String, trim: true },
        head: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            default: null,
        },
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
        isActive: { type: Boolean, default: true },
        del_flag: { type: Boolean, default: false },
        mod_flag: { type: Boolean, default: false },
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

const Department: Model<IDepartment> =
    models.Department ?? model<IDepartment>("Department", DepartmentSchema);

export default Department;
