"use server"

import { compare, hash } from "bcryptjs";
import Staff from "../models/staff.models";
import { connectToDB } from "../mongoose";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken"

export async function createStaff(values) {
    try {
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


export async function loginStaff(values) {
    try {
        const { username, password } = values;
        const cookieStore = await cookies();

        await connectToDB();

        const user = await Staff.findOne({ username })


        if (!user) throw new Error(`user not found`);

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) throw new Error("Invalid password");

        const tokenData = {
            id: user._id,
            role: user.role,
        };

        const token = jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY!, { expiresIn: "1d" });

        cookieStore.set("token", token, {
            httpOnly: true,
            path: "/",
        });

        return JSON.parse(JSON.stringify(user));



    } catch (error) {
        console.log("error while login user", error);
        throw error;
    }
}