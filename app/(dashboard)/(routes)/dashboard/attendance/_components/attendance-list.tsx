"use client"

import { useState } from "react"
import {
    Stethoscope,
    FileText,
    Clock,
    User,
    Download,
    RefreshCw,
} from "lucide-react"


import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { deleteAttendance, updateUserAttendance } from "@/lib/actions/attendance.actions"
import { toast } from "sonner"
import { DataTable } from "@/components/table/data-table"
import { columns } from "./column"



const getStatusColor = (status: string) => {
    switch (status) {
        case "completed":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "waiting":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "in-progress":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
        case "cancelled":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

// const getVisitTypeColor = (visitType: string) => {
//     switch (visitType) {
//         case "routine":
//             return "bg-blue-50 text-blue-700 border-blue-200"
//         case "follow-up":
//             return "bg-purple-50 text-purple-700 border-purple-200"
//         case "emergency":
//             return "bg-red-50 text-red-700 border-red-200"
//         default:
//             return "bg-gray-50 text-gray-700 border-gray-200"
//     }
// }

export default function AttendancePage({ attendance }) {
    const router = useRouter()

    const stats = {
        total: attendance.length,
        completed: attendance.filter((r) => r.status === "completed").length,
        waiting: attendance.filter((r) => r.status === "waiting").length,
        inProgress: attendance.filter((r) => r.status === "ongoing").length,
    };

  

    const handleDelete = async (id: string) => {
        try {
            await deleteAttendance(id)
            router.refresh()
            toast.success("Deleted Successfully", {
                description: "Attendance was deleted successfully"
            })
        } catch (error) {
            toast.error(error ? String(error) : "Deleted error")
        }
    }



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Patient Attendance</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track patient visits and medical records</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Button size="sm">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Visits</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                                </div>
                                <User className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                                </div>
                                <FileText className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Waiting</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                                </div>
                                <Stethoscope className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="py-4">
                    <DataTable searchKey="patient" columns={columns} data={attendance} />
                </div>
            </div>
        </div>
    )
}
