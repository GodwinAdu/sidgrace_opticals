"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
    password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    const [strength, setStrength] = React.useState(0)
    const [message, setMessage] = React.useState("")

    React.useEffect(() => {
        if (!password) {
            setStrength(0)
            setMessage("")
            return
        }

        // Calculate password strength
        let score = 0

        // Length check
        if (password.length >= 8) score += 1
        if (password.length >= 12) score += 1

        // Character variety checks
        if (/[A-Z]/.test(password)) score += 1
        if (/[a-z]/.test(password)) score += 1
        if (/[0-9]/.test(password)) score += 1
        if (/[^A-Za-z0-9]/.test(password)) score += 1

        // Normalize score to 0-4 range
        score = Math.min(4, score)
        setStrength(score)

        // Set appropriate message
        switch (score) {
            case 0:
                setMessage("Very Weak")
                break
            case 1:
                setMessage("Weak")
                break
            case 2:
                setMessage("Fair")
                break
            case 3:
                setMessage("Good")
                break
            case 4:
                setMessage("Strong")
                break
            default:
                setMessage("")
        }
    }, [password])

    return (
        <div className="space-y-2">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={cn("transition-all duration-500", {
                        "w-1/4 bg-destructive": strength === 1,
                        "w-2/4 bg-amber-500": strength === 2,
                        "w-3/4 bg-yellow-500": strength === 3,
                        "w-full bg-green-500": strength === 4,
                        "w-0": strength === 0,
                    })}
                />
            </div>
            <p
                className={cn("text-xs", {
                    "text-destructive": strength === 1,
                    "text-amber-500": strength === 2,
                    "text-yellow-500": strength === 3,
                    "text-green-500": strength === 4,
                    "text-muted-foreground": strength === 0,
                })}
            >
                {message}
            </p>
        </div>
    )
}
