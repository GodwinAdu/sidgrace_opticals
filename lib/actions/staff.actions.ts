"use server"

import { compare, hash } from "bcryptjs";
import Staff from "../models/staff.models";
import { connectToDB } from "../mongoose";
import { User, withAuth } from "../helpers/auth";
import { login } from "../helpers/user.actions";
import Department from "../models/department.models";
import History from "../models/history.models";


interface LoginProps {
    username: string;
    password: string;
    rememberMe: boolean
}
async function _createStaff(user: User, values) {
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