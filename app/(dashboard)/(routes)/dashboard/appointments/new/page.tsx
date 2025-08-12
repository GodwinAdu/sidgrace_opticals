"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { calculateAge, cn } from "@/lib/utils"
import { ArrowLeft, CalendarIcon, Check, Clock, Loader2, Search, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { fetchSinglePatientBySearch } from "@/lib/actions/patient.actions"
import { fetchBookedAppointments, createAppointment } from "@/lib/actions/appointment.actions"

export default function NewAppointmentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [appointmentType, setAppointmentType] = useState("examination")
  const [searchResult, setSearchResult] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState("30")
  const [priority, setPriority] = useState("normal")
  const [examinationType, setExaminationType] = useState("comprehensive")
  const [procedureType, setProcedureType] = useState("visual-field")

  // Search for patients
  const handleSearch = async () => {
    try {
      if (!searchQuery.trim()) {
        setSearchResult(null)
        return
      }
      setIsSearching(true)

      const data = await fetchSinglePatientBySearch(searchQuery)

      setSearchResult(data)
      toast.success("Patient found successfully")
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

  // Fetch booked appointments when date changes
  useEffect(() => {
    const loadBookedAppointments = async () => {
      if (!date) return

      setIsLoadingSlots(true)
      try {
        const result = await fetchBookedAppointments(date.toISOString())

        if (result.success) {
          setBookedSlots(result.bookedSlots)
        } else {
          toast.error("Failed to load booked appointments", {
            description: result.error,
          })
          setBookedSlots([])
        }
      } catch (error) {
        console.error("Error loading booked appointments:", error)
        toast.error("Failed to load appointment availability")
        setBookedSlots([])
      } finally {
        setIsLoadingSlots(false)
      }
    }

    loadBookedAppointments()
  }, [date])

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

        // Check if this slot is booked
        const isBooked = bookedSlots.includes(timeSlot)

        // Check if this slot is in the past (for today's date)
        const isPastSlot = date && date.toDateString() === new Date().toDateString() && new Date().getHours() > hour

        slots.push({
          time: timeSlot,
          available: !isBooked && !isPastSlot,
          isBooked: isBooked,
          isPast: isPastSlot,
        })
      }
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchResult || !date || !selectedTimeSlot) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const appointmentData = {
        patientId: searchResult?._id as string,
        date: date,
        timeSlot: selectedTimeSlot,
        appointmentType: appointmentType,
        reason: reason,
        duration: Number.parseInt(duration),
        priority: priority,
        // Add additional fields based on appointment type
        ...(appointmentType === "examination" && { examinationType }),
        ...(appointmentType === "procedure" && { procedureType }),
      }

      const result = await createAppointment(appointmentData)

      if (result.success) {
        toast.success("Appointment scheduled successfully", {
          description: `Appointment scheduled for ${format(date, "PPP")} at ${selectedTimeSlot}`,
        })

        // Refresh the booked slots to reflect the new appointment
        const updatedSlots = await fetchBookedAppointments(date.toISOString())
        if (updatedSlots.success) {
          setBookedSlots(updatedSlots.bookedSlots)
        }

        // Reset form
        setSelectedTimeSlot(null)
        setReason("")
        setSearchResult(null)

        router.push("/dashboard/appointments")
      } else {
        toast.error("Failed to schedule appointment", {
          description: result.error,
        })
      }
    } catch (error) {
      console.error("Error scheduling appointment:", error)
      toast.error("Scheduling failed", {
        description: "There was an error scheduling the appointment. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const refreshTimeSlots = async () => {
    if (!date) return

    setIsLoadingSlots(true)
    try {
      const result = await fetchBookedAppointments(date.toISOString())
      if (result.success) {
        setBookedSlots(result.bookedSlots)

        toast.success("Time slots refreshed")
      }
    } catch (error) {
      console.log(error)
      toast.error("Failed to refresh time slots")
    } finally {
      setIsLoadingSlots(false)
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
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder="Search patients by name or ID..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                    {searchResult ? (
                      <div className="p-3 bg-blue-50 border-blue-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {searchResult.fullName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-medium">{searchResult.fullName}</h3>
                            <p className="text-xs text-gray-500">
                              ID: {searchResult.patientId} • Age: {calculateAge(searchResult.dob)}
                            </p>
                          </div>
                        </div>
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        {isSearching ? "Searching..." : "Search for a patient to continue"}
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
                      onClick={() => router.push("/dashboard/manage-patient/patients/new")}
                    >
                      Register New Patient
                    </Button>
                  </div>
                </div>
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
                    <RadioGroup
                      value={examinationType}
                      onValueChange={setExaminationType}
                      className="flex flex-col space-y-1"
                    >
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
                    <RadioGroup
                      value={procedureType}
                      onValueChange={setProcedureType}
                      className="flex flex-col space-y-1"
                    >
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
                  <Textarea
                    id="reason"
                    placeholder="Enter the reason for this appointment"
                    className="min-h-[100px]"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
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
                  <RadioGroup value={priority} onValueChange={setPriority} className="flex space-x-4">
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
                <CardTitle className="flex items-center justify-between">
                  Date & Time
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={refreshTimeSlots}
                    disabled={isLoadingSlots || !date}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoadingSlots && "animate-spin")} />
                  </Button>
                </CardTitle>
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
                          onSelect={(newDate) => {
                            setDate(newDate)
                            setSelectedTimeSlot(null) // Reset selected time slot when date changes
                          }}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Available Time Slots</Label>
                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-sm text-gray-600">Loading available slots...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                      {timeSlots.map((slot, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-center p-2 border rounded-md text-sm transition-colors",
                            selectedTimeSlot === slot.time
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200",
                            slot.available
                              ? "cursor-pointer hover:border-blue-300 hover:bg-blue-25"
                              : slot.isBooked
                                ? "opacity-60 cursor-not-allowed bg-red-50 border-red-200 text-red-600"
                                : "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400",
                          )}
                          onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                          title={
                            slot.isBooked
                              ? "This time slot is already booked"
                              : slot.isPast
                                ? "This time slot has passed"
                                : slot.available
                                  ? "Click to select this time slot"
                                  : "This time slot is unavailable"
                          }
                        >
                          <Clock
                            className={cn(
                              "mr-2 h-3 w-3",
                              slot.isBooked ? "text-red-500" : slot.isPast ? "text-gray-400" : "",
                            )}
                          />
                          <span className={slot.isBooked ? "line-through" : ""}>{slot.time}</span>
                          {slot.isBooked && <span className="ml-1 text-xs">(Booked)</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                      <span>Booked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                      <span>Past/Unavailable</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-blue-700 hover:bg-blue-800"
                    disabled={isSubmitting || !searchResult || !date || !selectedTimeSlot}
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
