"use server"

import { compare, hash } from "bcryptjs";
import Staff from "../models/staff.models";
import { connectToDB } from "../mongoose";
import { User, withAuth } from "../helpers/auth";
import { login } from "../helpers/user.actions";

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
        const existingUser = await Staff.findOne({ username })
        if (existingUser) throw new Error("Staff already exist in database")

        const hashedPassword = await hash(password, 10)

        const newUser = new Staff({
            ...values,
            password: hashedPassword,
            action_type: "created"
        });

        await newUser.save()

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