"use server"

import { TokenExpiredError } from "jsonwebtoken";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { cache } from "react";
import { fetchStaffById } from "../actions/staff.actions";

interface User {
    id: string;
    role: string;
    [key: string]: string | number | boolean | undefined; // Define specific types for additional fields
}

const sessionCache: { [key: string]: User } = {};  // Cache storage (in-memory)

async function getAuthenticatedUser() {
    const cookiesStore = await cookies();
    const tokenValue = cookiesStore.get("token");

    if (!tokenValue?.value) {
        return null;
    }

    try {
        const decoded = jwt.verify(tokenValue.value, process.env.TOKEN_SECRET_KEY!) as { id: string, role: string };

        if (!decoded?.id) {
            return null;
        }

        // Check if the user data is already cached
        if (sessionCache[decoded.id]) {
            return sessionCache[decoded.id];  // Return cached user data
        }

        const { id, } = decoded;
        const user = await fetchStaffById(id)

        if (user) {
            sessionCache[decoded.id] = user;  // Cache the user data
        }

        return user || null;

    } catch (error) {
        if (error instanceof TokenExpiredError) {
            console.log("Token expired");
            return null;
        }

        console.error("Error decoding token:", error);
        return null;
    }
}


export const currentUser = cache(async () => {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("User not authenticated");
    }
    return user;
});

// export async function currentUser() {
//     const user = await getAuthenticatedUser();
//     if (!user) {
//         throw new Error("User not authenticated");
//     }
//     return user;
// }