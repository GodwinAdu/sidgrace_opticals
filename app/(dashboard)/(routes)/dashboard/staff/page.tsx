import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  FileText,
  Eye,
  MoreHorizontal,
  UserPlus,
  Mail,
  Phone,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data for staff members
const staffMembers = [
  {
    id: "STF-001",
    name: "Dr. Sarah Johnson",
    role: "Ophthalmologist",
    specialty: "Retina Specialist",
    email: "sarah.johnson@sidgrace.com",
    phone: "+1 (555) 123-4567",
    status: "active",
    avatar: "/confident-doctor.png",
    joinDate: "2018-05-15",
    schedule: "Mon-Fri, 9:00 AM - 5:00 PM",
    appointmentsToday: 8,
    totalPatients: 1250,
  },
  {
    id: "STF-002",
    name: "Dr. Michael Chen",
    role: "Ophthalmologist",
    specialty: "Cornea Specialist",
    email: "michael.chen@sidgrace.com",
    phone: "+1 (555) 234-5678",
    status: "active",
    avatar: "/confident-asian-doctor.png",
    joinDate: "2019-03-10",
    schedule: "Mon-Thu, 8:00 AM - 4:00 PM",
    appointmentsToday: 6,
    totalPatients: 980,
  },
  {
    id: "STF-003",
    name: "Dr. Amara Patel",
    role: "Ophthalmologist",
    specialty: "Pediatric Ophthalmology",
    email: "amara.patel@sidgrace.com",
    phone: "+1 (555) 345-6789",
    status: "on-leave",
    avatar: "/female-doctor.png",
    joinDate: "2020-01-15",
    schedule: "Tue-Sat, 9:00 AM - 5:00 PM",
    appointmentsToday: 0,
    totalPatients: 875,
  },
  {
    id: "STF-004",
    name: "Dr. Robert Williams",
    role: "Ophthalmologist",
    specialty: "Glaucoma Specialist",
    email: "robert.williams@sidgrace.com",
    phone: "+1 (555) 456-7890",
    status: "active",
    avatar: "/male-doctor.png",
    joinDate: "2017-08-22",
    schedule: "Mon-Wed, Fri, 8:30 AM - 4:30 PM",
    appointmentsToday: 7,
    totalPatients: 1430,
  },
  {
    id: "STF-005",
    name: "Emily Rodriguez",
    role: "Optometrist",
    specialty: "Contact Lens Specialist",
    email: "emily.rodriguez@sidgrace.com",
    phone: "+1 (555) 567-8901",
    status: "active",
    avatar: "/placeholder.svg?key=j5lsw",
    joinDate: "2021-04-05",
    schedule: "Mon-Fri, 9:00 AM - 5:00 PM",
    appointmentsToday: 10,
    totalPatients: 650,
  },
  {
    id: "STF-006",
    name: "James Wilson",
    role: "Optician",
    specialty: "Frame Styling",
    email: "james.wilson@sidgrace.com",
    phone: "+1 (555) 678-9012",
    status: "active",
    avatar: "/placeholder.svg?key=gxs8z",
    joinDate: "2019-11-12",
    schedule: "Mon-Sat, 10:00 AM - 6:00 PM",
    appointmentsToday: 5,
    totalPatients: 0,
  },
  {
    id: "STF-007",
    name: "Lisa Wong",
    role: "Nurse",
    specialty: "Pre-testing",
    email: "lisa.wong@sidgrace.com",
    phone: "+1 (555) 789-0123",
    status: "active",
    avatar: "/asian-nurse.png",
    joinDate: "2020-06-18",
    schedule: "Mon-Fri, 8:30 AM - 4:30 PM",
    appointmentsToday: 0,
    totalPatients: 0,
  },
  {
    id: "STF-008",
    name: "David Martinez",
    role: "Receptionist",
    specialty: "Patient Scheduling",
    email: "david.martinez@sidgrace.com",
    phone: "+1 (555) 890-1234",
    status: "active",
    avatar: "/placeholder.svg?key=catjz",
    joinDate: "2022-01-10",
    schedule: "Mon-Fri, 8:00 AM - 4:00 PM",
    appointmentsToday: 0,
    totalPatients: 0,
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    case "on-leave":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">On Leave</Badge>
    case "inactive":
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function StaffPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Staff Management</h1>
            <p className="text-gray-500">Manage doctors, nurses, and other staff members</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-blue-700 hover:bg-blue-800">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input type="search" placeholder="Search staff by name, role, or specialty..." className="w-full pl-8" />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ophthalmologist">Ophthalmologist</SelectItem>
                <SelectItem value="optometrist">Optometrist</SelectItem>
                <SelectItem value="optician">Optician</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-leave">On Leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Staff Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: "Total Staff", value: "8", change: "+1 this month" },
            { title: "Doctors", value: "5", change: "4 Ophthalmologists, 1 Optometrist" },
            { title: "Support Staff", value: "3", change: "1 Optician, 1 Nurse, 1 Receptionist" },
            { title: "On Leave", value: "1", change: "Returns May 15, 2025" },
          ].map((stat, index) => (
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

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:w-auto">
            <TabsTrigger value="all">All Staff</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="clinical">Clinical Staff</TabsTrigger>
            <TabsTrigger value="admin">Administrative</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Directory</CardTitle>
                <CardDescription>View and manage all staff members</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Staff Member
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                              <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link href={`/dashboard/staff/${staff.id}`} className="hover:text-blue-700">
                                {staff.name}
                              </Link>
                              <div className="text-xs text-gray-500">{staff.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{staff.role}</TableCell>
                        <TableCell>{staff.specialty}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-gray-500" />
                              <span className="text-xs">{staff.email}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span className="text-xs">{staff.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{staff.schedule}</TableCell>
                        <TableCell>
                          <StatusBadge status={staff.status} />
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
                                <Link href={`/dashboard/staff/${staff.id}`} className="flex items-center">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/dashboard/staff/${staff.id}/edit`} className="flex items-center">
                                  <FileText className="mr-2 h-4 w-4" />
                                  Edit Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/dashboard/staff/${staff.id}/schedule`} className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  View Schedule
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
          </TabsContent>

          <TabsContent value="doctors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Doctors</CardTitle>
                <CardDescription>Ophthalmologists and Optometrists</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Appointments Today</TableHead>
                      <TableHead>Total Patients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers
                      .filter((staff) => staff.role === "Ophthalmologist" || staff.role === "Optometrist")
                      .map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={doctor.avatar || "/placeholder.svg"} alt={doctor.name} />
                                <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/dashboard/staff/${doctor.id}`} className="hover:text-blue-700">
                                  {doctor.name}
                                </Link>
                                <div className="text-xs text-gray-500">{doctor.role}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{doctor.specialty}</TableCell>
                          <TableCell>{doctor.appointmentsToday}</TableCell>
                          <TableCell>{doctor.totalPatients}</TableCell>
                          <TableCell>
                            <StatusBadge status={doctor.status} />
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
                                  <Link href={`/dashboard/staff/${doctor.id}`} className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Profile
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/dashboard/staff/${doctor.id}/schedule`} className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    View Schedule
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
          </TabsContent>

          <TabsContent value="clinical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinical Staff</CardTitle>
                <CardDescription>Nurses, Opticians, and Technicians</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers
                      .filter((staff) => staff.role === "Nurse" || staff.role === "Optician")
                      .map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                                <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/dashboard/staff/${staff.id}`} className="hover:text-blue-700">
                                  {staff.name}
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{staff.role}</TableCell>
                          <TableCell>{staff.specialty}</TableCell>
                          <TableCell>{staff.schedule}</TableCell>
                          <TableCell>
                            <StatusBadge status={staff.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/staff/${staff.id}`}>View Profile</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Administrative Staff</CardTitle>
                <CardDescription>Receptionists and Administrative Personnel</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers
                      .filter((staff) => staff.role === "Receptionist")
                      .map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                                <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/dashboard/staff/${staff.id}`} className="hover:text-blue-700">
                                  {staff.name}
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{staff.role}</TableCell>
                          <TableCell>{staff.specialty}</TableCell>
                          <TableCell>{staff.schedule}</TableCell>
                          <TableCell>
                            <StatusBadge status={staff.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/staff/${staff.id}`}>View Profile</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
