// Define the TypeScript interface for Staff models
interface IStaff extends Document {
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: Date;
    gender: "male" | "female" | "non-binary" | "prefer-not-to-say";
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    role: "doctor" | "nurse" | "admin" | "staff";
    department?: string;
    specialization?: string;
    licenseNumber?: string;
    bio?: string;
    username: string;
    password: string;
    confirmPassword?: string;
    profileImage?: string | null;
    accessLevel: "limited" | "full";
    permissions: string[];
    isActive: boolean;
    requirePasswordChange: boolean;
    sendWelcomeEmail: boolean;
    isBanned: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    del_flag: boolean;
    mod_flag: boolean;
    action_type: "created" | "updated" | "deleted" | "restored";
    createdAt?: Date;
    updatedAt?: Date;
}


interface IDepartment extends Document {
    name: string;
    description?: string;
    head?: Types.ObjectId; // Reference to Staff who is the head
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    isActive: boolean;
    del_flag: boolean;
    mod_flag: boolean;
    action_type: "created" | "updated" | "deleted" | "restored";
    createdAt?: Date;
    updatedAt?: Date;
}
