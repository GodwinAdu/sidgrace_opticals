"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  LineChart,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Share2,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"
import { toast } from "sonner"

// Type definitions
interface Medication {
  id: string
  name: string
  dose: string
  frequency: string
  route: string
  startDate: string
  endDate?: string
  prescribedBy: string
  status: "active" | "discontinued" | "completed"
  instructions?: string
  quantity: number
  unit: string
  refills: number
}

interface VitalSign {
  date: string
  temperature: number
  systolicBP: number
  diastolicBP: number
  pulse: number
  respiratoryRate: number
  oxygenSaturation: number
  weight: number
  height: number
  bmi: number
}

interface LabResult {
  id: string
  date: string
  test: string
  result: string
  unit: string
  referenceRange: string
  status: "normal" | "abnormal" | "critical"
  notes?: string
  orderedBy: string
}

interface Visit {
  id: string
  date: string
  time: string
  type: string
  provider: string
  reason: string
  diagnosis: string[]
  notes: string
  followUp?: string
}

interface Patient {
  id: string
  name: string
  age: number
  dob: string
  gender: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
  contact: string
  email: string
  address: string
  insurance: string
  policyNumber: string
  emergencyContact: string
  registrationDate: string
  lastVisit: string
  status: "Active" | "Inactive"
}

export default function PatientHistoryPage({ params }: { params: { id: string } }) {
  const patientId = params.id
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState("all")
  const [showDiscontinued, setShowDiscontinued] = useState(false)
  const [vitalSignsTimeframe, setVitalSignsTimeframe] = useState("6m")

  // Patient data - would normally be fetched from an API
  const [patient, setPatient] = useState<Patient>({
    id: patientId,
    name: "John Smith",
    age: 45,
    dob: "1978-06-15",
    gender: "Male",
    bloodType: "O+",
    allergies: ["Penicillin", "Pollen"],
    chronicConditions: ["Hypertension", "Type 2 Diabetes"],
    contact: "+1 (555) 123-4567",
    email: "john.smith@example.com",
    address: "123 Main Street, Anytown, CA 12345",
    insurance: "Blue Cross Blue Shield",
    policyNumber: "BCBS-123456789",
    emergencyContact: "Mary Smith (Wife) - +1 (555) 987-6543",
    registrationDate: "2020-03-10",
    lastVisit: "2023-04-15",
    status: "Active",
  })

  // Medications data
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "MED-001",
      name: "Lumigan 0.01% (Bimatoprost)",
      dose: "1 drop",
      frequency: "Once daily at bedtime",
      route: "Ophthalmic",
      startDate: "2023-04-15",
      prescribedBy: "Dr. Sarah Johnson",
      status: "active",
      instructions: "Apply one drop in the affected eye(s) once daily in the evening",
      quantity: 2.5,
      unit: "ml",
      refills: 3,
    },
    {
      id: "MED-002",
      name: "Artificial Tears",
      dose: "1-2 drops",
      frequency: "4-6 times daily",
      route: "Ophthalmic",
      startDate: "2023-04-15",
      prescribedBy: "Dr. Sarah Johnson",
      status: "active",
      instructions: "Use as needed for dry eyes",
      quantity: 10,
      unit: "ml",
      refills: 5,
    },
    {
      id: "MED-003",
      name: "Pataday (Olopatadine 0.2%)",
      dose: "1 drop",
      frequency: "Twice daily",
      route: "Ophthalmic",
      startDate: "2023-01-22",
      endDate: "2023-02-22",
      prescribedBy: "Dr. Michael Chen",
      status: "completed",
      instructions: "For allergic conjunctivitis. Discontinue use and contact doctor if irritation worsens.",
      quantity: 5,
      unit: "ml",
      refills: 0,
    },
    {
      id: "MED-004",
      name: "Metformin",
      dose: "500mg",
      frequency: "Twice daily with meals",
      route: "Oral",
      startDate: "2022-08-10",
      prescribedBy: "Dr. Lisa Wong",
      status: "active",
      instructions: "Take with food to minimize GI side effects",
      quantity: 60,
      unit: "tablets",
      refills: 2,
    },
    {
      id: "MED-005",
      name: "Lisinopril",
      dose: "10mg",
      frequency: "Once daily",
      route: "Oral",
      startDate: "2022-08-10",
      prescribedBy: "Dr. Lisa Wong",
      status: "active",
      instructions: "Take in the morning",
      quantity: 30,
      unit: "tablets",
      refills: 2,
    },
  ])

  // Vital signs data with historical records for charting
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([
    {
      date: "2023-04-15",
      temperature: 36.7,
      systolicBP: 128,
      diastolicBP: 82,
      pulse: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      weight: 82.5,
      height: 180,
      bmi: 25.5,
    },
    {
      date: "2023-01-22",
      temperature: 36.5,
      systolicBP: 130,
      diastolicBP: 84,
      pulse: 76,
      respiratoryRate: 18,
      oxygenSaturation: 97,
      weight: 83.2,
      height: 180,
      bmi: 25.7,
    },
    {
      date: "2022-10-05",
      temperature: 36.6,
      systolicBP: 132,
      diastolicBP: 86,
      pulse: 74,
      respiratoryRate: 17,
      oxygenSaturation: 98,
      weight: 84.1,
      height: 180,
      bmi: 26.0,
    },
    {
      date: "2022-07-12",
      temperature: 36.8,
      systolicBP: 136,
      diastolicBP: 88,
      pulse: 78,
      respiratoryRate: 18,
      oxygenSaturation: 97,
      weight: 85.3,
      height: 180,
      bmi: 26.3,
    },
    {
      date: "2022-04-18",
      temperature: 36.7,
      systolicBP: 138,
      diastolicBP: 90,
      pulse: 80,
      respiratoryRate: 18,
      oxygenSaturation: 96,
      weight: 86.2,
      height: 180,
      bmi: 26.6,
    },
    {
      date: "2022-01-25",
      temperature: 36.6,
      systolicBP: 140,
      diastolicBP: 92,
      pulse: 82,
      respiratoryRate: 19,
      oxygenSaturation: 96,
      weight: 87.0,
      height: 180,
      bmi: 26.9,
    },
  ])

  // Lab results data
  const [labResults, setLabResults] = useState<LabResult[]>([
    {
      id: "LAB-001",
      date: "2023-04-15",
      test: "Intraocular Pressure - Right Eye",
      result: "16",
      unit: "mmHg",
      referenceRange: "10-21",
      status: "normal",
      orderedBy: "Dr. Sarah Johnson",
    },
    {
      id: "LAB-002",
      date: "2023-04-15",
      test: "Intraocular Pressure - Left Eye",
      result: "15",
      unit: "mmHg",
      referenceRange: "10-21",
      status: "normal",
      orderedBy: "Dr. Sarah Johnson",
    },
    {
      id: "LAB-003",
      date: "2023-04-15",
      test: "Visual Acuity - Right Eye",
      result: "20/40",
      unit: "",
      referenceRange: "20/20",
      status: "abnormal",
      orderedBy: "Dr. Sarah Johnson",
    },
    {
      id: "LAB-004",
      date: "2023-04-15",
      test: "Visual Acuity - Left Eye",
      result: "20/30",
      unit: "",
      referenceRange: "20/20",
      status: "abnormal",
      orderedBy: "Dr. Sarah Johnson",
    },
    {
      id: "LAB-005",
      date: "2023-01-22",
      test: "Tear Film Break-up Time",
      result: "8",
      unit: "seconds",
      referenceRange: ">10",
      status: "abnormal",
      notes: "Reduced tear film stability",
      orderedBy: "Dr. Michael Chen",
    },
    {
      id: "LAB-006",
      date: "2022-08-10",
      test: "HbA1c",
      result: "7.2",
      unit: "%",
      referenceRange: "<7.0",
      status: "abnormal",
      notes: "Slightly elevated, consistent with diabetes diagnosis",
      orderedBy: "Dr. Lisa Wong",
    },
    {
      id: "LAB-007",
      date: "2022-08-10",
      test: "Fasting Blood Glucose",
      result: "142",
      unit: "mg/dL",
      referenceRange: "70-100",
      status: "abnormal",
      orderedBy: "Dr. Lisa Wong",
    },
  ])

  // Visit history data
  const [visits, setVisits] = useState<Visit[]>([
    {
      id: "VST-001",
      date: "2023-04-15",
      time: "10:30 AM",
      type: "Regular Eye Examination",
      provider: "Dr. Sarah Johnson",
      reason: "Annual eye check-up",
      diagnosis: ["Mild Myopia"],
      notes:
        "Patient reports occasional eye strain when using computer for extended periods. Recommended 20-20-20 rule and updated prescription for corrective lenses.",
      followUp: "1 year",
    },
    {
      id: "VST-002",
      date: "2023-01-22",
      time: "2:15 PM",
      type: "Consultation",
      provider: "Dr. Michael Chen",
      reason: "Eye irritation",
      diagnosis: ["Allergic Conjunctivitis"],
      notes:
        "Patient presents with redness and itching in both eyes. Conjunctival inflammation observed. No corneal involvement. Prescribed antihistamine eye drops and advised to avoid known allergens.",
      followUp: "2 weeks if symptoms persist",
    },
    {
      id: "VST-003",
      date: "2022-10-05",
      time: "9:45 AM",
      type: "Eye Examination",
      provider: "Dr. Sarah Johnson",
      reason: "Vision check",
      diagnosis: ["Stable Myopia"],
      notes: "No change in prescription needed. Continue with current corrective lenses.",
      followUp: "6 months",
    },
    {
      id: "VST-004",
      date: "2022-08-10",
      time: "11:00 AM",
      type: "Primary Care Visit",
      provider: "Dr. Lisa Wong",
      reason: "Annual physical",
      diagnosis: ["Hypertension", "Type 2 Diabetes"],
      notes:
        "Patient diagnosed with hypertension and type 2 diabetes. Started on medication and lifestyle modifications. Referred to nutritionist and diabetes educator.",
      followUp: "3 months",
    },
  ])

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Filter medications based on status
  const filteredMedications = medications.filter((med) => {
    if (showDiscontinued) {
      return true
    }
    return med.status === "active"
  })

  // Filter vital signs based on selected timeframe
  const filteredVitalSigns = () => {
    if (vitalSignsTimeframe === "all") return vitalSigns

    const now = new Date()
    const monthsAgo = Number.parseInt(vitalSignsTimeframe.replace("m", ""))
    const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo))

    return vitalSigns.filter((vs) => new Date(vs.date) >= cutoffDate)
  }

  // Format vital signs data for charts
  const vitalSignsChartData = filteredVitalSigns()
    .map((vs) => ({
      date: format(new Date(vs.date), "MMM d, yyyy"),
      systolic: vs.systolicBP,
      diastolic: vs.diastolicBP,
      pulse: vs.pulse,
      weight: vs.weight,
      bmi: vs.bmi,
    }))
    .reverse()

  // Handle refresh data
  const handleRefreshData = () => {
    toast({
      title: "Refreshing data",
      description: "Fetching the latest patient information...",
    })

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Data refreshed",
        description: "Patient information is now up to date.",
      })
    }, 1500)
  }

  // Handle print patient summary
  const handlePrintSummary = () => {
    toast({
      title: "Preparing document",
      description: "Generating patient summary for printing...",
    })

    // In a real app, this would trigger a print dialog with a formatted document
    setTimeout(() => {
      window.print()
    }, 1000)
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
            <h1 className="text-2xl font-bold text-blue-900">Patient History: {patient.name}</h1>
            <Badge
              className={`ml-2 ${
                patient.status === "Active"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }`}
            >
              {patient.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleRefreshData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh Data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" size="sm" onClick={handlePrintSummary}>
              <Printer className="h-4 w-4 mr-1" />
              Print Summary
            </Button>

            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>

            <Button
              className="bg-blue-700 hover:bg-blue-800"
              size="sm"
              onClick={() => router.push(`/dashboard/patients/${patientId}/add-medical-record`)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </div>
        </div>

        {/* Patient summary card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Patient Summary</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-blue-700 hover:text-blue-800 p-0"
                onClick={() => router.push(`/dashboard/patients/${patientId}`)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Full Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h3>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span>
                      {patient.name}, {patient.age} ({patient.gender})
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>DOB: {format(new Date(patient.dob), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Last Visit: {format(new Date(patient.lastVisit), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Medical Information</h3>
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-700">Blood Type: </span>
                    <span className="font-medium">{patient.bloodType}</span>
                  </div>
                  <div>
                    <span className="text-gray-700">Allergies: </span>
                    <span className="font-medium">{patient.allergies.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-gray-700">Chronic Conditions: </span>
                    <span className="font-medium">{patient.chronicConditions.join(", ")}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Latest Vital Signs</h3>
                <div className="space-y-1">
                  {vitalSigns.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-x-4">
                        <div>
                          <span className="text-gray-700">BP: </span>
                          <span className="font-medium">
                            {vitalSigns[0].systolicBP}/{vitalSigns[0].diastolicBP} mmHg
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-700">Pulse: </span>
                          <span className="font-medium">{vitalSigns[0].pulse} bpm</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4">
                        <div>
                          <span className="text-gray-700">Weight: </span>
                          <span className="font-medium">{vitalSigns[0].weight} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-700">BMI: </span>
                          <span className="font-medium">{vitalSigns[0].bmi}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-700">Recorded: </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(vitalSigns[0].date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
            <TabsTrigger value="labs">Lab Results</TabsTrigger>
            <TabsTrigger value="visits">Visit History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Medications */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Current Medications</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-blue-700 hover:text-blue-800 p-0"
                      onClick={() => setActiveTab("medications")}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredMedications
                      .filter((med) => med.status === "active")
                      .slice(0, 3)
                      .map((medication, index) => (
                        <div key={medication.id} className="border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{medication.name}</p>
                              <p className="text-sm text-gray-500">
                                {medication.dose}, {medication.frequency} ({medication.route})
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Started: {format(new Date(medication.startDate), "MMM d, yyyy")}
                          </div>
                        </div>
                      ))}

                    {filteredMedications.filter((med) => med.status === "active").length === 0 && (
                      <div className="text-center py-4 text-gray-500">No active medications</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Lab Results */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Recent Lab Results</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-blue-700 hover:text-blue-800 p-0"
                      onClick={() => setActiveTab("labs")}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {labResults.slice(0, 3).map((lab, index) => (
                      <div key={lab.id} className="border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{lab.test}</p>
                            <p className="text-sm text-gray-500">
                              Result:{" "}
                              <span
                                className={`font-medium ${
                                  lab.status === "normal"
                                    ? "text-green-600"
                                    : lab.status === "abnormal"
                                      ? "text-amber-600"
                                      : "text-red-600"
                                }`}
                              >
                                {lab.result} {lab.unit}
                              </span>{" "}
                              (Reference: {lab.referenceRange})
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">{format(new Date(lab.date), "MMM d, yyyy")}</div>
                        </div>
                      </div>
                    ))}

                    {labResults.length === 0 && (
                      <div className="text-center py-4 text-gray-500">No lab results available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vital Signs Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Vital Signs Trends</CardTitle>
                <CardDescription>Historical tracking of key vital measurements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={vitalSignsChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="systolic"
                        name="Systolic BP"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#82ca9d" />
                      <Line yAxisId="left" type="monotone" dataKey="pulse" name="Pulse" stroke="#ff7300" />
                      <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#0088fe" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="timeframe" className="text-sm">
                      Timeframe:
                    </Label>
                    <Select value={vitalSignsTimeframe} onValueChange={setVitalSignsTimeframe}>
                      <SelectTrigger className="w-[120px]" id="timeframe">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3m">3 Months</SelectItem>
                        <SelectItem value="6m">6 Months</SelectItem>
                        <SelectItem value="12m">1 Year</SelectItem>
                        <SelectItem value="24m">2 Years</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Visits */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Visits</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-700 hover:text-blue-800 p-0"
                    onClick={() => setActiveTab("visits")}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visits.slice(0, 3).map((visit, index) => (
                    <div key={visit.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{visit.type}</p>
                          <p className="text-sm text-gray-500">
                            {visit.provider} • {visit.reason}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">{format(new Date(visit.date), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium">Diagnosis:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {visit.diagnosis.map((dx, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {dx}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
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
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>Medication History</CardTitle>
                    <CardDescription>Current and past medications</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input type="search" placeholder="Search medications..." className="w-full pl-8" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="show-discontinued" checked={showDiscontinued} onCheckedChange={setShowDiscontinued} />
                      <Label htmlFor="show-discontinued">Show discontinued</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 bg-slate-50 p-3 text-sm font-medium text-slate-900">
                    <div className="col-span-4">Medication</div>
                    <div className="col-span-2">Dosage</div>
                    <div className="col-span-2">Started</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  {filteredMedications.map((medication, index) => (
                    <div
                      key={medication.id}
                      className={`grid grid-cols-12 p-3 text-sm ${
                        index !== filteredMedications.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className="col-span-4">
                        <div className="font-medium">{medication.name}</div>
                        <div className="text-slate-500">{medication.route}</div>
                      </div>
                      <div className="col-span-2">
                        <div>{medication.dose}</div>
                        <div className="text-slate-500">{medication.frequency}</div>
                      </div>
                      <div className="col-span-2">{format(new Date(medication.startDate), "MMM d, yyyy")}</div>
                      <div className="col-span-2">
                        <Badge
                          className={`${
                            medication.status === "active"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : medication.status === "completed"
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          }`}
                        >
                          {medication.status.charAt(0).toUpperCase() + medication.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </DropdownMenuItem>
                            {medication.status === "active" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Discontinue</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}

                  {filteredMedications.length === 0 && (
                    <div className="p-4 text-center text-gray-500">No medications found</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medication Timeline</CardTitle>
                <CardDescription>Visual history of medication usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* This would be a timeline visualization in a real app */}
                  <div className="flex flex-col space-y-8 py-4">
                    {medications.map((medication, index) => (
                      <div key={medication.id} className="relative flex items-center">
                        <div className="absolute left-0 h-full w-0.5 bg-gray-200" />
                        <div
                          className={`absolute left-0 h-4 w-4 -translate-x-1.5 rounded-full border-2 border-white ${
                            medication.status === "active"
                              ? "bg-green-500"
                              : medication.status === "completed"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                          }`}
                        />
                        <div className="ml-6">
                          <div className="font-medium">{medication.name}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(medication.startDate), "MMM d, yyyy")} -{" "}
                            {medication.endDate ? format(new Date(medication.endDate), "MMM d, yyyy") : "Present"}
                          </div>
                          <div className="mt-1 text-sm">
                            {medication.dose}, {medication.frequency} ({medication.route})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vital Signs Tab */}
          <TabsContent value="vitals" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>Vital Signs History</CardTitle>
                    <CardDescription>Tracking of vital measurements over time</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="chart-timeframe" className="text-sm">
                      Chart timeframe:
                    </Label>
                    <Select value={vitalSignsTimeframe} onValueChange={setVitalSignsTimeframe}>
                      <SelectTrigger className="w-[120px]" id="chart-timeframe">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3m">3 Months</SelectItem>
                        <SelectItem value="6m">6 Months</SelectItem>
                        <SelectItem value="12m">1 Year</SelectItem>
                        <SelectItem value="24m">2 Years</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Blood Pressure Chart */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Blood Pressure & Pulse</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={vitalSignsChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="systolic"
                          name="Systolic BP"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                        <Line type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#82ca9d" />
                        <Line type="monotone" dataKey="pulse" name="Pulse" stroke="#ff7300" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Weight & BMI Chart */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Weight & BMI</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={vitalSignsChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <RechartsTooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#0088fe" />
                        <Line yAxisId="right" type="monotone" dataKey="bmi" name="BMI" stroke="#00C49F" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Vital Signs Table */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Vital Signs Records</h3>
                  <div className="rounded-md border">
                    <div className="grid grid-cols-9 bg-slate-50 p-3 text-sm font-medium text-slate-900">
                      <div className="col-span-1">Date</div>
                      <div className="col-span-1">BP (mmHg)</div>
                      <div className="col-span-1">Pulse (bpm)</div>
                      <div className="col-span-1">Resp Rate</div>
                      <div className="col-span-1">Temp (°C)</div>
                      <div className="col-span-1">O₂ Sat (%)</div>
                      <div className="col-span-1">Weight (kg)</div>
                      <div className="col-span-1">Height (cm)</div>
                      <div className="col-span-1">BMI</div>
                    </div>
                    {vitalSigns.map((vs, index) => (
                      <div
                        key={vs.date}
                        className={`grid grid-cols-9 p-3 text-sm ${index !== vitalSigns.length - 1 ? "border-b" : ""}`}
                      >
                        <div className="col-span-1">{format(new Date(vs.date), "MM/dd/yyyy")}</div>
                        <div className="col-span-1">
                          {vs.systolicBP}/{vs.diastolicBP}
                        </div>
                        <div className="col-span-1">{vs.pulse}</div>
                        <div className="col-span-1">{vs.respiratoryRate}</div>
                        <div className="col-span-1">{vs.temperature}</div>
                        <div className="col-span-1">{vs.oxygenSaturation}</div>
                        <div className="col-span-1">{vs.weight}</div>
                        <div className="col-span-1">{vs.height}</div>
                        <div className="col-span-1">{vs.bmi}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lab Results Tab */}
          <TabsContent value="labs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>Laboratory Results</CardTitle>
                    <CardDescription>Complete history of laboratory tests</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input type="search" placeholder="Search lab results..." className="w-full pl-8" />
                    </div>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="3m">Last 3 Months</SelectItem>
                        <SelectItem value="6m">Last 6 Months</SelectItem>
                        <SelectItem value="1y">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-12 bg-slate-50 p-3 text-sm font-medium text-slate-900">
                    <div className="col-span-3">Test</div>
                    <div className="col-span-2">Result</div>
                    <div className="col-span-2">Reference Range</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  {labResults.map((lab, index) => (
                    <div
                      key={lab.id}
                      className={`grid grid-cols-12 p-3 text-sm ${index !== labResults.length - 1 ? "border-b" : ""}`}
                    >
                      <div className="col-span-3">
                        <div className="font-medium">{lab.test}</div>
                        <div className="text-slate-500">{lab.orderedBy}</div>
                      </div>
                      <div className="col-span-2">
                        <span
                          className={`font-medium ${
                            lab.status === "normal"
                              ? "text-green-600"
                              : lab.status === "abnormal"
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {lab.result}
                        </span>{" "}
                        {lab.unit}
                      </div>
                      <div className="col-span-2">{lab.referenceRange}</div>
                      <div className="col-span-2">
                        <Badge
                          className={`${
                            lab.status === "normal"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : lab.status === "abnormal"
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                          }`}
                        >
                          {lab.status.charAt(0).toUpperCase() + lab.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="col-span-2">{format(new Date(lab.date), "MMM d, yyyy")}</div>
                      <div className="col-span-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lab Results Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Lab Results Trends</CardTitle>
                <CardDescription>Visualization of selected lab results over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <LineChart className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                  <h3 className="text-lg font-medium">Select lab tests to visualize</h3>
                  <p className="text-sm">Choose specific lab tests to see trends over time</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visit History Tab */}
          <TabsContent value="visits" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>Visit History</CardTitle>
                    <CardDescription>Complete record of patient visits</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input type="search" placeholder="Search visits..." className="w-full pl-8" />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {visits.map((visit, index) => (
                    <div key={visit.id} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{visit.type}</h3>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{visit.id}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">Provider: {visit.provider}</p>
                        </div>
                        <div className="flex items-center mt-2 md:mt-0">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {format(new Date(visit.date), "MMM d, yyyy")} at {visit.time}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Reason for Visit</h4>
                          <p>{visit.reason}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Diagnosis</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {visit.diagnosis.map((dx, idx) => (
                              <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {dx}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                          <p className="text-sm">{visit.notes}</p>
                        </div>

                        {visit.followUp && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Follow-up</h4>
                            <p className="text-sm">{visit.followUp}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          View Full Report
                        </Button>
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
