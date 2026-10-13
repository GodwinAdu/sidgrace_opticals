import { cache } from "react";

/** A single IRole flag name, or a list (caller needs ALL of them). */
export type Permission = keyof IRole;
export type RequiredPermission = Permission | Permission[];

/** Typed error so the UI/log can distinguish authz failures from generic ones. */
export class AuthError extends Error {
    code: "UNAUTHENTICATED" | "FORBIDDEN";
    constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
        super(message);
        this.name = "AuthError";
        this.code = code;
    }
}

/** Admin bypass: a role literally named "admin" passes every check. */
export function isAdmin(role: IRole | null | undefined): boolean {
    if (!role) return false;
    const name = String(role.name || "").toLowerCase();
    return name === "admin" || name === "superadmin" || name === "super-admin";
}

/** Pure predicate: does this role satisfy the required permission(s)? */
export function hasPermission(role: IRole | null | undefined, required: RequiredPermission): boolean {
    if (!role) return false;
    if (isAdmin(role)) return true;
    const perms = Array.isArray(required) ? required : [required];
    return perms.every((p) => !!role[p]);
}

/**
 * Request-cached role lookup for the current user. `react.cache` dedupes this
 * within a single request so multiple gated actions don't each hit the DB.
 */
export const currentRoleCached = cache(async (): Promise<IRole | null> => {
    try {
        // Lazy import to avoid a module-load cycle (auth → authz → current-role
        // → role.actions → auth).
        const { currentUserRole } = await import("./current-role");
        const role = await currentUserRole();
        return (role as IRole) ?? null;
    } catch {
        return null;
    }
});
