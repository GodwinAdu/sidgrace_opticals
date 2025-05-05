import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar, Download, Edit, Eye, FileText, Filter, Plus, Printer, Search, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function MedicalRecordsPage({ params }: { params: { id: string } }) {
  const patientId = params.id

  // This would normally be fetched from a database
  const patient = {
    id: patientId,
    name: "John Smith",
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Back button and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Link href={`/dashboard/patients/${patientId}`}>
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Patient
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-blue-900">Medical Records: {patient.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Import Records
            </Button>
            <Button className="bg-blue-700 hover:bg-blue-800" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input type="search" placeholder="Search medical records..." className="w-full pl-8" />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Record Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="examination">Examinations</SelectItem>
                <SelectItem value="consultation">Consultations</SelectItem>
                <SelectItem value="procedure">Procedures</SelectItem>
                <SelectItem value="lab">Lab Results</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Medical Records Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 lg:w-auto">
            <TabsTrigger value="all">All Records</TabsTrigger>
            <TabsTrigger value="examinations">Examinations</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
            <TabsTrigger value="procedures">Procedures</TabsTrigger>
            <TabsTrigger value="lab">Lab Results</TabsTrigger>
            <TabsTrigger value="imaging">Imaging</TabsTrigger>
          </TabsList>

          {/* All Records Tab */}
          <TabsContent value="all" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Complete Medical History</CardTitle>
                <CardDescription>All medical records for {patient.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      id: "MR-2023-042",
                      date: "2023-04-15",
                      type: "Eye Examination",
                      doctor: "Dr. Sarah Johnson",
                      category: "Examination",
                      summary: "Comprehensive eye examination with updated prescription",
                    },
                    {
                      id: "MR-2023-041",
                      date: "2023-04-15",
                      type: "Prescription",
                      doctor: "Dr. Sarah Johnson",
                      category: "Prescription",
                      summary: "Updated eyeglasses prescription for myopia",
                    },
                    {
                      id: "MR-2023-015",
                      date: "2023-01-22",
                      type: "Consultation",
                      doctor: "Dr. Michael Chen",
                      category: "Consultation",
                      summary: "Allergic conjunctivitis diagnosis and treatment",
                    },
                    {
                      id: "MR-2023-014",
                      date: "2023-01-22",
                      type: "Prescription",
                      doctor: "Dr. Michael Chen",
                      category: "Prescription",
                      summary: "Antihistamine eye drops for allergic conjunctivitis",
                    },
                    {
                      id: "MR-2022-098",
                      date: "2022-10-05",
                      type: "Eye Examination",
                      doctor: "Dr. Sarah Johnson",
                      category: "Examination",
                      summary: "Routine eye examination with stable myopia",
                    },
                    {
                      id: "MR-2022-056",
                      date: "2022-05-18",
                      type: "Visual Field Test",
                      doctor: "Dr. Sarah Johnson",
                      category: "Procedure",
                      summary: "Baseline visual field test - normal results",
                    },
                  ].map((record, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row justify-between items-start border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{record.type}</h3>
                          <Badge
                            className={`${
                              record.category === "Examination"
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                : record.category === "Consultation"
                                  ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                                  : record.category === "Procedure"
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                    : record.category === "Prescription"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                            }`}
                          >
                            {record.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          ID: {record.id} • {record.doctor}
                        </p>
                        <p className="mt-1">{record.summary}</p>
                      </div>
                      <div className="flex items-center mt-2 md:mt-0">
                        <div className="flex items-center mr-4">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">{record.date}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-blue-700 hover:text-blue-800 p-0">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-blue-700 hover:text-blue-800 p-0">
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examinations Tab */}
          <TabsContent value="examinations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Eye Examinations</CardTitle>
                <CardDescription>History of all eye examinations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      id: "MR-2023-042",
                      date: "2023-04-15",
                      type: "Comprehensive Eye Examination",
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
                      id: "MR-2022-098",
                      date: "2022-10-05",
                      type: "Routine Eye Examination",
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
                  ].map((exam, index) => (
                    <div key={index} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{exam.type}</h3>
                          <p className="text-sm text-gray-500">
                            ID: {exam.id} • {exam.doctor}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">{exam.date}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Findings</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {exam.findings.map((finding, idx) => (
                              <li key={idx} className="text-gray-700">
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Recommendations</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {exam.recommendations.map((recommendation, idx) => (
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
                          <Download className="h-4 w-4 mr-1" />
                          Download
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

          {/* Diagnoses Tab */}
          <TabsContent value="diagnoses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Diagnoses</CardTitle>
                <CardDescription>History of all diagnoses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      id: "DX-2023-042",
                      date: "2023-04-15",
                      diagnosis: "Myopia (Nearsightedness)",
                      icd10: "H52.1",
                      doctor: "Dr. Sarah Johnson",
                      notes:
                        "Mild myopia in both eyes. Patient reports difficulty seeing distant objects clearly. No significant progression since last examination.",
                      treatment:
                        "Corrective lenses (updated prescription). Patient advised to take regular breaks during prolonged screen time.",
                      status: "Active",
                    },
                    {
                      id: "DX-2023-015",
                      date: "2023-01-22",
                      diagnosis: "Allergic Conjunctivitis",
                      icd10: "H10.45",
                      doctor: "Dr. Michael Chen",
                      notes:
                        "Bilateral eye redness, itching, and watering. Patient reports seasonal allergies. No corneal involvement.",
                      treatment:
                        "Antihistamine eye drops (Pataday) twice daily for 4 weeks. Cold compresses for symptomatic relief. Allergen avoidance strategies discussed.",
                      status: "Resolved",
                    },
                  ].map((diagnosis, index) => (
                    <div key={index} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{diagnosis.diagnosis}</h3>
                            <Badge
                              className={`${
                                diagnosis.status === "Active"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              }`}
                            >
                              {diagnosis.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            ID: {diagnosis.id} • ICD-10: {diagnosis.icd10} • {diagnosis.doctor}
                          </p>
                        </div>
                        <div className="flex items-center mt-2 md:mt-0">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">{diagnosis.date}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Clinical Notes</h4>
                          <p className="text-gray-700">{diagnosis.notes}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Treatment</h4>
                          <p className="text-gray-700">{diagnosis.treatment}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          View Full Report
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Update Status
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would be implemented similarly */}
        </Tabs>
      </div>
    </div>
  )
}
