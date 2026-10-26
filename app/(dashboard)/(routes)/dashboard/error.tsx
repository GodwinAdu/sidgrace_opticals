"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

/**
 * Dashboard route-level error boundary. Catches render/data errors in any
 * dashboard page and shows a friendly recovery screen instead of a crash.
 */
export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Surface for diagnostics; a durable sink can be wired here later.
        console.error("Dashboard error boundary:", error)
    }, [error])

    const isPermission = /permission|not permitted|forbidden/i.test(error.message)

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-7 w-7" />
            </span>
            <div>
                <h2 className="text-lg font-bold">
                    {isPermission ? "You don't have access to this" : "Something went wrong"}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {isPermission
                        ? "Your role doesn't permit this action. Contact an administrator if you believe this is a mistake."
                        : "An unexpected error occurred. You can try again, or go back and retry."}
                </p>
            </div>
            {!isPermission && (
                <Button onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
            )}
        </div>
    )
}
