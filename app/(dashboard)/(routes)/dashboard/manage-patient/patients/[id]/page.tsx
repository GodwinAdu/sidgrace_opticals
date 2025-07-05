import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Eye,
  FileText,
  MessageSquare,
  Phone,
  Printer,
  Share2,
  User,
  Plus,
} from "lucide-react"
import { fetchPatientId } from "@/lib/actions/patient.actions"
import { calculateAge, cn } from "@/lib/utils"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patient = await fetchPatientId(id)

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Back button and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Link href="/dashboard/manage-patient/patients">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Patients
              </Button>
            </Link>
            <Badge
              className={`${patient.status === "Active"
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                }`}
            >
              {patient.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button className="bg-blue-700 hover:bg-blue-800" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit Patient
            </Button>
          </div>
        </div>

        {/* Patient header */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-4xl font-bold">
            {patient.fullName.charAt(0)}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-blue-900">{patient.fullName}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-500">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {calculateAge(patient?.dob)} years, {patient.gender}
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                {patient.phone}
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                ID: {patient.patientId}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Last Visit: {patient.lastVisit}
              </div>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Link href=""  className={cn(buttonVariants(),"bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100")}>
              <Calendar className="h-4 w-4 mr-1" />
              Schedule Appointment
            </Link>
            <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
              <MessageSquare className="h-4 w-4 mr-1" />
              Send Message
            </Button>
          </div>
        </div>

        {/* Patient information tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-sm text-gray-500">Full Name</dt>
                <dd className="font-medium">{patient.fullName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Date of Birth</dt>
                <dd className="font-medium">{patient.dob}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Gender</dt>
                <dd className="font-medium">{patient.gender}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Blood Type</dt>
                <dd className="font-medium">{patient.bloodType}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="font-medium">{patient.phone}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="font-medium">{patient.email}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-gray-500">Address</dt>
                <dd className="font-medium">{patient.address}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-gray-500">Emergency Contact</dt>
                <dd className="font-medium">{patient.emergencyContact}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Allergies</dt>
                <dd className="font-medium">
                  {patient?.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient?.allergies?.map((allergy, index) => (
                        <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "No known allergies"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Chronic Conditions</dt>
                <dd className="font-medium">
                  {patient.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.chronicConditions.map((condition, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200"
                        >
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "None"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Insurance</dt>
                <dd className="font-medium">{patient.insurance}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Policy Number</dt>
                <dd className="font-medium">{patient.policyNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Registration Date</dt>
                <dd className="font-medium">{patient.registeredAt ?? patient.createdAt}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  date: "2023-05-10",
                  time: "10:30 AM",
                  doctor: "Dr. Sarah Johnson",
                  reason: "Follow-up Examination",
                },
              ].map((appointment, index) => (
                <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{appointment.reason}</p>
                      <p className="text-sm text-gray-500">{appointment.doctor}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-500">{appointment.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-500">{appointment.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-blue-700 hover:text-blue-800 p-0">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:text-amber-700 p-0">
                      <Edit className="h-4 w-4 mr-1" />
                      Reschedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
