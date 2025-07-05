"use client"

import { useState } from "react"
import {
    Search,
    Calendar,
    Stethoscope,
    FileText,
    Clock,
    User,
    MoreHorizontal,
    Download,
    RefreshCw,
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateAge } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { deleteAttendance, updateUserAttendance } from "@/lib/actions/attendance.actions"
import { toast } from "sonner"



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
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [visitTypeFilter, setVisitTypeFilter] = useState("all")
    const [selectedTab, setSelectedTab] = useState("overview")

    const router = useRouter()

    const filteredData = attendance.filter((record) => {
        const matchesSearch =
            record.patientId.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === "all" || record.status === statusFilter
        const matchesVisitType = visitTypeFilter === "all" || record.visitType === visitTypeFilter

        return matchesSearch && matchesStatus && matchesVisitType
    })

    const stats = {
        total: attendance.length,
        completed: attendance.filter((r) => r.status === "completed").length,
        waiting: attendance.filter((r) => r.status === "waiting").length,
        inProgress: attendance.filter((r) => r.status === "ongoing").length,
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateUserAttendance(id)
            console.log("update successfully")
        } catch (error) {
            console.log("error happened while update attendance", error)
        }
    }

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
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search by patient name or diagnosis..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="waiting">Waiting</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filter by visit type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="routine">Routine</SelectItem>
                                    <SelectItem value="follow-up">Follow-up</SelectItem>
                                    <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Records</CardTitle>
                        <CardDescription>
                            Showing {filteredData.length} of {attendance.length} records
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="mt-6">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Patient</TableHead>
                                                <TableHead>Visit Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Follow-up</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredData.map((record) => (
                                                <TableRow key={record._id}>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage
                                                                    src={`/placeholder.svg?height=32&width=32&text=${record.patientId.fullName.charAt(0)}`}
                                                                />
                                                                <AvatarFallback>{record.patientId.fullName.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium">{record.patientId.fullName}</div>
                                                                <div className="text-sm text-gray-500">Age: {calculateAge(record.patientId.dob)}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            <span>{format(new Date(record.date), "MMM dd, yyyy")}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-500">{format(new Date(record.date), "hh:mm a")}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(record.status)}>
                                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {record.followUpDate ? (
                                                            <div className="text-sm">{format(new Date(record.followUpDate), "MMM dd, yyyy")}</div>
                                                        ) : (
                                                            <span className="text-gray-400">None</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                                                <DropdownMenuItem onClick={() => { router.push(`/dashboard/attendance/${record._id}`); handleUpdate(record._id); }}>Attend</DropdownMenuItem>

                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleDelete(record._id)}>Delete Record</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
