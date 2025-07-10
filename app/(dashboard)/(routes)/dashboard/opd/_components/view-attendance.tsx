"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar, Info, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { calculateAge } from "@/lib/utils"
import { EmptyState } from "./empty-state"


// Define types for our data
interface Patient {
    _id: string
    fullName: string
    dob: string
}

interface AttendanceRecord {
    _id: string
    patientId: Patient
    date: string
    status: "completed" | "waiting" | "in-progress" | "cancelled"
    followUpDate?: string
}

interface AttendanceDialogProps {
    data: AttendanceRecord[]
    isLoading?: boolean
}

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

export function AttendanceDialog({ data , isLoading = false }: AttendanceDialogProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [open, setOpen] = useState(false)

    // Filter data based on search term
    const filteredData = data.filter((record) =>
        record.patient.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Today's Attendance</Button>
            </DialogTrigger>
            <DialogContent className="w-[96%] md:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Today's Patient Attendance</DialogTitle>
                    <DialogDescription>View and manage today's patient visits and appointments</DialogDescription>
                </DialogHeader>

                <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patients..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="mt-4 max-h-[60vh] overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                            <p className="mt-2 text-sm text-muted-foreground">Loading attendance records...</p>
                        </div>
                    ) : filteredData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Visit Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Follow-up</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((record) => (
                                    <TableRow key={record._id}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage
                                                        src={`/placeholder.svg?height=32&width=32&text=${record.patientId.fullName.charAt(0)}`}
                                                        alt={record.patient}
                                                    />
                                                    <AvatarFallback>{record.patient.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{record.patient}</div>
                                                    <div className="text-sm text-muted-foreground">Age: {calculateAge(record.patientId.dob)}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>{format(new Date(record.date), "MMM dd, yyyy")}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">{format(new Date(record.date), "hh:mm a")}</div>
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
                                                <span className="text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <EmptyState
                            icon={Info}
                            title="No attendance records found"
                            description={
                                searchTerm ? "Try adjusting your search term" : "There are no patient visits scheduled for today"
                            }
                            className="py-12"
                        />
                    )}
                </div>

                <div className="flex justify-end">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    )
}
