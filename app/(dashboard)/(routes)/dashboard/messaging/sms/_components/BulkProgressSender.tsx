import { CheckCircle, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { BulkSendProgressType } from "@/types/notification.types"

interface BulkSendProgressProps {
    progress: BulkSendProgressType
}

export function BulkSendProgressComponent({ progress }: BulkSendProgressProps) {
    if (!progress.isActive) return null

    const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0
    const isCompleted = progress.current === progress.total && progress.total > 0

    return (
        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                        <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                        {isCompleted ? "Completed!" : "Sending Messages..."}
                    </span>
                </div>
                <span className="text-sm text-gray-600 font-mono">
                    {progress.current}/{progress.total}
                </span>
            </div>

            <Progress value={progressPercentage} className="mb-2" />

            <p className="text-xs text-gray-600">{progress.status}</p>

            {progress.errors.length > 0 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center gap-1 mb-1">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        <span className="text-xs font-medium text-red-800">{progress.errors.length} error(s) occurred</span>
                    </div>
                    <div className="text-xs text-red-700 space-y-1">
                        {progress.errors.slice(0, 3).map((error, index) => (
                            <p key={index}>• {error}</p>
                        ))}
                        {progress.errors.length > 3 && <p>• ... and {progress.errors.length - 3} more</p>}
                    </div>
                </div>
            )}
        </div>
    )
}
