import { currentUser } from "./user.actions"

export type User = Awaited<ReturnType<typeof currentUser>>

export async  function withAuth<T, Args extends unknown[]>(handler: (user: User, ...args: Args) => Promise<T>) {
    return async (...args: Args): Promise<T> => {
        try {
            const user = await currentUser()

            if (!user) {
            throw new Error("Authentication required")
            }

            return await handler(user, ...args)
        } catch (error) {
            console.error("Server action error:", error)
            throw error
        }
    }
}
