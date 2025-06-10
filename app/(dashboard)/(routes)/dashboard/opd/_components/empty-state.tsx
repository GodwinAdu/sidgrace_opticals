import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    className?: string
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center text-center", className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
    )
}
