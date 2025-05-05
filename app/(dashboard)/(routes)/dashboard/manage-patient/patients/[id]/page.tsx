import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { calculateAge } from "@/lib/utils"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patient = await fetchPatientId(id)

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Back button and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Link href="/dashboard/patients">
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
            <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
              <Calendar className="h-4 w-4 mr-1" />
              Schedule Appointment
            </Button>
            <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
              <MessageSquare className="h-4 w-4 mr-1" />
              Send Message
            </Button>
          </div>
        </div>

        {/* Patient information tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="medical">Medical Records</TabsTrigger>
            <TabsTrigger value="visits">Visits & Plans</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <CardTitle>Recent Visits</CardTitle>
                  <CardDescription>Last 3 visits to the hospital</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        date: "2023-04-15",
                        doctor: "Dr. Sarah Johnson",
                        reason: "Regular Eye Examination",
                        diagnosis: "Mild Myopia",
                      },
                      {
                        date: "2023-01-22",
                        doctor: "Dr. Michael Chen",
                        reason: "Eye Irritation",
                        diagnosis: "Allergic Conjunctivitis",
                      },
                      {
                        date: "2022-10-05",
                        doctor: "Dr. Sarah Johnson",
                        reason: "Vision Check",
                        diagnosis: "Stable Myopia",
                      },
                    ].map((visit, index) => (
                      <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{visit.reason}</p>
                            <p className="text-sm text-gray-500">
                              {visit.doctor} • Diagnosis: {visit.diagnosis}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm text-gray-500">{visit.date}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Button variant="ghost" size="sm" className="h-8 text-blue-700 hover:text-blue-800 p-0">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
          </TabsContent>

          {/* Medical Records Tab */}
          <TabsContent value="medical" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Medical Records</CardTitle>
                  <CardDescription>Complete medical history and records</CardDescription>
                </div>
                <Button className="bg-blue-700 hover:bg-blue-800">
                  <FileText className="h-4 w-4 mr-1" />
                  Add Medical Record
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      date: "2023-04-15",
                      type: "Eye Examination",
                      doctor: "Dr. Sarah Johnson",
                      findings: [
                        "Visual Acuity: OD 20/40, OS 20/30",
                        "Intraocular Pressure: OD 16 mmHg, OS 15 mmHg",
                        "Mild myopia in both eyes",
                        "No signs of retinal abnormalities",
                      ],
                      recommendations: [
                        "Updated prescription for corrective lenses",
                        "Annual follow-up examination recommended",
                      ],
                    },
                    {
                      date: "2023-01-22",
                      type: "Consultation",
                      doctor: "Dr. Michael Chen",
                      findings: [
                        "Patient presents with redness and itching in both eyes",
                        "Conjunctival inflammation observed",
                        "No corneal involvement",
                        "Consistent with allergic conjunctivitis",
                      ],
                      recommendations: [
                        "Prescribed antihistamine eye drops",
                        "Advised to avoid known allergens",
                        "Follow-up in 2 weeks if symptoms persist",
                      ],
                    },
                    {
                      date: "2022-10-05",
                      type: "Eye Examination",
                      doctor: "Dr. Sarah Johnson",
                      findings: [
                        "Visual Acuity: OD 20/40, OS 20/30",
                        "Intraocular Pressure: OD 15 mmHg, OS 14 mmHg",
                        "Stable myopia compared to previous examination",
                        "Healthy optic nerve and retina",
                      ],
                      recommendations: [
                        "No change in prescription needed",
                        "Continue with current corrective lenses",
                        "Annual follow-up examination recommended",
                      ],
                    },
                  ].map((record, index) => (
                    <div key={index} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{record.type}</h3>
                          <p className="text-sm text-gray-500">{record.doctor}</p>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">{record.date}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Findings</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {record.findings.map((finding, idx) => (
                              <li key={idx} className="text-gray-700">
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Recommendations</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {record.recommendations.map((recommendation, idx) => (
                              <li key={idx} className="text-gray-700">
                                {recommendation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visits & Plans Tab */}
          <TabsContent value="visits" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Treatment Plans</CardTitle>
                  <CardDescription>Active and past treatment plans</CardDescription>
                </div>
                <Button className="bg-blue-700 hover:bg-blue-800">
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Plan
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      id: "TP-2023-001",
                      title: "Myopia Management Plan",
                      status: "Active",
                      startDate: "2023-04-15",
                      endDate: "2024-04-15",
                      doctor: "Dr. Sarah Johnson",
                      goals: [
                        "Slow myopia progression",
                        "Improve visual acuity",
                        "Reduce eye strain during computer work",
                      ],
                      treatments: [
                        "Corrective lenses with updated prescription",
                        "20-20-20 rule for digital device usage (every 20 minutes, look at something 20 feet away for 20 seconds)",
                        "Increased outdoor activity (minimum 1 hour daily)",
                      ],
                      followUp: "3-month check-up to assess progression",
                    },
                    {
                      id: "TP-2023-002",
                      title: "Allergic Conjunctivitis Treatment",
                      status: "Completed",
                      startDate: "2023-01-22",
                      endDate: "2023-02-22",
                      doctor: "Dr. Michael Chen",
                      goals: [
                        "Reduce eye inflammation",
                        "Alleviate symptoms of itching and redness",
                        "Prevent recurrence",
                      ],
                      treatments: [
                        "Antihistamine eye drops (Pataday) twice daily",
                        "Cold compresses for symptomatic relief",
                        "Allergen avoidance strategies",
                      ],
                      followUp: "Completed successfully, symptoms resolved",
                    },
                  ].map((plan, index) => (
                    <div key={index} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{plan.title}</h3>
                            <Badge
                              className={`${plan.status === "Active"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                              {plan.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Plan ID: {plan.id} • {plan.doctor}
                          </p>
                        </div>
                        <div className="flex items-center mt-2 md:mt-0">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {plan.startDate} to {plan.endDate}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Goals</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {plan.goals.map((goal, idx) => (
                              <li key={idx} className="text-gray-700">
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Treatments</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {plan.treatments.map((treatment, idx) => (
                              <li key={idx} className="text-gray-700">
                                {treatment}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Follow-up</h4>
                        <p className="text-gray-700">{plan.followUp}</p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {plan.status === "Active" && (
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Update Plan
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Prescriptions</CardTitle>
                  <CardDescription>Current and past prescriptions</CardDescription>
                </div>
                <Button className="bg-blue-700 hover:bg-blue-800">
                  <Plus className="h-4 w-4 mr-1" />
                  New Prescription
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      id: "RX-2023-042",
                      type: "Eyeglasses",
                      date: "2023-04-15",
                      doctor: "Dr. Sarah Johnson",
                      status: "Active",
                      details: {
                        right: {
                          sphere: "-2.25",
                          cylinder: "-0.50",
                          axis: "180",
                          add: "+1.00",
                          pd: "32",
                        },
                        left: {
                          sphere: "-2.00",
                          cylinder: "-0.75",
                          axis: "175",
                          add: "+1.00",
                          pd: "32",
                        },
                      },
                      notes: "Progressive lenses recommended. Blue light filtering coating advised for computer work.",
                      expiry: "2024-04-15",
                    },
                    {
                      id: "RX-2023-015",
                      type: "Eye Drops",
                      date: "2023-01-22",
                      doctor: "Dr. Michael Chen",
                      status: "Completed",
                      medication: "Pataday (Olopatadine 0.2%)",
                      dosage: "1 drop in each eye twice daily",
                      duration: "4 weeks",
                      notes: "For allergic conjunctivitis. Discontinue use and contact doctor if irritation worsens.",
                      expiry: "2023-02-22",
                    },
                  ].map((prescription, index) => (
                    <div key={index} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{prescription.type} Prescription</h3>
                            <Badge
                              className={`${prescription.status === "Active"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                }`}
                            >
                              {prescription.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            Rx: {prescription.id} • {prescription.doctor}
                          </p>
                        </div>
                        <div className="flex flex-col items-start md:items-end mt-2 md:mt-0">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm text-gray-500">Issued: {prescription.date}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm text-gray-500">Expires: {prescription.expiry}</span>
                          </div>
                        </div>
                      </div>

                      {prescription.type === "Eyeglasses" && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-blue-900 mb-2">Prescription Details</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Eye
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sphere
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cylinder
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Axis
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Add
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    PD
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    Right (OD)
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.right.sphere}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.right.cylinder}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.right.axis}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.right.add}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.right.pd}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    Left (OS)
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.left.sphere}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.left.cylinder}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.left.axis}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.left.add}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                    {prescription.details.left.pd}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {prescription.type === "Eye Drops" && (
                        <div className="mt-4 space-y-2">
                          <div>
                            <span className="font-semibold text-blue-900">Medication:</span>{" "}
                            <span className="text-gray-700">{prescription.medication}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-900">Dosage:</span>{" "}
                            <span className="text-gray-700">{prescription.dosage}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-900">Duration:</span>{" "}
                            <span className="text-gray-700">{prescription.duration}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Notes</h4>
                        <p className="text-gray-700">{prescription.notes}</p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        {prescription.status === "Active" && (
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>Payment history and insurance details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Insurance Information</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <dt className="text-sm text-gray-500">Provider</dt>
                        <dd className="font-medium">{patient.insurance}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Policy Number</dt>
                        <dd className="font-medium">{patient.policyNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Group Number</dt>
                        <dd className="font-medium">GRP-567890</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Coverage</dt>
                        <dd className="font-medium">80% after deductible</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Recent Invoices</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Invoice #
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Service
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Insurance Paid
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient Paid
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            {
                              id: "INV-2023-042",
                              date: "2023-04-15",
                              service: "Comprehensive Eye Examination",
                              amount: "$250.00",
                              insurancePaid: "$200.00",
                              patientPaid: "$50.00",
                              status: "Paid",
                            },
                            {
                              id: "INV-2023-015",
                              date: "2023-01-22",
                              service: "Consultation - Allergic Conjunctivitis",
                              amount: "$175.00",
                              insurancePaid: "$140.00",
                              patientPaid: "$35.00",
                              status: "Paid",
                            },
                            {
                              id: "INV-2022-098",
                              date: "2022-10-05",
                              service: "Routine Eye Examination",
                              amount: "$225.00",
                              insurancePaid: "$180.00",
                              patientPaid: "$45.00",
                              status: "Paid",
                            },
                          ].map((invoice, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-blue-700">
                                <Link href={`/dashboard/billing/invoices/${invoice.id}`}>{invoice.id}</Link>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{invoice.date}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{invoice.service}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{invoice.amount}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                {invoice.insurancePaid}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                {invoice.patientPaid}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <Badge
                                  className={`${invoice.status === "Paid"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : invoice.status === "Pending"
                                      ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                      : "bg-red-100 text-red-800 hover:bg-red-100"
                                    }`}
                                >
                                  {invoice.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
