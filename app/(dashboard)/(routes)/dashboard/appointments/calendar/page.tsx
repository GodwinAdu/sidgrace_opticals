"use client"

import { useState } from "react"
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

// Mock data for appointments
const mockAppointments = [
  {
    id: "APT-1001",
    patientId: "SGO-P1001",
    patientName: "John Smith",
    patientAge: 45,
    patientPhone: "+1 (555) 123-4567",
    doctorId: "1",
    doctorName: "Dr. Sarah Johnson",
    type: "Eye Examination",
    subType: "Comprehensive Eye Exam",
    date: "2025-05-02T10:30:00",
    duration: 30,
    status: "confirmed",
    notes: "Annual eye examination",
    priority: "normal",
  },
  {
    id: "APT-1002",
    patientId: "SGO-P1002",
    patientName: "Emma Davis",
    patientAge: 32,
    patientPhone: "+1 (555) 987-6543",
    doctorId: "2",
    doctorName: "Dr. Michael Chen",
    type: "Contact Lens Fitting",
    subType: "New Prescription",
    date: "2025-05-02T11:15:00",
    duration: 45,
    status: "confirmed",
    notes: "First-time contact lens user",
    priority: "normal",
  },
  {
    id: "APT-1003",
    patientId: "SGO-P1003",
    patientName: "Robert Johnson",
    patientAge: 58,
    patientPhone: "+1 (555) 234-5678",
    doctorId: "1",
    doctorName: "Dr. Sarah Johnson",
    type: "Follow-up",
    subType: "Post-Surgery",
    date: "2025-05-02T13:00:00",
    duration: 30,
    status: "confirmed",
    notes: "Two-week post-cataract surgery follow-up",
    priority: "high",
  },
  {
    id: "APT-1004",
    patientId: "SGO-P1004",
    patientName: "Sophia Martinez",
    patientAge: 27,
    patientPhone: "+1 (555) 345-6789",
    doctorId: "2",
    doctorName: "Dr. Michael Chen",
    type: "Eye Examination",
    subType: "Comprehensive Eye Exam",
    date: "2025-05-02T14:30:00",
    duration: 30,
    status: "confirmed",
    notes: "Experiencing eye strain with computer work",
    priority: "normal",
  },
  {
    id: "APT-1005",
    patientId: "SGO-P1005",
    patientName: "William Brown",
    patientAge: 65,
    patientPhone: "+1 (555) 456-7890",
    doctorId: "1",
    doctorName: "Dr. Sarah Johnson",
    type: "Glaucoma Screening",
    subType: "Pressure Check",
    date: "2025-05-03T09:00:00",
    duration: 45,
    status: "confirmed",
    notes: "Family history of glaucoma",
    priority: "normal",
  },
]

// Calendar day component
const CalendarDay = ({ date, appointments, isToday }: { date: string; appointments: any[]; isToday: boolean }) => {
  const dayNumber = new Date(date).getDate()
  const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" })

  return (
    <Card className={`h-full ${isToday ? "border-2 border-blue-500" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{dayName}</span>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : "bg-gray-100"}`}
          >
            {dayNumber}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {appointments.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-sm text-gray-500">No appointments</div>
        ) : (
          appointments.map((appointment) => (
            <Link href={`/dashboard/appointments/${appointment.id}`} key={appointment.id} className="block">
              <div className="group cursor-pointer rounded-md border border-gray-200 p-2 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {new Date(appointment.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <Badge
                    className={`
                      ${
                        appointment.priority === "high"
                          ? "bg-red-100 text-red-800 hover:bg-red-200"
                          : appointment.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      }
                    `}
                  >
                    {appointment.duration} min
                  </Badge>
                </div>
                <div className="mt-1 text-sm">{appointment.patientName}</div>
                <div className="mt-1 text-xs text-gray-500">{appointment.type}</div>
              </div>
            </Link>
          ))
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-500">
          <Plus className="mr-1 h-3 w-3" />
          Add appointment
        </Button>
      </CardContent>
    </Card>
  )
}

export default function CalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date("2025-05-01"))

  // Generate dates for the week
  const getDatesForWeek = (startDate: Date) => {
    const dates = []
    const currentDate = new Date(startDate)

    for (let i = 0; i < 7; i++) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
  }

  const weekDates = getDatesForWeek(currentWeek)

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    return mockAppointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date).toISOString().split("T")[0]
      return appointmentDate === dateString
    })
  }

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  // Format date range for display
  const formatDateRange = () => {
    const startDate = weekDates[0]
    const endDate = weekDates[6]

    const startMonth = startDate.toLocaleString("en-US", { month: "short" })
    const endMonth = endDate.toLocaleString("en-US", { month: "short" })

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`
    }
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Appointment Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/appointments">
              <Calendar className="mr-2 h-4 w-4" />
              List View
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/appointments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{formatDateRange()}</div>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              <SelectItem value="dr-johnson">Dr. Sarah Johnson</SelectItem>
              <SelectItem value="dr-chen">Dr. Michael Chen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {weekDates.map((date, index) => (
          <CalendarDay
            key={index}
            date={date.toISOString()}
            appointments={getAppointmentsForDate(date)}
            isToday={isToday(date)}
          />
        ))}
      </div>
    </div>
  )
}
