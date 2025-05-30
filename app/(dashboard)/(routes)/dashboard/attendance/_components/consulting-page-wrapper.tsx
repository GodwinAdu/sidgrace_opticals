"use client"

import { useState } from "react"
import PatientRecord from "./ConsultingPage"
import { getAttendanceById, updateAttendance } from "@/lib/actions/attendance.actions"
import { toast } from "sonner"

interface PreviousVisit {
    _id: string
    date: Date
    status: "ongoing" | "completed" | "cancelled"
    visitType: "outpatient" | "inpatient" | "emergency"
}

interface ConsultingPageWrapperProps {
    initialAttendance: any
    previousVisits: PreviousVisit[]
}

export default function ConsultingPageWrapper({ initialAttendance, previousVisits }: ConsultingPageWrapperProps) {
    const [currentAttendance, setCurrentAttendance] = useState(initialAttendance)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isViewingHistorical, setIsViewingHistorical] = useState(false)
    const [originalAttendance] = useState(initialAttendance) // Keep reference to original

    const handleLoadPreviousVisit = async (visitId: string) => {
        setLoading(true)
        try {
            const response = await getAttendanceById(visitId)

            setCurrentAttendance(response)
            // Optionally, you can also update the previous visits list if needed
            // const updatedPreviousVisits = previousVisits.filter(visit => visit._id !== visitId)
            // setPreviousVisits(updatedPreviousVisits)
            // Or you can fetch the updated list of previous visits if needed
            // const updatedPreviousVisits = await getPreviousVisitsByPatientId(response.patientId._id || response.patientId)
        } catch (error) {
            console.error("Error loading previous visit:", error)
        } finally {
            setLoading(false)
        }
    }


    const handleSaveAttendance = async (attendanceData: any): Promise<{ success: boolean; error?: string }> => {
        setSaving(true)
        try {
            const response = await updateAttendance(currentAttendance._id, attendanceData)
            setCurrentAttendance(response)
            toast.success("Attendance record saved successfully", {
                description: "Attendance record saved successfully",
            })
            return { success: true }
        } catch (error) {
            console.error("Error saving attendance:", error)
            toast.error("An error occurred while saving", {
                description: "An error occurred while saving",
            })
            return { success: false, error: "Network error" }
        } finally {
            setSaving(false)
        }
    }

    const handleReturnToCurrent = () => {
    setCurrentAttendance(originalAttendance)
    setIsViewingHistorical(false)
    toast({
      title: "Current Visit",
      description: "Returned to current visit",
    })
  }

    // const handleSaveSection = async (section: string, sectionData: any) => {
    //     try {
    //         const response = await fetch(`/api/attendance/${currentAttendance._id}/section`, {
    //             method: "PUT",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ section, data: sectionData }),
    //         })

    //         if (response.ok) {
    //             const result = await response.json()
    //             setCurrentAttendance(result.data)
    //             toast({
    //                 title: "Success",
    //                 description: `${section} updated successfully`,
    //             })
    //             return { success: true }
    //         } else {
    //             const error = await response.json()
    //             toast({
    //                 title: "Error",
    //                 description: error.error || `Failed to update ${section}`,
    //                 variant: "destructive",
    //             })
    //             return { success: false, error: error.error }
    //         }
    //     } catch (error) {
    //         console.error(`Error updating ${section}:`, error)
    //         toast({
    //             title: "Error",
    //             description: `An error occurred while updating ${section}`,
    //             variant: "destructive",
    //         })
    //         return { success: false, error: "Network error" }
    //     }
    // }


    return (
        <PatientRecord
            attendance={currentAttendance}
            previousVisits={isViewingHistorical ? [] : previousVisits} // Hide previous visits when viewing historical
            onLoadPreviousVisit={handleLoadPreviousVisit}
            onSaveAttendance={handleSaveAttendance}
            // onSaveSection={handleSaveSection}
            onReturnToCurrent={isViewingHistorical ? handleReturnToCurrent : undefined}
            isViewingHistorical={isViewingHistorical}
            saving={saving}
        />
    )
}
