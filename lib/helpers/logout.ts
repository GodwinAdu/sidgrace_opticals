"use server";

import { cookies } from "next/headers";

export async function logout(): Promise<boolean> {
    try {
        const cookiesStore = await cookies();

        if (!cookiesStore.get("token")) {
            console.warn("No token found in cookies.");
            return false; // Token not found
        }

        cookiesStore.delete("token"); // Delete the token cookie

        return true; // Successful logout
    } catch (error) {
        console.error("Logout failed:", error);
        return false; // Indicate failure
    }
}
