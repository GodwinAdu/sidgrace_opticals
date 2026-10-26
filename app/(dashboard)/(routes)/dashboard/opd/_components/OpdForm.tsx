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
import { useRouter } from "next/navigation"
import { fetchPatientBySearch } from "@/lib/actions/patient.actions"
import { calculateAge } from "@/lib/utils"
import { createAttendance, updateAttendance } from "@/lib/actions/attendance.actions"


type VitalSigns = {
    bloodPressure: string
    systolic: number
    diastolic: number
    pulse: number
    temperature: number
    respiratoryRate: number
    oxygenSaturation: number
    timestamp?: Date | string
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

// Minimal patient shape used by the OPD screen (from fetchPatientBySearch).
type Patient = {
    _id: string
    fullName?: string
    dob?: string
    gender?: string
    phone?: string
    patientId?: string
    priority?: string
    vitals?: VitalSigns | null
    assignedDoctor?: { name: string; avatar?: string } | null
}

type AttendancePatient = Patient & {
    // The underlying Patient's Mongo _id. The row's own `_id` field holds the
    // server-created ATTENDANCE id once the patient is checked in, so this keeps
    // a reference back to the patient for later updates. (Distinct from the
    // Patient.patientId human folder id.)
    patientRefId?: string
    visitType: string
    vitals: VitalSigns | null
    eyeTest: EyeTest | null
    checkInTime: Date
    estimatedWaitTime: number
    status: "waiting" | "in-progress" | "completed"
}

// Form schema for vital signs. Vitals are OPTIONAL at OPD check-in: a patient
// can be checked in without them. Empty fields coerce to undefined and pass;
// upper bounds still guard against obviously bad numbers when values ARE given.
const vitalsFormSchema = z.object({
    bloodPressure: z.string().optional(),
    systolic: z.coerce.number().min(0).max(300, { message: "Systolic looks too high" }),
    diastolic: z.coerce.number().min(0).max(200, { message: "Diastolic looks too high" }),
    pulse: z.coerce.number().min(0).max(300, { message: "Pulse looks too high" }),
    temperature: z.coerce.number().min(0).max(120, { message: "Temperature looks too high" }),
    respiratoryRate: z.coerce.number().min(0).max(80, { message: "Respiratory rate looks too high" }),
    oxygenSaturation: z.coerce.number().min(0).max(100, { message: "SpO2 cannot exceed 100%" }),
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

    const router = useRouter()
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
    const [isLoading, setIsLoading] = useState(false)

    // Form for vital signs
    const vitalsForm = useForm<z.infer<typeof vitalsFormSchema>>({
        // z.coerce.number() makes the resolver input type `unknown`; cast to
        // satisfy RHF's generic without changing runtime behavior.
        resolver: zodResolver(vitalsFormSchema) as never,
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
        resolver: zodResolver(eyeTestFormSchema) as never,
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

    // Add patient to attendance list.
    // visitTypeArg / priorityArg are passed by the caller so we don't read
    // just-set (and therefore stale, async) state within the same render tick.
    // They fall back to the component state when omitted.
    //
    // Check-in now PERSISTS immediately: it creates the server-side attendance
    // record (and its visit invoice + consultation fee) the moment the patient
    // is added, instead of deferring persistence to "Save Patient". The local
    // list row carries the server-created attendance `_id` so later vitals saves
    // and navigation reference the real record. The server's same-day duplicate
    // guard and auth (opdManagement) are the source of truth; any error (e.g. a
    // duplicate same-day visit) surfaces to the user and the row is not added.
    const addToAttendance = async (patient: Patient, visitTypeArg?: string, priorityArg?: string) => {
        setIsAddingToAttendance(true)

        try {
            // Fast local guard for immediate feedback; the server enforces the
            // authoritative same-day duplicate check.
            if (attendanceList.some((p) => p._id === patient._id)) {
                toast.warning("Patient already in attendance", {
                    description: `${patient.fullName} is already in today's attendance list.`,
                })
                return
            }

            const effectivePriority = priorityArg ?? priority
            const effectiveVisitType = visitTypeArg ?? visitType

            // Persist the check-in. The server validates patientId, applies the
            // consultation fee, opens the invoice, and rejects a duplicate
            // same-day visit. Only a valid visitType (schema enum) is sent.
            const created = await createAttendance({
                patientId: patient._id,
                visitType: effectiveVisitType,
                status: "waiting",
            })

            // Use the server-created attendance id for the local row so Save and
            // navigation act on the real record, not a transient client id.
            const attendanceId = created?._id ? String(created._id) : patient._id

            const attendancePatient: AttendancePatient = {
                ...patient,
                _id: attendanceId,
                patientRefId: patient._id,
                priority: effectivePriority,
                visitType: effectiveVisitType,
                vitals: null, // Ensure vitals is null for new attendance
                eyeTest: null, // Ensure eyeTest is null for new attendance
                checkInTime: new Date(),
                estimatedWaitTime: effectivePriority === "urgent" ? 5 : effectivePriority === "high" ? 15 : 30,
                status: "waiting",
            }

            setAttendanceList((prev) => [...prev, attendancePatient])
            setSearchResults([])
            setSearchQuery("")

            toast.success("Patient checked in", {
                description: `${patient.fullName} has been added to today's attendance list.`,
            })

            // Refresh server components (e.g. the Today's Attendance dialog) so
            // the freshly persisted visit shows up.
            router.refresh()
        } catch (error) {
            console.log("Failed to check in patient", error)
            toast.error("Could not check in patient", {
                description:
                    error instanceof Error && error.message
                        ? error.message
                        : "Please try again later",
            })
        } finally {
            setIsAddingToAttendance(false)
        }
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
        try {
            setIsLoading(true)
            if (!selectedPatient) {
                setIsLoading(false)
                return
            }

            // Validation gate: run the vitals form through Zod instead of reading
            // raw getValues() (which bypasses validation). Do NOT block on the
            // eyeTest form (its tab is currently commented out).
            const ok = await vitalsForm.trigger()
            if (!ok) {
                toast.error("Please correct the vital sign values")
                setIsLoading(false)
                return
            }

            // Get values from both forms
            const vitalsData = vitalsForm.getValues()
            const eyeTestData = eyeTestForm.getValues()

            // Format blood pressure
            const bloodPressure = `${vitalsData.systolic}/${vitalsData.diastolic}`

            // Local vitals object retained for the trend/history UI only (keeps
            // systolic/diastolic/oxygenSaturation for display).
            const vitals: VitalSigns = {
                bloodPressure,
                systolic: vitalsData.systolic,
                diastolic: vitalsData.diastolic,
                pulse: vitalsData.pulse,
                temperature: vitalsData.temperature,
                respiratoryRate: vitalsData.respiratoryRate,
                oxygenSaturation: vitalsData.oxygenSaturation,
            }

            // Local eye test object retained for the attendance-list UI only.
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

            // The attendance record already exists (created at check-in), so we
            // UPDATE it with the recorded vitals/eyeTest rather than creating a
            // second record. `selectedPatient._id` is the server attendance id.
            //
            // Map to the ACTUAL Attendance schema shape. The schema `vitals`
            // sub-doc only has temperature/pulse/bloodPressure/respiratoryRate
            // (no systolic/diastolic/oxygenSaturation columns), so systolic and
            // diastolic are combined into the bloodPressure string.
            const patientAttendanceData: Record<string, unknown> = {
                vitals: {
                    bloodPressure: `${vitalsData.systolic}/${vitalsData.diastolic}`,
                    temperature: vitalsData.temperature,
                    pulse: vitalsData.pulse,
                    respiratoryRate: vitalsData.respiratoryRate,
                },
            }

            // Only include eyeTest when the user actually recorded visual acuity,
            // and map it to the real schema fields
            // (visualAcuity/colorVision/intraocularPressure/remarks).
            if (eyeTestData.visualAcuityRight || eyeTestData.visualAcuityLeft) {
                patientAttendanceData.eyeTest = {
                    visualAcuity: `R: ${eyeTestData.visualAcuityRight} L: ${eyeTestData.visualAcuityLeft}`,
                    intraocularPressure: `R: ${eyeTestData.iopRight} L: ${eyeTestData.iopLeft}`,
                    colorVision: eyeTestData.colorVision || "",
                    remarks: eyeTestData.posteriorSegment || eyeTestData.anteriorSegment || "",
                }
            }

            await updateAttendance(selectedPatient._id, patientAttendanceData)

            // Update the patient in the attendance list
            const updatedList: AttendancePatient[] = attendanceList.map((p) =>
                p._id === selectedPatient._id
                    ? {
                        ...p,
                        vitals,
                        eyeTest,
                        status: "completed" as const,
                    }
                    : p,
            )

            setAttendanceList(updatedList)

            // Update the selected patient
            setSelectedPatient((prev) => (prev ? { ...prev, vitals, eyeTest, status: "completed" } : null))

            router.refresh()

            toast.success("Patient data recorded", {
                description: `Vital signs and eye test results for ${selectedPatient.fullName} have been saved.`,
            })
        } catch (error) {
            console.log(error)
            toast.error("Something went wrong",{
                description:"Please try again later"
            })

        } finally {
            setIsLoading(false)
        }
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
                const an = a.fullName || "", bn = b.fullName || ""
                return sortDirection === "asc" ? an.localeCompare(bn) : bn.localeCompare(an)
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
        ({ patient }: { patient: Patient }) => {
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
                                <SelectItem value="outpatient">Outpatient</SelectItem>
                                <SelectItem value="new">New Visit</SelectItem>
                                <SelectItem value="follow-up">Follow-up</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                                <SelectItem value="procedure">Procedure</SelectItem>
                                <SelectItem value="inpatient">Inpatient (planned)</SelectItem>
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
                                // Keep state in sync for the rest of the UI, but pass the
                                // selected values directly so addToAttendance never reads
                                // stale (async) state within this same tick.
                                setVisitType(localVisitType)
                                setPriority(localPriority)
                                addToAttendance(patient, localVisitType, localPriority)
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
                                                    {getPriorityBadge(patient.priority || "normal")}
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
                            <TabsList className="grid grid-cols-1 mx-6 mt-4">
                                <TabsTrigger value="vitals">
                                    <Activity className="h-4 w-4 mr-2" />
                                    Vital Signs
                                    {selectedPatient.vitals && <Check className="h-3 w-3 ml-2 text-green-500" />}
                                </TabsTrigger>
                                {/* <TabsTrigger value="eyetest">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Eye Test
                                    {selectedPatient.eyeTest && <Check className="h-3 w-3 ml-2 text-green-500" />}
                                </TabsTrigger> */}
                            </TabsList>

                            {/* Vital Signs Tab */}
                            <TabsContent value="vitals" >
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
                                                            <TableCell>{vital.timestamp ? format(new Date(vital.timestamp), "MMM d, yyyy") : "—"}</TableCell>
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
                           
                        </Tabs>
                    )}
                    {selectedPatient && (
                        <div className="px-6 pb-6">
                            <Button className="w-full" size="lg" disabled={isLoading} onClick={savePatientData}>
                                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />: <Save className="h-4 w-4 mr-2" />}
                                {isLoading ? "Please wait ...":"Save Patient "}
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
