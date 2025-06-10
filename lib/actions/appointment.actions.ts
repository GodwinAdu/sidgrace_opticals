"use server"
import Appointment from "../models/appointment.models"
import { connectToDB } from "../mongoose"


export async function fetchBookedAppointments(date: string) {
    try {
        await connectToDB()

        // Convert the date string to start and end of day
        const selectedDate = new Date(date)
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0))
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999))

        // Use the imported Appointment model
        const appointments = await Appointment.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
            status: { $in: ["scheduled", "completed"] }, // Only consider active appointments
        }).select("timeSlot status")

        // Extract just the time slots that are booked
        const bookedTimeSlots = appointments.map((appointment) => appointment.timeSlot)

        return {
            success: true,
            bookedSlots: bookedTimeSlots,
        }
    } catch (error) {
        console.error("Error fetching booked appointments:", error)
        return {
            success: false,
            error: "Failed to fetch booked appointments",
            bookedSlots: [],
        }
    }
}
export async function fetchAppointments() {
    try {
        await connectToDB()

        const appointments = await Appointment.find({})
            .populate("patientId", "fullName patientId dob profilePhoto")
            .sort({ date: 1, timeSlot: 1 })
            .lean()

        // Transform the data to match the component's expected format
        const transformedAppointments = appointments.map((appointment) => {
            // Handle the case where patientId might not be populated
            const patient = appointment.patientId

            return {
                id: appointment._id,
                patientId: typeof patient === "object" ? patient._id.toString() : patient.toString(),
                patientName: typeof patient === "object" ? patient.fullName : "Unknown Patient",
                patientPhoto: typeof patient === "object" ? patient.profilePhoto || "/placeholder.svg" : "/placeholder.svg",
                date: appointment.date.toISOString(), // Convert to ISO string for serialization
                duration: appointment.duration,
                type: appointment.appointmentType,
                department: appointment.department || "General Medicine",
                doctor: appointment.doctorId || "Dr. Sarah Johnson",
                status: appointment.status,
                notes: appointment.reason || appointment.notes || "",
                createdAt: appointment.createdAt.toISOString(), // Convert to ISO string for serialization
            }
        })

        return {
            success: true,
            appointments: transformedAppointments,
        }
    } catch (error) {
        console.error("Error fetching booked transformedAppointments:", error)
        return {
            success: false,
            error: "Failed to fetch booked appointments",
            bookedSlots: [],
        }
    }
}

export async function createAppointment(appointmentData: {
    patientId: string
    date: Date
    timeSlot: string
    appointmentType: string
    reason?: string
    duration: number
    priority: string
}) {
    try {
        await connectToDB()

        // Check if the time slot is already booked
        const existingAppointment = await Appointment.findOne({
            date: appointmentData.date,
            timeSlot: appointmentData.timeSlot,
            status: { $in: ["scheduled", "completed"] },
        })

        if (existingAppointment) {
            return {
                success: false,
                error: "This time slot is already booked",
            }
        }

        // Create the new appointment
        const newAppointment = await Appointment.create({
            ...appointmentData,
            status: "scheduled",
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        return {
            success: true,
            appointment: JSON.parse(JSON.stringify(newAppointment)),
        }
    } catch (error) {
        console.error("Error creating appointment:", error)
        return {
            success: false,
            error: "Failed to create appointment",
        }
    }
}

export async function checkTimeSlotAvailability(date: string, timeSlot: string) {
    try {
        await connectToDB()

        const selectedDate = new Date(date)
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0))
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999))

        const existingAppointment = await Appointment.findOne({
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
            timeSlot: timeSlot,
            status: { $in: ["scheduled", "completed"] },
        })

        return {
            success: true,
            isAvailable: !existingAppointment,
        }
    } catch (error) {
        console.error("Error checking time slot availability:", error)
        return {
            success: false,
            isAvailable: false,
            error: "Failed to check availability",
        }
    }
}



export async function updateAppointmentStatus(appointmentId: string, status: string) {
    try {
        await connectToDB()

        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            {
                status: status,
                updatedAt: new Date(),
            },
            { new: true },
        )

        if (!updatedAppointment) {
            return {
                success: false,
                error: "Appointment not found",
            }
        }

        return {
            success: true,
            appointment: updatedAppointment,
        }
    } catch (error) {
        console.error("Error updating appointment status:", error)
        return {
            success: false,
            error: "Failed to update appointment status",
        }
    }
}
