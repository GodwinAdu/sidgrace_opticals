"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    FileText,
    Stethoscope,
    Microscope,
    ImageIcon,
    ClipboardList,
    Activity,
    Pill,
    Eye,
    AlertTriangle,
    Save,
    Printer,
    Download,
    Scissors,
    Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import HistoryTab from "./history-tab"
import PhysicalExamTab from "./physical-exams-tab"
import DiagnosisTab from "./diagnosis-tab"
import LabReportTab from "./lab-report-tab"
import ScanTab from "./scan-tab"
import DoctorNotesTab from "./doctor-note-tab"
import NurseNotesTab from "./nurses-note-tab"
import VitalsTab from "./vitals-tab"
import TreatmentPlanTab from "./treatment-plan"
import MedicationsTab from "./medications-tab"
import SurgicalNotesTab from "./surgical-notes-tab"
import ProceduresTab from "./procedures-tab"
import EyeTestTab from "./eye-test-tab"
import { calculateAge } from "@/lib/utils"

// Define the attendance data structure based on the Mongoose schema
interface AttendanceData {
    patientId: string
    eyeTest: {
        visualAcuity: string
        colorVision: string
        intraocularPressure: string
        remarks: string
    }
    vitals: {
        temperature: number | null
        pulse: number | null
        bloodPressure: string
        respiratoryRate: number | null
        weight: number | null
        height: number | null
        bmi: number | null
    }
    history: {
        presentingComplaints: string
        pastMedicalHistory: string
        familyHistory: string
        drugHistory: string
    }
    physicExam: {
        general: string
        cardiovascular: string
        respiratory: string
        gastrointestinal: string
        nervousSystem: string
    }
    diagnosis: {
        primary: string
        secondary: string[]
    }
    scan: any
    doctorNote: string | null
    nurseNote: string | null
    drugs: {
        name: string
        dosage: string
        frequency: string
        duration: string
    }[]
    labReport: any
    plan: {
        treatment: string
        followUp: string
    }
    surgicalNote: string
    procedures: {
        name: string
        date: string
        notes: string
    }[]
    status: "pending" | "ongoing" | "completed" | "cancelled"
    visitType: "outpatient" | "inpatient" | "emergency"
}

interface PatientRecordProps {
    attendance: AttendanceData
}

// Default empty attendance data
const defaultAttendanceData: AttendanceData = {
    patientId: "",
    eyeTest: {
        visualAcuity: "",
        colorVision: "",
        intraocularPressure: "",
        remarks: "",
    },
    vitals: {
        temperature: null,
        pulse: null,
        bloodPressure: "",
        respiratoryRate: null,
        weight: null,
        height: null,
        bmi: null,
    },
    history: {
        presentingComplaints: "",
        pastMedicalHistory: "",
        familyHistory: "",
        drugHistory: "",
    },
    physicExam: {
        general: "",
        cardiovascular: "",
        respiratory: "",
        gastrointestinal: "",
        nervousSystem: "",
    },
    diagnosis: {
        primary: "",
        secondary: [],
    },
    scan: {},
    doctorNote: null,
    nurseNote: null,
    drugs: [],
    labReport: {},
    plan: {
        treatment: "",
        followUp: "",
    },
    surgicalNote: "",
    procedures: [],
    status: "pending",
    visitType: "outpatient",
}

export default function PatientRecord({ attendance }: PatientRecordProps) {
    const [activeTab, setActiveTab] = useState("history")
    const [attendanceData, setAttendanceData] = useState<AttendanceData>(defaultAttendanceData)

    // Initialize state with the passed attendance data
    useEffect(() => {
        if (attendance) {
            setAttendanceData({
                ...defaultAttendanceData,
                ...attendance,
                // Ensure nested objects are properly merged
                eyeTest: { ...defaultAttendanceData.eyeTest, ...attendance.eyeTest },
                vitals: { ...defaultAttendanceData.vitals, ...attendance.vitals },
                history: { ...defaultAttendanceData.history, ...attendance.history },
                physicExam: { ...defaultAttendanceData.physicExam, ...attendance.physicExam },
                diagnosis: { ...defaultAttendanceData.diagnosis, ...attendance.diagnosis },
                plan: { ...defaultAttendanceData.plan, ...attendance.plan },
            })
        }
    }, [attendance])

    // Handler functions for each tab's data
    const handleEyeTestSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, eyeTest: data }))
    }

    const handleVitalsSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, vitals: data }))
    }

    const handleHistorySave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, history: data }))
    }

    const handlePhysicalExamSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, physicExam: data }))
    }

    const handleDiagnosisSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, diagnosis: data }))
    }

    const handleScanSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, scan: data }))
    }

    const handleDoctorNotesSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, doctorNote: data.doctorNote }))
    }

    const handleNurseNotesSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, nurseNote: data.nurseNote }))
    }

    const handleMedicationsSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, drugs: data }))
    }

    const handleLabReportSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, labReport: data }))
    }

    const handleTreatmentPlanSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, plan: data }))
    }

    const handleSurgicalNotesSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, surgicalNote: data.surgicalNote }))
    }

    const handleProceduresSave = (data: any) => {
        setAttendanceData((prev) => ({ ...prev, procedures: data }))
    }

    // Function to handle saving all attendance data
    const handleSaveRecord = () => {
        console.log("Saving attendance record:", attendanceData)
        // Here you would typically call an API to save the data
        // Example: await saveAttendanceRecord(attendanceData)
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Quick Actions Bar */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 py-2">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <div className="hidden md:flex items-center gap-2">
                        <Badge variant="outline" className="flex gap-1 items-center">
                            <Clock className="h-3 w-3" />
                            Last updated: 5 min ago
                        </Badge>
                        <Badge variant="secondary">Patient ID: {attendanceData.patientId.patientId || "303702"}</Badge>
                        <Badge
                            variant="outline"
                            className={`
                            ${attendanceData.status === "completed" ? "bg-green-100 text-green-800" : ""}
                            ${attendanceData.status === "ongoing" ? "bg-blue-100 text-blue-800" : ""}
                            ${attendanceData.status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
                            ${attendanceData.status === "cancelled" ? "bg-red-100 text-red-800" : ""}
                        `}
                        >
                            Status: {attendanceData.status}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Patient Info */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="container mx-auto px-4 py-4">
                    <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
                        <CardHeader className="bg-gray-100 dark:bg-gray-700 pb-2">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-blue-500">
                                        <AvatarImage src="/placeholder.svg?height=40&width=40&query=patient avatar" alt="Patient" />
                                        <AvatarFallback>{attendanceData.patientId.fullName && attendanceData.patientId.fullName[0]}{attendanceData.patientId.fullName && attendanceData.patientId.fullName[1]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                            {attendanceData.patientId.fullName}
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{attendanceData.patientId.gender} • {calculateAge(attendanceData.patientId.dob)} years</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                   
                                    <Badge
                                        variant="outline"
                                        className="text-blue-800 border-blue-800 dark:text-blue-300 dark:border-blue-500"
                                    >
                                        Date: {attendanceData.date ? new Date(attendanceData.date).toLocaleDateString() : "N/A"}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div></div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium dark:text-gray-300">Type of Service</Label>
                                        <RadioGroup
                                            value={attendanceData.visitType}
                                            onValueChange={(value) => setAttendanceData((prev) => ({ ...prev, visitType: value as any }))}
                                            className="flex flex-wrap gap-4 pt-2"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="outpatient" id="outpatient" />
                                                <Label htmlFor="outpatient" className="dark:text-gray-300">
                                                    Outpatient
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="inpatient" id="inpatient" />
                                                <Label htmlFor="inpatient" className="dark:text-gray-300">
                                                    Inpatient
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="emergency" id="emergency" />
                                                <Label htmlFor="emergency" className="dark:text-gray-300">
                                                    Emergency
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="flex flex-wrap justify-between items-center pt-2 gap-4">
                                        <div>
                                            <Label htmlFor="visit-type" className="dark:text-gray-300">
                                                Type of Visit
                                            </Label>
                                            <Select defaultValue="cash">
                                                <SelectTrigger className="w-32 bg-white dark:bg-gray-700 dark:text-gray-300">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">CASH</SelectItem>
                                                    <SelectItem value="insurance">INSURANCE</SelectItem>
                                                    <SelectItem value="nhis">NHIS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="balance" className="dark:text-gray-300">
                                                BALANCE
                                            </Label>
                                            <Input id="balance" className="w-32 bg-white dark:bg-gray-700 dark:text-gray-300" />
                                        </div>
                                    </div>
                                </div>
                                <div className="mx-auto">
                                    <ScrollArea className="h-24 w-56">
                                        <div className="">20/08/24</div>
                                        <div className="">20/08/24</div>
                                        <div className="">20/08/24</div>
                                        <div className="">20/08/24</div>
                                        <div className="">20/08/24</div>
                                        <div className="">20/08/24</div>
                                        <div className="">20/08/24</div>
                                    </ScrollArea>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="w-full max-w-full">
                        {/* Main Tabs */}
                        <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            {/* Tab Navigation */}
                            <div className="mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <TabsList className="bg-blue-50 dark:bg-gray-700 p-1 rounded-md h-auto flex-wrap">
                                        <TabsTrigger
                                            value="history"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <FileText className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">History</span>
                                            <span className="inline sm:hidden">Hist</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="physic-exam"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <Stethoscope className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Physical Exam</span>
                                            <span className="inline sm:hidden">Exam</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="diagnosis"
                                            className="data-[state=active]:bg-red-200 dark:data-[state=active]:bg-red-900"
                                        >
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Diagnosis</span>
                                            <span className="inline sm:hidden">Diag</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="lab-report"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <Microscope className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Lab Report</span>
                                            <span className="inline sm:hidden">Lab</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="scan"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Scan/Image</span>
                                            <span className="inline sm:hidden">Scan</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="dr-notes"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <ClipboardList className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Dr's Notes</span>
                                            <span className="inline sm:hidden">Dr</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="nurse-notes"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <ClipboardList className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Nurse's Notes</span>
                                            <span className="inline sm:hidden">Nurse</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="vitals"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <Activity className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Vitals</span>
                                            <span className="inline sm:hidden">Vitals</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="medications"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <Pill className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Medications</span>
                                            <span className="inline sm:hidden">Meds</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="treatment-plan"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <ClipboardList className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Treatment Plan</span>
                                            <span className="inline sm:hidden">Plan</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="surgical-notes"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <Scissors className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Surgical Notes</span>
                                            <span className="inline sm:hidden">Surgery</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="eye-test"
                                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Eye Test</span>
                                            <span className="inline sm:hidden">Eye</span>
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </div>

                            {/* Tab Contents */}
                            <TabsContent value="history" className="mt-4 px-0">
                                <HistoryTab initialData={attendanceData.history} onSave={handleHistorySave} />
                            </TabsContent>

                            <TabsContent value="physic-exam" className="mt-4 px-0">
                                <PhysicalExamTab initialData={attendanceData.physicExam} onSave={handlePhysicalExamSave} />
                            </TabsContent>

                            <TabsContent value="diagnosis" className="mt-4 px-0">
                                <DiagnosisTab initialData={attendanceData.diagnosis} onSave={handleDiagnosisSave} />
                            </TabsContent>

                            <TabsContent value="lab-report" className="mt-4 px-0">
                                <LabReportTab initialData={attendanceData.labReport} onSave={handleLabReportSave} />
                            </TabsContent>

                            <TabsContent value="scan" className="mt-4 px-0">
                                <ScanTab initialData={attendanceData.scan} onSave={handleScanSave} />
                            </TabsContent>

                            <TabsContent value="dr-notes" className="mt-4 px-0">
                                <DoctorNotesTab
                                    initialData={{ doctorNote: attendanceData.doctorNote || "" }}
                                    onSave={handleDoctorNotesSave}
                                />
                            </TabsContent>

                            <TabsContent value="nurse-notes" className="mt-4 px-0">
                                <NurseNotesTab
                                    initialData={{ nurseNote: attendanceData.nurseNote || "" }}
                                    onSave={handleNurseNotesSave}
                                />
                            </TabsContent>

                            <TabsContent value="vitals" className="mt-4 px-0">
                                <VitalsTab initialData={attendanceData.vitals} onSave={handleVitalsSave} />
                            </TabsContent>

                            <TabsContent value="medications" className="mt-4 px-0">
                                <MedicationsTab initialData={attendanceData.drugs} onSave={handleMedicationsSave} />
                            </TabsContent>

                            <TabsContent value="treatment-plan" className="mt-4 px-0">
                                <TreatmentPlanTab initialData={attendanceData.plan} onSave={handleTreatmentPlanSave} />
                            </TabsContent>

                            <TabsContent value="surgical-notes" className="mt-4 px-0">
                                <SurgicalNotesTab
                                    initialData={{ surgicalNote: attendanceData.surgicalNote }}
                                    onSave={handleSurgicalNotesSave}
                                />
                            </TabsContent>

                            <TabsContent value="procedures" className="mt-4 px-0">
                                <ProceduresTab initialData={attendanceData.procedures} onSave={handleProceduresSave} />
                            </TabsContent>

                            <TabsContent value="eye-test" className="mt-4 px-0">
                                <EyeTestTab initialData={attendanceData.eyeTest} onSave={handleEyeTestSave} />
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Footer with action buttons */}
                    <div className="flex flex-wrap justify-between mt-6 mb-6 gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" className="gap-2">
                                <Printer className="h-4 w-4" />
                                <span className="hidden sm:inline">Print Record</span>
                                <span className="inline sm:hidden">Print</span>
                            </Button>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Export PDF</span>
                                <span className="inline sm:hidden">Export</span>
                            </Button>
                        </div>
                        <Button
                            onClick={handleSaveRecord}
                            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
