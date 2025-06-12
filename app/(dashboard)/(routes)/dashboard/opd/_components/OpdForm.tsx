"use client"

import { useState, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import {
    Eye,
    Search,
    UserPlus,
    ClipboardList,
    Activity,
    Loader2,
    Check,
    Clock,
    Calendar,
    Filter,
    MoreHorizontal,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
    CheckCircle2,
    Stethoscope,
    FileText,
    Gauge,
    Thermometer,
    Heart,
    Droplets,
    TreesIcon as Lungs,
    Microscope,
    Ruler,
    Printer,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

import { toast } from "sonner"
import { fetchPatientBySearch } from "@/lib/actions/patient.actions"
import { calculateAge } from "@/lib/utils"
import { createAttendance } from "@/lib/actions/attendance.actions"


type VitalSigns = {
    bloodPressure: string
    systolic: number
    diastolic: number
    pulse: number
    temperature: number
    respiratoryRate: number
    oxygenSaturation: number
}

type EyeTest = {
    visualAcuityRight: string
    visualAcuityLeft: string
    visualAcuityRightPinhole: string
    visualAcuityLeftPinhole: string
    iopRight: number
    iopLeft: number
    colorVision: string
    contrastSensitivity: string
    pupilReaction: string
    extraocularMovements: string
    anteriorSegment: string
    posteriorSegment: string
}

type AttendancePatient = IPatient & {
    visitType: string
    vitals: VitalSigns | null
    eyeTest: EyeTest | null
    checkInTime: Date
    estimatedWaitTime: number
    status: "waiting" | "in-progress" | "completed"
}

// Form schema for vital signs
const vitalsFormSchema = z.object({
    bloodPressure: z.string().min(1, { message: "Blood pressure is required" }),
    systolic: z.coerce
        .number()
        .min(70, { message: "Systolic must be at least 70" })
        .max(250, { message: "Systolic must be less than 250" }),
    diastolic: z.coerce
        .number()
        .min(40, { message: "Diastolic must be at least 40" })
        .max(150, { message: "Diastolic must be less than 150" }),
    pulse: z.coerce
        .number()
        .min(40, { message: "Pulse must be at least 40" })
        .max(220, { message: "Pulse must be less than 220" }),
    temperature: z.coerce
        .number()
        .min(95, { message: "Temperature must be at least 95°F" })
        .max(105, { message: "Temperature must be less than 105°F" }),
    respiratoryRate: z.coerce
        .number()
        .min(8, { message: "Respiratory rate must be at least 8" })
        .max(40, { message: "Respiratory rate must be less than 40" }),
    oxygenSaturation: z.coerce
        .number()
        .min(70, { message: "Oxygen saturation must be at least 70%" })
        .max(100, { message: "Oxygen saturation must be less than 100%" }),
})

// Form schema for eye test
const eyeTestFormSchema = z.object({
    visualAcuityRight: z.string().min(1, { message: "Visual acuity for right eye is required" }),
    visualAcuityLeft: z.string().min(1, { message: "Visual acuity for left eye is required" }),
    visualAcuityRightPinhole: z.string().optional(),
    visualAcuityLeftPinhole: z.string().optional(),
    iopRight: z.coerce
        .number()
        .min(5, { message: "IOP must be at least 5" })
        .max(60, { message: "IOP must be less than 60" }),
    iopLeft: z.coerce
        .number()
        .min(5, { message: "IOP must be at least 5" })
        .max(60, { message: "IOP must be less than 60" }),
    colorVision: z.string().optional(),
    contrastSensitivity: z.string().optional(),
    pupilReaction: z.string().optional(),
    extraocularMovements: z.string().optional(),
    anteriorSegment: z.string().optional(),
    posteriorSegment: z.string().optional(),
})

// Helper function to get status badge
const getStatusBadge = (status: AttendancePatient["status"]) => {
    switch (status) {
        case "waiting":
            return (
                <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900"
                >
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting
                </Badge>
            )
        case "in-progress":
            return (
                <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900"
                >
                    <Activity className="h-3 w-3 mr-1" />
                    In Progress
                </Badge>
            )
        case "completed":
            return (
                <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900"
                >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                </Badge>
            )
    }
}

// Helper function to get priority badge
const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case "urgent":
            return (
                <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900"
                >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Urgent
                </Badge>
            )
        case "high":
            return (
                <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900"
                >
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    High
                </Badge>
            )
        default:
            return (
                <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-900"
                >
                    <Minus className="h-3 w-3 mr-1" />
                    Normal
                </Badge>
            )
    }
}

// Helper function to get trend indicator
const getTrendIndicator = (value: number, normalMin: number, normalMax: number) => {
    if (value < normalMin) {
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
    } else if (value > normalMax) {
        return <ArrowUpRight className="h-4 w-4 text-red-500" />
    } else {
        return <Check className="h-4 w-4 text-green-500" />
    }
}

export function OpdPatientManagement() {

    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Patient[]>([])
    const [attendanceList, setAttendanceList] = useState<AttendancePatient[]>([])
    const [selectedPatient, setSelectedPatient] = useState<AttendancePatient | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [isAddingToAttendance, setIsAddingToAttendance] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [sortBy, setSortBy] = useState<string>("checkInTime")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
    const [showVitalHistory, setShowVitalHistory] = useState(false)
    const [vitalHistory, setVitalHistory] = useState<VitalSigns[]>([])
    const [visitType, setVisitType] = useState("")
    const [priority, setPriority] = useState("normal")

    // Form for vital signs
    const vitalsForm = useForm<z.infer<typeof vitalsFormSchema>>({
        resolver: zodResolver(vitalsFormSchema),
        defaultValues: {
            bloodPressure: "",
            systolic: 0,
            diastolic: 0,
            pulse: 0,
            temperature: 0,
            respiratoryRate: 0,
            oxygenSaturation: 0,
        },
    })

    // Form for eye test
    const eyeTestForm = useForm<z.infer<typeof eyeTestFormSchema>>({
        resolver: zodResolver(eyeTestFormSchema),
        defaultValues: {
            visualAcuityRight: "",
            visualAcuityLeft: "",
            visualAcuityRightPinhole: "not-tested",
            visualAcuityLeftPinhole: "not-tested",
            iopRight: 0,
            iopLeft: 0,
            colorVision: "",
            contrastSensitivity: "",
            pupilReaction: "",
            extraocularMovements: "",
            anteriorSegment: "",
            posteriorSegment: "",
        },
    })


    // Search for patients
    const handleSearch = async () => {
        try {
            if (!searchQuery.trim()) {
                setSearchResults([])
                return
            }
            setIsSearching(true)

            const data = await fetchPatientBySearch(searchQuery)

            setSearchResults(data)
            toast.success("Fetch successfully")
        } catch (error) {
            console.log("Something went wrong", error)
            toast.error("Something went wrong", {
                description: "Please try again later",
            })
        } finally {
            setIsSearching(false)
            setSearchQuery("")
        }
    }

    // Add patient to attendance list
    const addToAttendance = (patient: Patient) => {
        setIsAddingToAttendance(true)

        // Check if patient is already in attendance list
        if (attendanceList.some((p) => p._id === patient._id)) {
            toast.warning("Patient already in attendance", {
                description: `${patient.fullName} is already in today's attendance list.`,
            })
            setIsAddingToAttendance(false)
            return
        }

        // Simulate API call with timeout
        setTimeout(() => {
            const attendancePatient: AttendancePatient = {
                ...patient,
                priority,
                visitType,
                vitals: null, // Ensure vitals is null for new attendance
                eyeTest: null, // Ensure eyeTest is null for new attendance
                checkInTime: new Date(),
                estimatedWaitTime: priority === "urgent" ? 5 : priority === "high" ? 15 : 30,
                status: "waiting",
            }

            const newList = [...attendanceList, attendancePatient]
            setAttendanceList(newList)
            setSearchResults([])
            setSearchQuery("")

            toast.success("Patient added to attendance", {
                description: `${patient.fullName} has been added to today's attendance list.`,
            })

            setIsAddingToAttendance(false)
        }, 500)
    }

    // Select patient to record vitals or eye test
    const selectPatient = (patient: AttendancePatient) => {
        setSelectedPatient(patient)

        // Always reset forms to empty values regardless of existing data
        vitalsForm.reset({
            bloodPressure: "",
            systolic: 0,
            diastolic: 0,
            pulse: 0,
            temperature: 0,
            respiratoryRate: 0,
            oxygenSaturation: 0,
        })

        eyeTestForm.reset({
            visualAcuityRight: "",
            visualAcuityLeft: "",
            visualAcuityRightPinhole: "not-tested",
            visualAcuityLeftPinhole: "not-tested",
            iopRight: 0,
            iopLeft: 0,
            colorVision: "",
            contrastSensitivity: "",
            pupilReaction: "",
            extraocularMovements: "",
            anteriorSegment: "",
            posteriorSegment: "",
        })
    }


    // Save both vital signs and eye test data together
    const savePatientData = async () => {
        if (!selectedPatient) return

        // Get values from both forms
        const vitalsData = vitalsForm.getValues()
        const eyeTestData = eyeTestForm.getValues()

        // Format blood pressure
        const bloodPressure = `${vitalsData.systolic}/${vitalsData.diastolic}`

        // Create vital signs object
        const vitals: VitalSigns = {
            bloodPressure,
            systolic: vitalsData.systolic,
            diastolic: vitalsData.diastolic,
            pulse: vitalsData.pulse,
            temperature: vitalsData.temperature,
            respiratoryRate: vitalsData.respiratoryRate,
            oxygenSaturation: vitalsData.oxygenSaturation,
        }

        // Create eye test object
        const eyeTest: EyeTest = {
            visualAcuityRight: eyeTestData.visualAcuityRight,
            visualAcuityLeft: eyeTestData.visualAcuityLeft,
            visualAcuityRightPinhole: eyeTestData.visualAcuityRightPinhole || "",
            visualAcuityLeftPinhole: eyeTestData.visualAcuityLeftPinhole || "",
            iopRight: eyeTestData.iopRight,
            iopLeft: eyeTestData.iopLeft,
            colorVision: eyeTestData.colorVision || "normal",
            contrastSensitivity: eyeTestData.contrastSensitivity || "normal",
            pupilReaction: eyeTestData.pupilReaction || "PERRLA",
            extraocularMovements: eyeTestData.extraocularMovements || "Full",
            anteriorSegment: eyeTestData.anteriorSegment || "",
            posteriorSegment: eyeTestData.posteriorSegment || "",
        }

        // Add to vital history if there are previous vitals
        if (selectedPatient.vitals) {
            setVitalHistory([...vitalHistory, selectedPatient.vitals])
        }

        // Create combined data object for database
        const patientAttendanceData = {
            patientId: selectedPatient._id,
            patientName: selectedPatient.fullName,
            visitType: selectedPatient.visitType,
            checkInTime: selectedPatient.checkInTime,
            vitals,
            eyeTest,
            status: "waiting",
        }
        await createAttendance(patientAttendanceData)

        // Update the patient in the attendance list
        const updatedList = attendanceList.map((p) =>
            p._id === selectedPatient._id
                ? {
                    ...p,
                    vitals,
                    eyeTest,
                    status: "completed",
                }
                : p,
        )

        setAttendanceList(updatedList)

        // Update the selected patient
        setSelectedPatient((prev) => (prev ? { ...prev, vitals, eyeTest, status: "completed" } : null))

        window.location.reload()

        toast.success("Patient data recorded", {
            description: `Vital signs and eye test results for ${selectedPatient.fullName} have been saved.`,
        })
    }


    // Filter and sort attendance list
    const filteredAttendance = attendanceList
        .filter((patient) => {
            if (filterStatus === "all") return true
            return patient.status === filterStatus
        })
        .sort((a, b) => {
            // Sort by priority first
            const priorityOrder = { urgent: 0, high: 1, normal: 2 }
            const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder]
            const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder]

            if (priorityA !== priorityB) {
                return priorityA - priorityB
            }

            // Then sort by selected criteria
            if (sortBy === "checkInTime") {
                return sortDirection === "asc"
                    ? a.checkInTime.getTime() - b.checkInTime.getTime()
                    : b.checkInTime.getTime() - a.checkInTime.getTime()
            } else if (sortBy === "name") {
                return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
            } else if (sortBy === "waitTime") {
                return sortDirection === "asc"
                    ? a.estimatedWaitTime - b.estimatedWaitTime
                    : b.estimatedWaitTime - a.estimatedWaitTime
            }
            return 0
        })

    const [localVisitType, setLocalVisitType] = useState("")
    const [localPriority, setLocalPriority] = useState("")

    const PatientSelect = useCallback(
        ({ patient }) => {
            return (
                <TableRow key={patient._id}>
                    <TableCell>{patient.fullName}</TableCell>
                    <TableCell>{calculateAge(patient?.dob)}</TableCell>
                    <TableCell>{patient.gender}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>
                        <Select onValueChange={setLocalVisitType}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New Visit</SelectItem>
                                <SelectItem value="follow-up">Follow-up</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                                <SelectItem value="procedure">Procedure</SelectItem>
                            </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>
                        <Select defaultValue={patient.priority} onValueChange={setLocalPriority}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>
                        <Button
                            size="sm"
                            onClick={() => {
                                setVisitType(localVisitType)
                                setPriority(localPriority)
                                addToAttendance(patient)
                            }}
                            disabled={isAddingToAttendance}
                        >
                            {isAddingToAttendance ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <UserPlus className="h-4 w-4 mr-1" />
                            )}
                            Add
                        </Button>
                    </TableCell>
                </TableRow>
            )
        },
        [isAddingToAttendance, addToAttendance, localPriority, localVisitType],
    )

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-end">

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[130px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Patients</SelectItem>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="checkInTime">Check-in Time</SelectItem>
                            <SelectItem value="name">Patient Name</SelectItem>
                            <SelectItem value="waitTime">Wait Time</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                    >
                        {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Patient Search and Add to Attendance */}
            <Card>
                <CardHeader className="bg-muted/40 border-b">
                    <div className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        <CardTitle>Patient Search</CardTitle>
                    </div>
                    <CardDescription>Search for registered patients and add them to today&#39;s attendance</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by Name, Folder, or phone number"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                            Search
                        </Button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">Search Results</h3>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Age</TableHead>
                                            <TableHead>Gender</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Visit Type</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {searchResults.map((patient) => (
                                            <PatientSelect key={patient._id} patient={patient} />
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attendance List and Patient Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance List */}
                <Card className="lg:col-span-1">
                    <CardHeader className="bg-muted/40 border-b">
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            <CardTitle>Today&#39;s Attendance</CardTitle>
                        </div>
                        <CardDescription>
                            {format(new Date(), "EEEE, MMMM d, yyyy")} • {filteredAttendance.length} patients
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredAttendance.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <p>No patients in attendance yet</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px]">
                                <div className="divide-y">
                                    {filteredAttendance.map((patient) => (
                                        <div
                                            key={patient._id}
                                            className={`p-4 hover:bg-muted/50 cursor-pointer ${selectedPatient?._id === patient._id ? "bg-muted/50" : ""
                                                }`}
                                            onClick={() => selectPatient(patient)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-medium">{patient.fullName}</div>
                                                {getStatusBadge(patient.status)}
                                            </div>
                                            <div className="text-sm text-muted-foreground mb-1">
                                                {calculateAge(patient.dob)} yrs • {patient.gender}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">{format(patient.checkInTime, "h:mm a")}</span>
                                                <div className="flex items-center gap-1">
                                                    {getPriorityBadge(patient.priority)}
                                                    {patient.status === "waiting" && (
                                                        <span className="text-xs text-muted-foreground">{patient.estimatedWaitTime} min wait</span>
                                                    )}
                                                </div>
                                            </div>
                                            {patient.assignedDoctor && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage
                                                            src={patient.assignedDoctor.avatar || "/placeholder.svg"}
                                                            alt={patient.assignedDoctor.name}
                                                        />
                                                        <AvatarFallback>{patient.assignedDoctor.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs">{patient.assignedDoctor.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Patient Details and Data Entry */}
                <Card className="lg:col-span-2">
                    <CardHeader className="bg-muted/40 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                <CardTitle>{selectedPatient ? `Patient: ${selectedPatient.fullName}` : "Select a Patient"}</CardTitle>
                            </div>
                            {selectedPatient && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem>
                                            <FileText className="h-4 w-4 mr-2" />
                                            View Full Record
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Printer className="h-4 w-4 mr-2" />
                                            Print Summary
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Schedule Follow-up
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        {selectedPatient && (
                            <CardDescription>
                                {calculateAge(selectedPatient.dob)} years • {selectedPatient.gender} • folder ID:{" "}
                                {selectedPatient.patientId} • {selectedPatient.visitType.replace("-", " ")} Visit
                            </CardDescription>
                        )}
                    </CardHeader>

                    {!selectedPatient ? (
                        <CardContent className="py-8 text-center text-muted-foreground">
                            <p>Select a patient from the attendance list to record vitals and eye test</p>
                        </CardContent>
                    ) : (
                        <Tabs defaultValue="vitals">
                            <TabsList className="grid grid-cols-2 mx-6 mt-4">
                                <TabsTrigger value="vitals">
                                    <Activity className="h-4 w-4 mr-2" />
                                    Vital Signs
                                    {selectedPatient.vitals && <Check className="h-3 w-3 ml-2 text-green-500" />}
                                </TabsTrigger>
                                <TabsTrigger value="eyetest">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Eye Test
                                    {selectedPatient.eyeTest && <Check className="h-3 w-3 ml-2 text-green-500" />}
                                </TabsTrigger>
                            </TabsList>

                            {/* Vital Signs Tab */}
                            <TabsContent value="vitals">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium">Vital Signs Assessment</h3>
                                        <Button variant="outline" size="sm" onClick={() => setShowVitalHistory(!showVitalHistory)}>
                                            {showVitalHistory ? "Hide History" : "Show History"}
                                        </Button>
                                    </div>

                                    {showVitalHistory && vitalHistory.length > 0 && (
                                        <div className="mb-6 border rounded-md p-4 bg-muted/20">
                                            <h4 className="font-medium mb-2">Previous Vital Signs</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>BP</TableHead>
                                                        <TableHead>Pulse</TableHead>
                                                        <TableHead>Temp</TableHead>
                                                        <TableHead>SpO2</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {vitalHistory.map((vital, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{format(vital.timestamp, "MMM d, yyyy")}</TableCell>
                                                            <TableCell>{vital.bloodPressure}</TableCell>
                                                            <TableCell>{vital.pulse}</TableCell>
                                                            <TableCell>{vital.temperature}°F</TableCell>
                                                            <TableCell>{vital.oxygenSaturation}%</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}

                                    <Form {...vitalsForm}>
                                        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Blood Pressure */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Gauge className="h-4 w-4 mr-2" />
                                                            Blood Pressure
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={vitalsForm.control}
                                                                name="systolic"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Systolic (mmHg)</FormLabel>
                                                                        <div className="flex items-center gap-2">
                                                                            <FormControl>
                                                                                <Input type="number" {...field} />
                                                                            </FormControl>
                                                                            {field.value && getTrendIndicator(field.value, 90, 140)}
                                                                        </div>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={vitalsForm.control}
                                                                name="diastolic"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Diastolic (mmHg)</FormLabel>
                                                                        <div className="flex items-center gap-2">
                                                                            <FormControl>
                                                                                <Input type="number" {...field} />
                                                                            </FormControl>
                                                                            {field.value && getTrendIndicator(field.value, 60, 90)}
                                                                        </div>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                        <div className="mt-2">
                                                            <FormField
                                                                control={vitalsForm.control}
                                                                name="bloodPressure"
                                                                render={({ field }) => (
                                                                    <FormItem className="hidden">
                                                                        <FormControl>
                                                                            <Input {...field} />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <div className="text-sm text-muted-foreground mt-2">Normal range: 90-140/60-90 mmHg</div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Pulse */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Heart className="h-4 w-4 mr-2" />
                                                            Pulse Rate
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <FormField
                                                            control={vitalsForm.control}
                                                            name="pulse"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Pulse Rate (bpm)</FormLabel>
                                                                    <div className="flex items-center gap-2">
                                                                        <FormControl>
                                                                            <Input type="number" {...field} />
                                                                        </FormControl>
                                                                        {field.value && getTrendIndicator(field.value, 60, 100)}
                                                                    </div>
                                                                    <FormMessage />
                                                                    <div className="text-sm text-muted-foreground mt-2">Normal range: 60-100 bpm</div>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </CardContent>
                                                </Card>

                                                {/* Temperature */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Thermometer className="h-4 w-4 mr-2" />
                                                            Temperature
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <FormField
                                                            control={vitalsForm.control}
                                                            name="temperature"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Temperature (°F)</FormLabel>
                                                                    <div className="flex items-center gap-2">
                                                                        <FormControl>
                                                                            <Input type="number" step="0.1" {...field} />
                                                                        </FormControl>
                                                                        {field.value && getTrendIndicator(field.value, 97, 99)}
                                                                    </div>
                                                                    <FormMessage />
                                                                    <div className="text-sm text-muted-foreground mt-2">Normal range: 97.0-99.0 °F</div>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </CardContent>
                                                </Card>

                                                {/* Respiratory Rate */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Lungs className="h-4 w-4 mr-2" />
                                                            Respiratory Rate
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <FormField
                                                            control={vitalsForm.control}
                                                            name="respiratoryRate"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Respiratory Rate (breaths/min)</FormLabel>
                                                                    <div className="flex items-center gap-2">
                                                                        <FormControl>
                                                                            <Input type="number" {...field} />
                                                                        </FormControl>
                                                                        {field.value && getTrendIndicator(field.value, 12, 20)}
                                                                    </div>
                                                                    <FormMessage />
                                                                    <div className="text-sm text-muted-foreground mt-2">
                                                                        Normal range: 12-20 breaths/min
                                                                    </div>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </CardContent>
                                                </Card>

                                                {/* Oxygen Saturation */}
                                                <Card className="md:col-span-2">
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Droplets className="h-4 w-4 mr-2" />
                                                            Oxygen Saturation
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <FormField
                                                            control={vitalsForm.control}
                                                            name="oxygenSaturation"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>SpO2 (%)</FormLabel>
                                                                    <div className="space-y-2">
                                                                        <FormControl>
                                                                            <Slider
                                                                                defaultValue={[field.value]}
                                                                                min={70}
                                                                                max={100}
                                                                                step={1}
                                                                                onValueChange={(vals) => field.onChange(vals[0])}
                                                                            />
                                                                        </FormControl>
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="text-sm font-medium">{field.value}%</div>
                                                                            <div className="flex items-center gap-2">
                                                                                {field.value < 95 ? (
                                                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                                        Low
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="bg-green-50 text-green-700 border-green-200"
                                                                                    >
                                                                                        Normal
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <FormMessage />
                                                                    <div className="text-sm text-muted-foreground mt-2">Normal range: 95-100%</div>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </CardContent>
                                                </Card>


                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </TabsContent>

                            {/* Eye Test Tab */}
                            <TabsContent value="eyetest">
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-medium mb-4">Eye Examination</h3>

                                    <Form {...eyeTestForm}>
                                        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Visual Acuity */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Visual Acuity
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-4">
                                                                <FormField
                                                                    control={eyeTestForm.control}
                                                                    name="visualAcuityRight"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Right Eye (VA)</FormLabel>
                                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger>
                                                                                        <SelectValue placeholder="Select visual acuity" />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    <SelectItem value="20/20">20/20</SelectItem>
                                                                                    <SelectItem value="20/25">20/25</SelectItem>
                                                                                    <SelectItem value="20/30">20/30</SelectItem>
                                                                                    <SelectItem value="20/40">20/40</SelectItem>
                                                                                    <SelectItem value="20/50">20/50</SelectItem>
                                                                                    <SelectItem value="20/70">20/70</SelectItem>
                                                                                    <SelectItem value="20/100">20/100</SelectItem>
                                                                                    <SelectItem value="20/200">20/200</SelectItem>
                                                                                    <SelectItem value="CF">Counting Fingers</SelectItem>
                                                                                    <SelectItem value="HM">Hand Motion</SelectItem>
                                                                                    <SelectItem value="LP">Light Perception</SelectItem>
                                                                                    <SelectItem value="NLP">No Light Perception</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                <FormField
                                                                    control={eyeTestForm.control}
                                                                    name="visualAcuityRightPinhole"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Right Eye (Pinhole)</FormLabel>
                                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger>
                                                                                        <SelectValue placeholder="Select visual acuity" />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    <SelectItem value="not-tested">Not Tested</SelectItem>
                                                                                    <SelectItem value="20/20">20/20</SelectItem>
                                                                                    <SelectItem value="20/25">20/25</SelectItem>
                                                                                    <SelectItem value="20/30">20/30</SelectItem>
                                                                                    <SelectItem value="20/40">20/40</SelectItem>
                                                                                    <SelectItem value="20/50">20/50</SelectItem>
                                                                                    <SelectItem value="20/70">20/70</SelectItem>
                                                                                    <SelectItem value="20/100">20/100</SelectItem>
                                                                                    <SelectItem value="20/200">20/200</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>

                                                            <div className="space-y-4">
                                                                <FormField
                                                                    control={eyeTestForm.control}
                                                                    name="visualAcuityLeft"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Left Eye (VA)</FormLabel>
                                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger>
                                                                                        <SelectValue placeholder="Select visual acuity" />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    <SelectItem value="20/20">20/20</SelectItem>
                                                                                    <SelectItem value="20/25">20/25</SelectItem>
                                                                                    <SelectItem value="20/30">20/30</SelectItem>
                                                                                    <SelectItem value="20/40">20/40</SelectItem>
                                                                                    <SelectItem value="20/50">20/50</SelectItem>
                                                                                    <SelectItem value="20/70">20/70</SelectItem>
                                                                                    <SelectItem value="20/100">20/100</SelectItem>
                                                                                    <SelectItem value="20/200">20/200</SelectItem>
                                                                                    <SelectItem value="CF">Counting Fingers</SelectItem>
                                                                                    <SelectItem value="HM">Hand Motion</SelectItem>
                                                                                    <SelectItem value="LP">Light Perception</SelectItem>
                                                                                    <SelectItem value="NLP">No Light Perception</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />

                                                                <FormField
                                                                    control={eyeTestForm.control}
                                                                    name="visualAcuityLeftPinhole"
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Left Eye (Pinhole)</FormLabel>
                                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                                <FormControl>
                                                                                    <SelectTrigger>
                                                                                        <SelectValue placeholder="Select visual acuity" />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    <SelectItem value="not-tested">Not Tested</SelectItem>
                                                                                    <SelectItem value="20/20">20/20</SelectItem>
                                                                                    <SelectItem value="20/25">20/25</SelectItem>
                                                                                    <SelectItem value="20/30">20/30</SelectItem>
                                                                                    <SelectItem value="20/40">20/40</SelectItem>
                                                                                    <SelectItem value="20/50">20/50</SelectItem>
                                                                                    <SelectItem value="20/70">20/70</SelectItem>
                                                                                    <SelectItem value="20/100">20/100</SelectItem>
                                                                                    <SelectItem value="20/200">20/200</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Intraocular Pressure */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Gauge className="h-4 w-4 mr-2" />
                                                            Intraocular Pressure
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="iopRight"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Right Eye (mmHg)</FormLabel>
                                                                        <div className="flex items-center gap-2">
                                                                            <FormControl>
                                                                                <Input type="number" {...field} />
                                                                            </FormControl>
                                                                            {field.value && getTrendIndicator(field.value, 10, 21)}
                                                                        </div>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="iopLeft"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Left Eye (mmHg)</FormLabel>
                                                                        <div className="flex items-center gap-2">
                                                                            <FormControl>
                                                                                <Input type="number" {...field} />
                                                                            </FormControl>
                                                                            {field.value && getTrendIndicator(field.value, 10, 21)}
                                                                        </div>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                        <div className="text-sm text-muted-foreground mt-2">Normal range: 10-21 mmHg</div>
                                                    </CardContent>
                                                </Card>

                                                {/* Additional Tests */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Microscope className="h-4 w-4 mr-2" />
                                                            Additional Tests
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="colorVision"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Color Vision</FormLabel>
                                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                <SelectItem value="normal">Normal</SelectItem>
                                                                                <SelectItem value="deficient">Deficient</SelectItem>
                                                                                <SelectItem value="not-tested">Not Tested</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="contrastSensitivity"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Contrast Sensitivity</FormLabel>
                                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                <SelectItem value="normal">Normal</SelectItem>
                                                                                <SelectItem value="reduced">Reduced</SelectItem>
                                                                                <SelectItem value="severely-reduced">Severely Reduced</SelectItem>
                                                                                <SelectItem value="not-tested">Not Tested</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Pupil & Movements */}
                                                <Card>
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Ruler className="h-4 w-4 mr-2" />
                                                            Pupil & Movements
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="pupilReaction"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Pupil Reaction</FormLabel>
                                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                <SelectItem value="PERRLA">PERRLA</SelectItem>
                                                                                <SelectItem value="sluggish">Sluggish</SelectItem>
                                                                                <SelectItem value="fixed">Fixed</SelectItem>
                                                                                <SelectItem value="RAPD">RAPD</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="extraocularMovements"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Extraocular Movements</FormLabel>
                                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                <SelectItem value="Full">Full</SelectItem>
                                                                                <SelectItem value="Limited">Limited</SelectItem>
                                                                                <SelectItem value="Restricted">Restricted</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Segment Examination */}
                                                <Card className="md:col-span-2">
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base flex items-center">
                                                            <Stethoscope className="h-4 w-4 mr-2" />
                                                            Segment Examination
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="anteriorSegment"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Anterior Segment</FormLabel>
                                                                        <FormControl>
                                                                            <Textarea placeholder="Anterior segment findings" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={eyeTestForm.control}
                                                                name="posteriorSegment"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Posterior Segment</FormLabel>
                                                                        <FormControl>
                                                                            <Textarea placeholder="Posterior segment findings" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </TabsContent>
                        </Tabs>
                    )}
                    {selectedPatient && (
                        <div className="px-6 pb-6">
                            <Button className="w-full" size="lg" onClick={savePatientData}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Patient Attendance Data
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
