
"use server"
import { TokenExpiredError } from "jsonwebtoken";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { cache } from "react";
import { redirect } from "next/navigation";
import { fetchStaffById } from "../actions/staff.actions";





interface User {
    id: string;
    role: string;
    fullName?: string;
    email?: string;
    profileImage?: string;
    status?: string;
    permissions?: string[];
    [key: string]: string | number | boolean | string[] | undefined;
}

interface TokenPayload {
    id: string;
    role: string;
    exp?: number;
    iat?: number;
}

// In-memory cache for user data
// Note: This will be reset between serverless function invocations
const sessionCache: { [key: string]: { user: User; timestamp: number } } = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Gets the authenticated user from the JWT token in cookies
 * Implements caching to reduce database queries
 */
async function getAuthenticatedUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get("token");

    if (!tokenValue?.value) {
        return null;
    }

    try {
        // Verify the JWT token
        const decoded = jwt.verify(
            tokenValue.value,
            process.env.TOKEN_SECRET_KEY!
        ) as TokenPayload;

        if (!decoded?.id) {
            return null;
        }

        const { id } = decoded;

        // Check if user data is in cache and not expired
        const cachedData = sessionCache[id];
        const now = Date.now();

        if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
            return cachedData.user;
        }

        const user = await fetchStaffById(id)

        // Cache the user data if found
        if (user) {
            sessionCache[id] = {
                user,
                timestamp: now
            };
        }

        return user;
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            console.log("Token expired");

            // Try to refresh the token
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                // If token was refreshed, try again
                return getAuthenticatedUser();
            }

            return null;
        }

        console.error("Error authenticating user:", error);
        return null;
    }
}

/**
 * Attempts to refresh an expired token using a refresh token
 * Returns true if successful, false otherwise
 */
async function tryRefreshToken(): Promise<boolean> {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken");

    if (!refreshToken?.value) {
        return false;
    }

    try {
        // Verify the refresh token
        const decoded = jwt.verify(
            refreshToken.value,
            process.env.REFRESH_TOKEN_SECRET!
        ) as TokenPayload;

        if (!decoded?.id) {
            return false;
        }

        // Generate a new access token
        const newToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            process.env.TOKEN_SECRET_KEY!,
            { expiresIn: '1h' } // 1 hour expiration
        );

        // Set the new token in cookies
        cookieStore.set("token", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60, // 1 hour
            path: "/",
            sameSite: "strict"
        });

        return true;
    } catch (error) {
        console.error("Error refreshing token:", error);

        // Clear both tokens on refresh failure
        cookieStore.delete("token");
        cookieStore.delete("refreshToken");

        return false;
    }
}

/**
 * Cached version of currentUser that throws if not authenticated
 * Use this in protected routes/components
 */
export const currentUser = cache(async () => {
    const user = await getAuthenticatedUser();

    if (!user) {
        throw new Error("User not authenticated");
    }

    return user;
});

/**
 * Cached version that returns null instead of throwing
 * Use this when you want to optionally show content based on authentication
 */
export const getCurrentUser = cache(async () => {
    return await getAuthenticatedUser();
});

/**
 * Check if the current user has one of the specified roles
 * Useful for role-based access control
 */
export async function hasRole(roles: string[]): Promise<boolean> {
    try {
        const user = await getCurrentUser();
        return !!user && roles.includes(user.role);
    } catch {
        return false;
    }
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
    try {
        const user = await getCurrentUser();
        return !!user && !!user.permissions && user.permissions.includes(permission);
    } catch {
        return false;
    }
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in pages that require authentication
 */
export async function requireAuth(redirectTo: string = "/login") {
    const user = await getCurrentUser();

    if (!user) {
        redirect(redirectTo);
    }

    return user;
}

/**
 * Require specific role - redirects if user doesn't have required role
 */
export async function requireRole(roles: string[], redirectTo: string = "/unauthorized") {
    const user = await requireAuth();

    if (!roles.includes(user.role)) {
        redirect(redirectTo);
    }

    return user;
}

/**
 * Get user session data (lightweight version of user object)
 * Useful for passing minimal user data to client components
 */
export async function getSession() {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    // Return only essential user data for client
    return {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        profileImage: user.profileImage,
        isAuthenticated: true
    };
}

/**
 * Login function - creates JWT token and sets cookies
 */
export async function login(userId: string, role: string, rememberMe: boolean = false) {
    // Create access token
    const token = jwt.sign(
        { id: userId, role },
        process.env.TOKEN_SECRET_KEY!,
        { expiresIn: '1h' } // 1 hour
    );

    // Create refresh token if remember me is enabled
    const refreshToken = rememberMe ? jwt.sign(
        { id: userId, role },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '30d' } // 30 days
    ) : null;

    const cookieStore = await cookies();

    // Set access token cookie
    cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60, // 1 hour
        path: "/",
        sameSite: "strict"
    });

    // Set refresh token if remember me is enabled
    if (refreshToken) {
        cookieStore.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: "/",
            sameSite: "strict"
        });
    }

    // Clear cache for this user
    if (userId in sessionCache) {
        delete sessionCache[userId];
    }

    return true;
}

/**
 * Logout function - can be called from client components
 */
export async function logout(redirectTo: string = "/login") {
    const cookieStore = await cookies();
    cookieStore.delete("token");
    cookieStore.delete("refreshToken");

    // Clear the entire session cache on logout
    Object.keys(sessionCache).forEach(key => {
        delete sessionCache[key];
    });

    redirect(redirectTo);
}

/**
 * Get token expiration time
 */
export async function getTokenExpiration(): Promise<Date | null> {
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get("token");

    if (!tokenValue?.value) {
        return null;
    }

    try {
        const decoded = jwt.decode(tokenValue.value) as TokenPayload;

        if (!decoded?.exp) {
            return null;
        }

        return new Date(decoded.exp * 1000);
    } catch {
        return null;
    }
}

/**
 * Check if token is about to expire (within the next 5 minutes)
 */
export async function isTokenExpiringSoon(): Promise<boolean> {
    const expiration = await getTokenExpiration();

    if (!expiration) {
        return false;
    }

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    return expiration < fiveMinutesFromNow;
}

/**
 * Clear user cache for a specific user
 */
export async function clearUserCache(userId: string) {
    if (userId in sessionCache) {
        delete sessionCache[userId];
    }
}

/**
 * Clear entire user cache
 */
export async function clearAllUserCache() {
    Object.keys(sessionCache).forEach(key => {
        delete sessionCache[key];
    });
}