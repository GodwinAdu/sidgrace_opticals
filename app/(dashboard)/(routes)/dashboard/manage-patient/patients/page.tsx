import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, ArrowUpDown, Calendar, FileText, Eye, MoreHorizontal, UserPlus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { calculateAge, cn } from "@/lib/utils"
import { fetchPatientThisMonth, getPatientDashboardStats } from "@/lib/actions/patient.actions"

export default async function PatientsPage() {
  const [statistics, patients] = await Promise.all([
    getPatientDashboardStats(),
    fetchPatientThisMonth()
  ])
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-6 ">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Patients</h1>
            <p className="text-gray-500">Manage patient records and medical information</p>
          </div>
          <div className="flex gap-2">
            <Link href={'/dashboard/manage-patient/patients/new'} className={cn(buttonVariants())}>
              <UserPlus className="mr-2 h-4 w-4" />
              Register New Patient
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input type="search" placeholder="Search patients by name, ID, or phone..." className="w-full pl-8" />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Patient Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statistics.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>


        {/* Patients Table */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="">
              <CardTitle>Patient Records This Month</CardTitle>
              <CardDescription>View and manage your patient database</CardDescription>
            </div>
            <div className="">
              <Link href="/dashboard/manage-patient/patient-list" className={cn(buttonVariants())}>
                <Eye className="h-4 w-4" />
              View All Patients
              </Link>
              </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Patient Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients
                  .map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/patients/${patient.id}`} className="hover:text-blue-700">
                          {patient.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{patient.patientId}</TableCell>
                      <TableCell>{`${calculateAge(patient.dob)} / ${patient.gender}`}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{patient?.lastVisit}</TableCell>
                      <TableCell>
                        <Badge
                          className={`${patient.status === "Active"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : patient.status === "Scheduled"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : patient.status === "Waiting"
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : patient.status === "Follow-up"
                                  ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                            }`}
                        >
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Link href={`/dashboard/patients/${patient.id}`} className="flex items-center">
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link
                                href={`/dashboard/patients/${patient.id}/medical-records`}
                                className="flex items-center"
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Medical Records
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link
                                href={`/dashboard/appointments/new?patient=${patient.id}`}
                                className="flex items-center"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule Appointment
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Patients</CardTitle>
              <CardDescription>Patients seen in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Sarah Williams", date: "Today, 10:30 AM", reason: "Eye Examination" },
                  { name: "Michael Brown", date: "Yesterday, 2:15 PM", reason: "Post-Surgery Follow-up" },
                  { name: "Emily Johnson", date: "Apr 27, 11:00 AM", reason: "Contact Lens Fitting" },
                  { name: "Robert Davis", date: "Apr 25, 9:45 AM", reason: "Glaucoma Check-up" },
                ].map((patient, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-500">{patient.reason}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{patient.date}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Scheduled for the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Jennifer Lee", date: "Today, 3:00 PM", reason: "Cataract Consultation" },
                  { name: "John Smith", date: "Tomorrow, 10:00 AM", reason: "Follow-up" },
                  { name: "Alice Cooper", date: "May 2, 11:30 AM", reason: "Vision Test" },
                  { name: "David Martinez", date: "May 3, 2:45 PM", reason: "Prescription Renewal" },
                ].map((appointment, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {appointment.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{appointment.name}</p>
                        <p className="text-sm text-gray-500">{appointment.reason}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{appointment.date}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
