import { currentUser } from "./user.actions"
import { AuthError, hasPermission, currentRoleCached, type RequiredPermission } from "./authz"

export type User = Awaited<ReturnType<typeof currentUser>>

/**
 * Wrap a server action with authentication and (optionally) authorization.
 *
 * - No `permission`  → authentication only (back-compatible with all existing
 *   call sites).
 * - With `permission` → the caller's role must satisfy the flag(s), or the call
 *   is rejected with a FORBIDDEN AuthError before any work runs. Admin bypasses.
 *
 * Banned / inactive staff are rejected at the gate even when authenticated.
 */
export async function withAuth<T, Args extends unknown[]>(
    handler: (user: User, ...args: Args) => Promise<T>,
    permission?: RequiredPermission,
): Promise<(...args: Args) => Promise<T>> {
    return async (...args: Args): Promise<T> => {
        try {
            const user = await currentUser()

            if (!user) {
                throw new AuthError("UNAUTHENTICATED", "Authentication required")
            }

            // Hard stop for revoked accounts, regardless of UI gating.
            if ((user as { isBanned?: boolean }).isBanned === true) {
                throw new AuthError("FORBIDDEN", "This account is banned")
            }
            if ((user as { isActive?: boolean }).isActive === false) {
                throw new AuthError("FORBIDDEN", "This account is inactive")
            }

            if (permission) {
                const role = await currentRoleCached()
                if (!hasPermission(role, permission)) {
                    const perms = Array.isArray(permission) ? permission.join(", ") : permission
                    console.error(
                        `Authorization denied: user=${(user as { _id?: string })._id ?? "?"} lacks permission(s)=${perms}`,
                    )
                    throw new AuthError("FORBIDDEN", "You do not have permission to perform this action")
                }
            }

            return await handler(user, ...args)
        } catch (error) {
            // Durably record the failure (best-effort; never masks the throw).
            try {
                const { logError } = await import("./error-log")
                await logError(error, "server-action")
            } catch {
                console.error("Server action error:", error)
            }
            throw error
        }
    }
}
