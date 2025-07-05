"use server"

import { compare, hash } from "bcryptjs";
import Staff from "../models/staff.models";
import { connectToDB } from "../mongoose";
import { User, withAuth } from "../helpers/auth";
import { login } from "../helpers/user.actions";
import Department from "../models/department.models";
import History from "../models/history.models";
import { deleteDocument } from "./trash.actions";


interface LoginProps {
    username: string;
    password: string;
    rememberMe: boolean
}
interface CreateStaffValues {
    username: string;
    password: string;
    email: string;
    phone: string;
    department: string;
    fullName: string;
    [key: string]: unknown; // Add this if there are additional dynamic fields
}

async function _createStaff(user: User, values: CreateStaffValues) {
    try {
        if (!user) throw new Error("User not authenticated")

        const { password, username } = values
        await connectToDB();
        const [existingUserByUsername, existingUserByEmail, existingUserByPhone, department] = await Promise.all([
            Staff.findOne({ username }),
            Staff.findOne({ email: values.email }),
            Staff.findOne({ phone: values.phone }),
            Department.findById(values.department as string)
        ])
        if (existingUserByUsername || existingUserByEmail || existingUserByPhone || !department) {
            throw new Error("Staff already exist in database or department not found")
        }

        const hashedPassword = await hash(password, 10)

        const newUser = new Staff({
            ...values,
            password: hashedPassword,
            action_type: "created"
        });

        department.employees.push(newUser._id)
        const history = new History({
            actionType: 'STAFF_CREATED',
            details: {
                itemId: newUser._id,
                deletedAt: new Date(),
            },
            message: `User ${user.fullName} created Staff named "${newUser.fullName}" (ID: ${newUser._id}) on ${new Date()}.`,
            performedBy: user._id, // User who performed the action,    
            entityId: newUser._id,  // The ID of the deleted unit
            entityType: 'STAFF',  // The type of the entity
        });

        await Promise.all([
            newUser.save(),
            department.save(),
            history.save()
        ])

    } catch (error) {
        console.log("something went wrong", error);
        throw error;
    }
}

export const createStaff = await withAuth(_createStaff)



export async function fetchStaffById(id: string) {
    try {
        await connectToDB();
        const user = await Staff.findById(id)

        if (!user) return null

        return JSON.parse(JSON.stringify(user))

    } catch (error) {
        console.log("error while fetching staff by id", error);
        throw error;
    }

}

async function _fetchAllStaffs(user: User) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB();
        const staffs = await Staff.find({}).populate("department").populate("createdBy").sort({ createdAt: -1 })

        if (staffs.length === 0) return []

        return JSON.parse(JSON.stringify(staffs))

    } catch (error) {
        console.log("error while fetching all staffs", error);
        throw error;
    }
}
export const fetchAllStaffs = await withAuth(_fetchAllStaffs)


export async function loginStaff(values: LoginProps) {
    try {
        const { username, password, rememberMe } = values;

        await connectToDB();

        const user = await Staff.findOne({ username })


        if (!user) throw new Error(`user not found`);

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) throw new Error("Invalid password");

        const userId = user._id.toString();
        const role = user.role

        await login(userId, role, rememberMe)

        return JSON.parse(JSON.stringify(user));



    } catch (error) {
        console.log("error while login user", error);
        throw error;
    }
}



async function _getStaffStatistics(user: User) {
    try {
        if (!user) throw new Error("User not authenticated")

        const allStaff = await Staff.find({ del_flag: false });

        const totalStaff = allStaff.length;

        const doctors = allStaff.filter((staff) => staff.role.toLowerCase() === "doctor");
        const supportStaff = allStaff.filter((staff) => staff.role.toLowerCase() !== "doctor");
        const onLeave = allStaff.filter((staff) => staff.onLeave);

        // Count specializations
        const countBySpecialization = (staffList: typeof allStaff) => {
            const counts: Record<string, number> = {};
            staffList.forEach((s) => {
                const spec = s.specialization || s.role || "Unknown";
                counts[spec] = (counts[spec] || 0) + 1;
            });
            return Object.entries(counts)
                .map(([key, val]) => `${val} ${key}${val > 1 ? "s" : ""}`)
                .join(", ");
        };

        const doctorsChange = countBySpecialization(doctors);
        const supportStaffChange = countBySpecialization(supportStaff);

        const onLeaveChange = onLeave.length > 0 && onLeave[0].updatedAt
            ? `Returns ${new Date(onLeave[0].updatedAt as string | number | Date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
            })}`
            : "No one on leave";

        return [
            { title: "Total Staff", value: `${totalStaff}`, change: `+${totalStaff} this month` }, // You can make this dynamic with a date filter
            { title: "Doctors", value: `${doctors.length}`, change: doctorsChange },
            { title: "Support Staff", value: `${supportStaff.length}`, change: supportStaffChange },
            { title: "On Leave", value: `${onLeave.length}`, change: onLeaveChange },
        ];
    } catch (error) {
        console.error("Error fetching staff statistics:", error);
        throw error;
    }
};

export const getStaffStatistics = await withAuth(_getStaffStatistics)




async function _deleteStaff(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB()

        const staff = await Staff.findById(id)

        if (!staff) {
            throw new Error("Staff not found");
        }

        await deleteDocument({
            actionType: 'STAFF_DELETED',
            documentId: staff._id,
            collectionName: 'Staff',
            userId: `${user?._id}`,
            trashMessage: `"${staff.fullName}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `User ${user.fullName} deleted "${staff.fullName}" (ID: ${id}) on ${new Date().toLocaleString()}.`,
        });

        return { success: true, message: "Staff deleted successfully" };
    } catch (error) {
        console.log("error while deleting staff", error)
        throw error;
    }
}

export const deleteStaff = await withAuth(_deleteStaff)