import Link from "next/link"
import {
  Calendar,
  Clock,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarClock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"

// Mock data for appointments
const upcomingAppointments = [
  {
    id: "1",
    patientId: "101",
    patientName: "Sarah Johnson",
    patientAvatar: "/diverse-group-city.png",
    date: "2025-05-02",
    time: "09:30 AM",
    duration: "30 min",
    type: "Eye Examination",
    doctor: "Dr. Emily Chen",
    status: "confirmed",
    notes: "Annual eye checkup",
    phone: "+1 (555) 123-4567",
    email: "sarah.j@example.com",
  },
  {
    id: "2",
    patientId: "102",
    patientName: "Michael Rodriguez",
    patientAvatar: "/contemplative-man.png",
    date: "2025-05-02",
    time: "10:15 AM",
    duration: "45 min",
    type: "Contact Lens Fitting",
    doctor: "Dr. James Wilson",
    status: "confirmed",
    notes: "First-time contact lens user",
    phone: "+1 (555) 987-6543",
    email: "michael.r@example.com",
  },
  {
    id: "3",
    patientId: "103",
    patientName: "Emma Thompson",
    patientAvatar: "/contemplative-artist.png",
    date: "2025-05-02",
    time: "11:30 AM",
    duration: "60 min",
    type: "Comprehensive Eye Exam",
    doctor: "Dr. Emily Chen",
    status: "pending",
    notes: "Patient reported blurry vision",
    phone: "+1 (555) 234-5678",
    email: "emma.t@example.com",
  },
  {
    id: "4",
    patientId: "104",
    patientName: "David Lee",
    patientAvatar: "/thoughtful-urbanite.png",
    date: "2025-05-03",
    time: "09:00 AM",
    duration: "30 min",
    type: "Follow-up",
    doctor: "Dr. James Wilson",
    status: "confirmed",
    notes: "Post-surgery follow-up",
    phone: "+1 (555) 345-6789",
    email: "david.l@example.com",
  },
  {
    id: "5",
    patientId: "105",
    patientName: "Olivia Garcia",
    patientAvatar: "/vibrant-street-portrait.png",
    date: "2025-05-03",
    time: "10:45 AM",
    duration: "45 min",
    type: "Glaucoma Screening",
    doctor: "Dr. Emily Chen",
    status: "confirmed",
    notes: "Family history of glaucoma",
    phone: "+1 (555) 456-7890",
    email: "olivia.g@example.com",
  },
]

const pastAppointments = [
  {
    id: "6",
    patientId: "106",
    patientName: "William Brown",
    patientAvatar: "/contemplative-elder.png",
    date: "2025-04-28",
    time: "14:00 PM",
    duration: "30 min",
    type: "Eye Examination",
    doctor: "Dr. James Wilson",
    status: "completed",
    notes: "Prescription updated",
    phone: "+1 (555) 567-8901",
    email: "william.b@example.com",
  },
  {
    id: "7",
    patientId: "107",
    patientName: "Sophia Martinez",
    patientAvatar: "/contemplative-artist.png",
    date: "2025-04-27",
    time: "11:15 AM",
    duration: "45 min",
    type: "Contact Lens Fitting",
    doctor: "Dr. Emily Chen",
    status: "completed",
    notes: "Switched to monthly lenses",
    phone: "+1 (555) 678-9012",
    email: "sophia.m@example.com",
  },
  {
    id: "8",
    patientId: "103",
    patientName: "Emma Thompson",
    patientAvatar: "/contemplative-artist.png",
    date: "2025-04-20",
    time: "09:30 AM",
    duration: "30 min",
    type: "Eye Examination",
    doctor: "Dr. Emily Chen",
    status: "no-show",
    notes: "Patient did not attend",
    phone: "+1 (555) 234-5678",
    email: "emma.t@example.com",
  },
]

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

// Appointment card component
const AppointmentCard = ({ appointment }: { appointment: any }) => {
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <img src={appointment.patientAvatar || "/placeholder.svg"} alt={appointment.patientName} />
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                <Link href={`/dashboard/patients/${appointment.patientId}`} className="hover:underline">
                  {appointment.patientName}
                </Link>
              </CardTitle>
              <CardDescription>{appointment.type}</CardDescription>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{appointment.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {appointment.time} ({appointment.duration})
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-medium">Doctor:</span>
          <span className="text-sm">{appointment.doctor}</span>
        </div>
        {appointment.notes && (
          <div className="mt-2">
            <span className="text-sm text-gray-500">{appointment.notes}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/appointments/${appointment.id}`}>View Details</Link>
            </Button>
            {appointment.status === "confirmed" && (
              <Button variant="outline" size="sm">
                Check In
              </Button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href={`/dashboard/appointments/${appointment.id}`} className="flex w-full">
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/dashboard/patients/${appointment.patientId}`} className="flex w-full">
                  View Patient
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {appointment.status === "confirmed" && (
                <>
                  <DropdownMenuItem>Reschedule</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Cancel Appointment</DropdownMenuItem>
                </>
              )}
              {appointment.status === "pending" && (
                <>
                  <DropdownMenuItem className="text-green-600">Confirm Appointment</DropdownMenuItem>
                  <DropdownMenuItem>Reschedule</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Cancel Appointment</DropdownMenuItem>
                </>
              )}
              {(appointment.status === "completed" || appointment.status === "no-show") && (
                <DropdownMenuItem>Schedule Follow-up</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  )
}

// Date navigation component
const DateNavigation = () => {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium">May 2-3, 2025</div>
      <Button variant="outline" size="icon">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/appointments/calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar View
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">23</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <DateNavigation />
          <Button variant="outline" size="sm">
            Today
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input type="search" placeholder="Search appointments..." className="w-full pl-8 sm:w-[250px]" />
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                <SelectItem value="dr-chen">Dr. Emily Chen</SelectItem>
                <SelectItem value="dr-wilson">Dr. James Wilson</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="today">
          <div className="space-y-4">
            {upcomingAppointments.slice(0, 3).map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="past">
          <div className="space-y-4">
            {pastAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
