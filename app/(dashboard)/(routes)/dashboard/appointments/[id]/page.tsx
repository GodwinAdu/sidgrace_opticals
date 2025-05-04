import Link from "next/link"
import {
  Calendar,
  Clock,
  User,
  FileText,
  Edit,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarClock,
  MessageSquare,
  Printer,
  Share2,
  CalendarPlus,
  Phone,
  Mail,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Mock appointment data
const appointmentData = {
  id: "1",
  patientId: "101",
  patientName: "Sarah Johnson",
  patientAvatar: "/diverse-group-city.png",
  date: "2025-05-02",
  time: "09:30 AM",
  endTime: "10:00 AM",
  duration: "30 min",
  type: "Eye Examination",
  doctor: "Dr. Emily Chen",
  status: "confirmed",
  notes:
    "Annual eye checkup. Patient reported occasional blurry vision when reading for extended periods. Last visit was 12 months ago.",
  phone: "+1 (555) 123-4567",
  email: "sarah.j@example.com",
  insurance: "BlueCross Health",
  insuranceId: "BC123456789",
  createdAt: "2025-04-15",
  updatedAt: "2025-04-20",
  history: [
    { date: "2025-04-15 10:23 AM", action: "Appointment created", user: "Reception Staff" },
    { date: "2025-04-20 02:45 PM", action: "Appointment confirmed", user: "System" },
    { date: "2025-04-25 11:30 AM", action: "Reminder sent", user: "System" },
  ],
  previousAppointments: [
    { date: "2024-05-10", type: "Eye Examination", doctor: "Dr. Emily Chen", status: "completed" },
    { date: "2023-04-22", type: "Contact Lens Fitting", doctor: "Dr. James Wilson", status: "completed" },
  ],
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Confirmed</Badge>
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>
    case "completed":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Completed</Badge>
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Cancelled</Badge>
    case "no-show":
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">No Show</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

// Status icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case "pending":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-blue-500" />
    case "cancelled":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "no-show":
      return <XCircle className="h-5 w-5 text-gray-500" />
    default:
      return <CalendarClock className="h-5 w-5 text-gray-500" />
  }
}

export default function AppointmentDetailsPage({ params }: { params: { id: string } }) {
  const appointment = appointmentData // In a real app, fetch by params.id

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Appointment Details</h1>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Appointment Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Check In Patient
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Appointment
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Appointment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Information</CardTitle>
              <CardDescription>Details about the scheduled appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Date</div>
                    <div>{appointment.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Time</div>
                    <div>
                      {appointment.time} - {appointment.endTime} ({appointment.duration})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Doctor</div>
                    <div>{appointment.doctor}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Appointment Type</div>
                    <div>{appointment.type}</div>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h3 className="mb-2 font-medium">Notes</h3>
                <p className="text-sm text-gray-700">{appointment.notes}</p>
              </div>

              <Separator className="my-4" />

              <div>
                <h3 className="mb-2 font-medium">Insurance Information</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium">Provider</div>
                    <div className="text-sm">{appointment.insurance}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">ID Number</div>
                    <div className="text-sm">{appointment.insuranceId}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <img src={appointment.patientAvatar || "/placeholder.svg"} alt={appointment.patientName} />
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      <Link href={`/dashboard/patients/${appointment.patientId}`} className="hover:underline">
                        {appointment.patientName}
                      </Link>
                    </div>
                    <div className="text-sm text-gray-500">Patient ID: {appointment.patientId}</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{appointment.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{appointment.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{appointment.insurance}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointment.history.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{item.action}</span>
                      <span className="text-xs text-gray-500">{item.date}</span>
                    </div>
                    <div className="text-xs text-gray-500">By: {item.user}</div>
                    {index < appointment.history.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointment.previousAppointments.length === 0 ? (
                <div className="text-sm text-gray-500">No previous appointments</div>
              ) : (
                appointment.previousAppointments.map((prevAppt, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{prevAppt.date}</span>
                      </div>
                      <div className="mt-1 text-sm">{prevAppt.type}</div>
                      <div className="text-xs text-gray-500">Doctor: {prevAppt.doctor}</div>
                    </div>
                    <StatusBadge status={prevAppt.status} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
