"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Search,
    Filter,
    MoreHorizontal,
    Plus,
    Clock,
    User,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Video,
    Clipboard,
    CalendarIcon,
    Trash,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { toast } from "sonner"
import { updateAppointmentStatus } from "@/lib/actions/appointment.actions"

// Generate calendar events from real appointments data
const generateCalendarEvents = (appointments: Appointment[]) => {
    return appointments.map((appointment) => ({
        id: appointment.id,
        title: appointment.type,
        date: appointment.date,
        patientName: appointment.patientName,
    }))
}

interface Appointment {
    id: string
    patientId: string
    patientName: string
    patientPhoto?: string
    type: string
    status: string
    date: Date
    duration: number
    department?: string
    notes?: string
    createdAt: Date
}

interface AppointmentsPageProps {
    appointments: {
        success: boolean
        appointments: Appointment[]
        error?: string
    }
}

export default function AppointmentsPage({ appointments: appointmentsData }: AppointmentsPageProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [typeFilter, setTypeFilter] = useState("all")
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [view, setView] = useState<"day" | "week" | "month">("day")

    // Use real appointments data or fallback to empty array
    // Convert date strings back to Date objects
    const appointments = appointmentsData.success
        ? appointmentsData.appointments.map((appointment) => ({
            ...appointment,
            date: new Date(appointment.date),
            createdAt: new Date(appointment.createdAt),
        }))
        : []

    const calendarEvents = generateCalendarEvents(appointments)

    // Handle status change
    const handleStatusChange = async (appointmentId: string, newStatus: string) => {
        try {
            const result = await updateAppointmentStatus(appointmentId, newStatus)

            if (result.success) {
                toast.success(`Appointment status updated to ${newStatus}`)
                // Refresh the page to show updated data
                router.refresh()
            } else {
                toast.error("Failed to update appointment status", {
                    description: result.error,
                })
            }
        } catch (error) {
            console.error("Error updating appointment status:", error)
            toast.error("Failed to update appointment status")
        }
    }

    // Filter appointments based on search query, status filter, and type filter
    const filteredAppointments = appointments.filter((appointment) => {
        const matchesSearch =
            searchQuery === "" ||
            appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appointment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appointment.type.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === "all" || appointment.status === statusFilter
        const matchesType = typeFilter === "all" || appointment.type === typeFilter

        return matchesSearch && matchesStatus && matchesType
    })

    // Get today's appointments
    const todayAppointments = filteredAppointments.filter((appointment) => {
        const today = new Date()
        return (
            appointment.date.getDate() === today.getDate() &&
            appointment.date.getMonth() === today.getMonth() &&
            appointment.date.getFullYear() === today.getFullYear()
        )
    })

    // Get upcoming appointments (future dates)
    const upcomingAppointments = filteredAppointments.filter((appointment) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const appointmentDate = new Date(appointment.date)
        appointmentDate.setHours(0, 0, 0, 0)
        return appointmentDate > today
    })

    // Get past appointments
    const pastAppointments = filteredAppointments.filter((appointment) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const appointmentDate = new Date(appointment.date)
        appointmentDate.setHours(0, 0, 0, 0)
        return appointmentDate < today
    })

    // Get events for the selected date in calendar view
    const getEventsForDate = (date: Date) => {
        return calendarEvents
            .filter(
                (event) =>
                    event.date.getDate() === date.getDate() &&
                    event.date.getMonth() === date.getMonth() &&
                    event.date.getFullYear() === date.getFullYear(),
            )
            .sort((a, b) => a.date.getTime() - b.date.getTime())
    }

    const selectedDateEvents = date ? getEventsForDate(date) : []

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "scheduled":
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Scheduled
                    </Badge>
                )
            case "completed":
                return (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Completed
                    </Badge>
                )
            case "cancelled":
                return (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Cancelled
                    </Badge>
                )
            case "no-show":
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        No Show
                    </Badge>
                )
            case "in-progress":
                return (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        In Progress
                    </Badge>
                )
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString()
    }

    const handleViewAppointment = (appointmentId: string) => {
        router.push(`/dashboard/appointments/${appointmentId}`)
    }

    // Show error message if appointments failed to load
    if (!appointmentsData.success) {
        return (
            <div className="space-y-6 py-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Appointment Management</h1>
                        <p className="text-muted-foreground">Schedule, view, and manage patient appointments</p>
                    </div>
                </div>
                <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">Failed to load appointments</h3>
                            <p className="text-muted-foreground mb-4">{appointmentsData?.error}</p>
                            <Button onClick={() => router.refresh()}>Try Again</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Appointment Management</h1>
                    <p className="text-muted-foreground">Schedule, view, and manage patient appointments</p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <Button onClick={() => router.push("/dashboard/appointments/new")}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Appointment
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="list-view" className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <TabsList>
                        <TabsTrigger value="list-view">List View</TabsTrigger>
                        <TabsTrigger value="calendar-view">Calendar View</TabsTrigger>
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search appointments..."
                                className="pl-8 w-full md:w-[200px] lg:w-[300px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no-show">No Show</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    <SelectValue placeholder="Type" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="examination">Examination</SelectItem>
                                <SelectItem value="consultation">Consultation</SelectItem>
                                <SelectItem value="followup">Follow-up</SelectItem>
                                <SelectItem value="procedure">Procedure</SelectItem>
                                <SelectItem value="surgery">Surgery</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Rest of the component remains the same - just replace mockAppointments with appointments */}
                <TabsContent value="list-view" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Appointments</CardTitle>
                            <CardDescription>View and manage all scheduled appointments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] w-full rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAppointments.length > 0 ? (
                                            filteredAppointments
                                                .sort((a, b) => a.date.getTime() - b.date.getTime())
                                                .map((appointment) => (
                                                    <TableRow
                                                        key={appointment.id}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => handleViewAppointment(appointment.id)}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar>
                                                                    <AvatarImage
                                                                        src={appointment.patientPhoto || "/placeholder.svg"}
                                                                        alt={appointment.patientName}
                                                                    />
                                                                    <AvatarFallback>
                                                                        {appointment.patientName
                                                                            .split(" ")
                                                                            .map((n) => n[0])
                                                                            .join("")}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium">{appointment.patientName}</p>
                                                                    <p className="text-xs text-muted-foreground">ID: {appointment.patientId}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{formatTime(appointment.date)}</p>
                                                                <p className="text-xs text-muted-foreground">{formatDate(appointment.date)}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{appointment.type}</TableCell>
                                                        <TableCell>{appointment.duration} min</TableCell>
                                                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="icon">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                        <span className="sr-only">Open menu</span>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            router.push(`/dashboard/appointments/${appointment.id}`)
                                                                        }}
                                                                    >
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            router.push(`/dashboard/patients/${appointment.patientId}`)
                                                                        }}
                                                                    >
                                                                        <User className="mr-2 h-4 w-4" />
                                                                        View Patient
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    {appointment.status === "scheduled" && (
                                                                        <>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleStatusChange(appointment.id, "in-progress")
                                                                                }}
                                                                            >
                                                                                <Clock className="mr-2 h-4 w-4" />
                                                                                Start Appointment
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleStatusChange(appointment.id, "completed")
                                                                                }}
                                                                            >
                                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                                Mark as Completed
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleStatusChange(appointment.id, "cancelled")
                                                                                }}
                                                                            >
                                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                                Cancel Appointment
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleStatusChange(appointment.id, "no-show")
                                                                                }}
                                                                            >
                                                                                <AlertCircle className="mr-2 h-4 w-4" />
                                                                                Mark as No-Show
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            router.push(`/dashboard/appointments/${appointment.id}`)
                                                                        }}
                                                                        className="bg-red-500 text-white"
                                                                    >
                                                                        <Trash className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center">
                                                    No appointments found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {filteredAppointments.length} of {appointments.length} appointments
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                                <Button variant="outline">
                                    <Clipboard className="mr-2 h-4 w-4" />
                                    Generate Report
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="calendar-view" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                <CardTitle>Calendar View</CardTitle>
                                <div className="flex items-center gap-2 mt-2 md:mt-0">
                                    <Button variant="outline" size="sm" onClick={() => setView("day")}>
                                        Day
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setView("week")}>
                                        Week
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setView("month")}>
                                        Month
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>View appointments in a calendar format</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-0">
                                <div className="md:col-span-5 border-r">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                if (date) {
                                                    const newDate = new Date(date)
                                                    newDate.setDate(newDate.getDate() - 1)
                                                    setDate(newDate)
                                                }
                                            }}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <h3 className="text-lg font-medium">{date ? format(date, "MMMM d, yyyy") : "Select a date"}</h3>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                if (date) {
                                                    const newDate = new Date(date)
                                                    newDate.setDate(newDate.getDate() + 1)
                                                    setDate(newDate)
                                                }
                                            }}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="p-4">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            className="rounded-md border"
                                            modifiers={{
                                                hasEvents: (date) => {
                                                    return calendarEvents.some(
                                                        (event) =>
                                                            event.date.getDate() === date.getDate() &&
                                                            event.date.getMonth() === date.getMonth() &&
                                                            event.date.getFullYear() === date.getFullYear(),
                                                    )
                                                },
                                            }}
                                            modifiersClassNames={{
                                                hasEvents: "bg-primary/10 font-medium text-primary",
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 p-4">
                                    <h3 className="text-lg font-medium mb-4">
                                        {date ? format(date, "MMMM d, yyyy") : "No date selected"}
                                    </h3>

                                    {selectedDateEvents.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedDateEvents.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                                                >
                                                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-primary/10">
                                                        <Clock className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{format(event.date, "h:mm a")}</p>
                                                        <p className="text-sm">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">{event.patientName}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                                                <h3 className="font-medium">No appointments</h3>
                                                <p className="text-xs text-muted-foreground">No appointments scheduled for this date</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        <Button className="w-full" onClick={() => router.push("/dashboard/appointments/schedule")}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            New Appointment
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="today" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Today&#39;s Appointments</CardTitle>
                            <CardDescription>Appointments scheduled for today ({new Date().toLocaleDateString()})</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {todayAppointments.length > 0 ? (
                                    todayAppointments
                                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                                        .map((appointment) => (
                                            <div
                                                key={appointment.id}
                                                className="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleViewAppointment(appointment.id)}
                                            >
                                                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-md bg-muted">
                                                    <span className="text-sm font-medium">{formatTime(appointment.date)}</span>
                                                    <span className="text-xs text-muted-foreground">{appointment.duration} min</span>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={appointment.patientPhoto || "/placeholder.svg"}
                                                                    alt={appointment.patientName}
                                                                />
                                                                <AvatarFallback>
                                                                    {appointment.patientName
                                                                        .split(" ")
                                                                        .map((n) => n[0])
                                                                        .join("")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-medium leading-none">{appointment.patientName}</p>
                                                                <p className="text-xs text-muted-foreground">ID: {appointment.patientId}</p>
                                                            </div>
                                                        </div>
                                                        {getStatusBadge(appointment.status)}
                                                    </div>
                                                    <div className="pt-2">
                                                        <p className="text-sm">
                                                            <span className="font-medium">Type:</span> {appointment.type}
                                                        </p>
                                                        <p className="text-sm">
                                                            <span className="font-medium">Department:</span> {appointment.department}
                                                        </p>
                                                        {appointment.notes && (
                                                            <p className="text-sm mt-1">
                                                                <span className="font-medium">Notes:</span> {appointment.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-2">
                                                        {appointment.status === "scheduled" && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleStatusChange(appointment.id, "in-progress")
                                                                    }}
                                                                >
                                                                    <Clock className="mr-2 h-3 w-3" />
                                                                    Start
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        router.push(`/dashboard/telemedicine?appointmentId=${appointment.id}`)
                                                                    }}
                                                                >
                                                                    <Video className="mr-2 h-3 w-3" />
                                                                    Telemedicine
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        router.push(`/dashboard/appointments/${appointment.id}`)
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Button>
                                                            </>
                                                        )}
                                                        {appointment.status === "in-progress" && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleStatusChange(appointment.id, "completed")
                                                                    }}
                                                                >
                                                                    <CheckCircle className="mr-2 h-3 w-3" />
                                                                    Complete
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        router.push(`/dashboard/appointments/${appointment.id}`)
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Button>
                                                            </>
                                                        )}
                                                        {(appointment.status === "completed" ||
                                                            appointment.status === "cancelled" ||
                                                            appointment.status === "no-show") && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        router.push(`/dashboard/appointments/${appointment.id}`)
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Button>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                                        <div className="flex flex-col items-center gap-1 text-center">
                                            <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                                            <h3 className="font-medium">No appointments today</h3>
                                            <p className="text-xs text-muted-foreground">There are no appointments scheduled for today</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <div className="text-sm text-muted-foreground">{todayAppointments.length} appointments today</div>
                            <Button onClick={() => router.push("/dashboard/appointments/schedule")}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Appointment
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Appointments</CardTitle>
                            <CardDescription>Future scheduled appointments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-6">
                                    {upcomingAppointments.length > 0 ? (
                                        (() => {
                                            // Group appointments by date
                                            const groupedAppointments: Record<string, typeof upcomingAppointments> = {}

                                            upcomingAppointments
                                                .sort((a, b) => a.date.getTime() - b.date.getTime())
                                                .forEach((appointment) => {
                                                    const dateKey = appointment.date.toDateString()
                                                    if (!groupedAppointments[dateKey]) {
                                                        groupedAppointments[dateKey] = []
                                                    }
                                                    groupedAppointments[dateKey].push(appointment)
                                                })

                                            return Object.entries(groupedAppointments).map(([dateKey, appointments]) => (
                                                <div key={dateKey}>
                                                    <h3 className="text-lg font-medium mb-2">
                                                        {new Date(dateKey).toLocaleDateString(undefined, {
                                                            weekday: "long",
                                                            month: "long",
                                                            day: "numeric",
                                                        })}
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {appointments.map((appointment) => (
                                                            <div
                                                                key={appointment.id}
                                                                className="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                                                                onClick={() => handleViewAppointment(appointment.id)}
                                                            >
                                                                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-md bg-muted">
                                                                    <span className="text-sm font-medium">{formatTime(appointment.date)}</span>
                                                                    <span className="text-xs text-muted-foreground">{appointment.duration} min</span>
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <Avatar className="h-8 w-8">
                                                                                <AvatarImage
                                                                                    src={appointment.patientPhoto || "/placeholder.svg"}
                                                                                    alt={appointment.patientName}
                                                                                />
                                                                                <AvatarFallback>
                                                                                    {appointment.patientName.split(" ").map((n) => n[0])}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div>
                                                                                <p className="text-sm font-medium leading-none">{appointment.patientName}</p>
                                                                                <p className="text-xs text-muted-foreground">ID: {appointment.patientId}</p>
                                                                            </div>
                                                                        </div>
                                                                        {getStatusBadge(appointment.status)}
                                                                    </div>
                                                                    <div className="pt-2">
                                                                        <p className="text-sm">
                                                                            <span className="font-medium">Type:</span> {appointment.type}
                                                                        </p>
                                                                        {appointment.notes && (
                                                                            <p className="text-sm mt-1">
                                                                                <span className="font-medium">Notes:</span> {appointment.notes}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 pt-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                router.push(`/dashboard/appointments/reschedule/${appointment.id}`)
                                                                            }}
                                                                        >
                                                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                                                            Reschedule
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                router.push(`/dashboard/appointments/${appointment.id}`)
                                                                            }}
                                                                        >
                                                                            View Details
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        })()
                                    ) : (
                                        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                                                <h3 className="font-medium">No upcoming appointments</h3>
                                                <p className="text-xs text-muted-foreground">There are no future appointments scheduled</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <div className="text-sm text-muted-foreground">{upcomingAppointments.length} upcoming appointments</div>
                            <Button onClick={() => router.push("/dashboard/appointments/schedule")}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Appointment
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="past" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Past Appointments</CardTitle>
                            <CardDescription>Previous appointments and their outcomes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-6">
                                    {pastAppointments.length > 0 ? (
                                        (() => {
                                            // Group appointments by date
                                            const groupedAppointments: Record<string, typeof pastAppointments> = {}

                                            pastAppointments
                                                .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort in reverse chronological order
                                                .forEach((appointment) => {
                                                    const dateKey = appointment.date.toDateString()
                                                    if (!groupedAppointments[dateKey]) {
                                                        groupedAppointments[dateKey] = []
                                                    }
                                                    groupedAppointments[dateKey].push(appointment)
                                                })

                                            return Object.entries(groupedAppointments).map(([dateKey, appointments]) => (
                                                <div key={dateKey}>
                                                    <h3 className="text-lg font-medium mb-2">
                                                        {new Date(dateKey).toLocaleDateString(undefined, {
                                                            weekday: "long",
                                                            month: "long",
                                                            day: "numeric",
                                                        })}
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {appointments.map((appointment) => (
                                                            <div
                                                                key={appointment.id}
                                                                className="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                                                                onClick={() => handleViewAppointment(appointment.id)}
                                                            >
                                                                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-md bg-muted">
                                                                    <span className="text-sm font-medium">{formatTime(appointment.date)}</span>
                                                                    <span className="text-xs text-muted-foreground">{appointment.duration} min</span>
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <Avatar className="h-8 w-8">
                                                                                <AvatarImage
                                                                                    src={appointment.patientPhoto || "/placeholder.svg"}
                                                                                    alt={appointment.patientName}
                                                                                />
                                                                                <AvatarFallback>
                                                                                    {appointment.patientName.split(" ").map((n) => n[0])}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div>
                                                                                <p className="text-sm font-medium leading-none">{appointment.patientName}</p>
                                                                                <p className="text-xs text-muted-foreground">ID: {appointment.patientId}</p>
                                                                            </div>
                                                                        </div>
                                                                        {getStatusBadge(appointment.status)}
                                                                    </div>
                                                                    <div className="pt-2">
                                                                        <p className="text-sm">
                                                                            <span className="font-medium">Type:</span> {appointment.type}
                                                                        </p>

                                                                        {appointment.notes && (
                                                                            <p className="text-sm mt-1">
                                                                                <span className="font-medium">Notes:</span> {appointment?.notes}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 pt-2">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                router.push(`/dashboard/appointments/${appointment._id}`)
                                                                            }}
                                                                        >
                                                                            View Details
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        })()
                                    ) : (
                                        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                                                <h3 className="font-medium">No past appointments</h3>
                                                <p className="text-xs text-muted-foreground">There are no previous appointments on record</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <div className="text-sm text-muted-foreground">{pastAppointments.length} past appointments</div>
                            <Button variant="outline" onClick={() => router.push("/dashboard/appointments/reports")}>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Report
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
