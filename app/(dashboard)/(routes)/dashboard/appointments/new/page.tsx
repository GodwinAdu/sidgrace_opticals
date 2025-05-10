"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ArrowLeft, CalendarIcon, Check, ChevronRight, Clock, Loader2, Search, User } from "lucide-react"
import { toast } from "sonner"

export default function NewAppointmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patient")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [appointmentType, setAppointmentType] = useState("examination")


  // Mock data for patients
  const patients = [
    { id: "SGO-P1001", name: "John Smith", age: 45, lastVisit: "2023-04-15" },
    { id: "SGO-P1002", name: "Emily Johnson", age: 32, lastVisit: "2023-04-28" },
    { id: "SGO-P1003", name: "Michael Brown", age: 58, lastVisit: "2023-04-10" },
    { id: "SGO-P1004", name: "Sarah Williams", age: 27, lastVisit: "2023-04-22" },
    { id: "SGO-P1005", name: "Robert Davis", age: 62, lastVisit: "2023-03-30" },
  ]

  // Filter patients based on search query
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Find patient if patientId is provided
  const selectedPatient = patientId ? patients.find((p) => p.id === patientId) : null

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = []
    const startHour = 9 // 9 AM
    const endHour = 17 // 5 PM
    const interval = 30 // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12
        const period = hour < 12 ? "AM" : "PM"
        const formattedMinute = minute.toString().padStart(2, "0")
        const timeSlot = `${formattedHour}:${formattedMinute} ${period}`

        // Randomly mark some slots as unavailable
        const isAvailable = Math.random() > 0.3

        slots.push({
          time: timeSlot,
          available: isAvailable,
        })
      }
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    try {
      // In a real app, you would send appointment data to your API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Appointment scheduled successfully",
        description: `Appointment scheduled for ${format(date!, "PPP")} at ${selectedTimeSlot}`,
      })

      // Redirect to the appointments list
      router.push("/dashboard/appointments")
    } catch (error) {
      toast({
        title: "Scheduling failed",
        description: "There was an error scheduling the appointment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-6 py-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="sr-only"> Back to Appointments</span>

              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-blue-900">Schedule New Appointment</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Select or search for a patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                        {selectedPatient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium">{selectedPatient.name}</h3>
                        <p className="text-sm text-gray-500">
                          ID: {selectedPatient.id} • Age: {selectedPatient.age}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Last Visit: {selectedPatient.lastVisit}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/dashboard/patients/${selectedPatient.id}`)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      View Patient Details
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-blue-700"
                      onClick={() => router.push("/dashboard/appointments/new")}
                    >
                      Change Patient
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder="Search patients by name or ID..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                            onClick={() => router.push(`/dashboard/appointments/new?patient=${patient.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                {patient.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-medium">{patient.name}</h3>
                                <p className="text-xs text-gray-500">
                                  ID: {patient.id} • Age: {patient.age}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No patients found. Try a different search term.
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Can&apos;t find the patient?</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push("/dashboard/patients/new")}
                      >
                        Register New Patient
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Middle Column - Appointment Details */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
                <CardDescription>Select appointment type and details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appointmentType">
                    Appointment Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={appointmentType} onValueChange={setAppointmentType} required>
                    <SelectTrigger id="appointmentType">
                      <SelectValue placeholder="Select appointment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="examination">Eye Examination</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {appointmentType === "examination" && (
                  <div className="space-y-2">
                    <Label>Examination Type</Label>
                    <RadioGroup defaultValue="comprehensive" className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="comprehensive" id="exam-comprehensive" />
                        <Label htmlFor="exam-comprehensive">Comprehensive Eye Exam</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="routine" id="exam-routine" />
                        <Label htmlFor="exam-routine">Routine Vision Check</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="contact" id="exam-contact" />
                        <Label htmlFor="exam-contact">Contact Lens Fitting</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pediatric" id="exam-pediatric" />
                        <Label htmlFor="exam-pediatric">Pediatric Eye Exam</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {appointmentType === "procedure" && (
                  <div className="space-y-2">
                    <Label>Procedure Type</Label>
                    <RadioGroup defaultValue="visual-field" className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="visual-field" id="proc-visual-field" />
                        <Label htmlFor="proc-visual-field">Visual Field Test</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oct" id="proc-oct" />
                        <Label htmlFor="proc-oct">OCT Scan</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="topography" id="proc-topography" />
                        <Label htmlFor="proc-topography">Corneal Topography</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="minor" id="proc-minor" />
                        <Label htmlFor="proc-minor">Minor Procedure</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Textarea id="reason" placeholder="Enter the reason for this appointment" className="min-h-[100px]" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Priority</Label>
                    <span className="text-xs text-gray-500">Optional</span>
                  </div>
                  <RadioGroup defaultValue="normal" className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id="priority-normal" />
                      <Label htmlFor="priority-normal">Normal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="urgent" id="priority-urgent" />
                      <Label htmlFor="priority-urgent">Urgent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="emergency" id="priority-emergency" />
                      <Label htmlFor="priority-emergency">Emergency</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Date and Time Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Date & Time</CardTitle>
                <CardDescription>Select appointment date and time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <div className="grid place-items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Available Time Slots</Label>
                  <div className="grid grid-cols-2 gap-2  overflow-y-auto">
                    {timeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-center p-2 border rounded-md text-sm",
                          selectedTimeSlot === slot.time
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200",
                          slot.available
                            ? "cursor-pointer hover:border-blue-300"
                            : "opacity-50 cursor-not-allowed bg-gray-50",
                        )}
                        onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                      >
                        <Clock className="mr-2 h-3 w-3 " />
                        {slot.time}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    disabled={isSubmitting || !selectedPatient || !selectedDoctor || !date || !selectedTimeSlot}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        Schedule Appointment
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}
