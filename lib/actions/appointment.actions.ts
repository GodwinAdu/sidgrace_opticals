"use server"
import { format } from "date-fns"
import { type User, withAuth } from "../helpers/auth"
import Appointment from "../models/appointment.models"
import { Patient } from "../models/patient.models"
import { connectToDB } from "../mongoose"
import { deleteDocument } from "./trash.actions"
import History from "../models/history.models"


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
async function _fetchAppointments(user:User) {
    try {
        if(!user) throw new Error("User not authenticated");

        await connectToDB()

        const appointments = await Appointment.find({})
            .populate([{ path: "patientId", model: Patient, select: "fullName patientId dob profilePhoto" }])
            .sort({ date: -1, timeSlot: -1 })

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
                // department: appointment.department || "General Medicine",
                // doctor: appointment.doctorId || "Dr. Sarah Johnson",
                status: appointment.status,
                notes: appointment.reason || appointment.notes || "",
                createdAt: appointment.createdAt.toISOString(), // Convert to ISO string for serialization
            }
        })

        return {
            success: true,
            appointments: JSON.parse(JSON.stringify(transformedAppointments)),
        }
    } catch (error) {
        console.error("Error fetching booked transformedAppointments:", error)
        return {
            success: false,
            error: "Failed to fetch booked appointments",
            bookedSlots: [],
        }
    }
};

export async function fetchAppointmentById(id: string) {
    try {

        console.log(id, "id")
        await connectToDB();

        const appointment = await Appointment.findById(id)
            .populate([{ path: "patientId", model: Patient }])


        if (!appointment) throw new Error("Couldn't fetch appointment");

        // Fetch previous appointments for the same patient, before this appointment's date
        const previousAppointments = await Appointment.find({
            patientId: appointment.patientId._id,
            // date: { $lt: appointment.date },
            _id: { $ne: appointment._id }, // exclude the current one
        })
            .sort({ date: -1 }) // latest first
            .limit(5); // or any number you want

        const fullData = {
            ...appointment.toObject(),
            previousAppointments: previousAppointments.map((prev) => ({
                date: prev.date,
                type: prev.appointmentType,
                status: prev.status,
            })),
        };

        console.log(fullData, "data")
        return JSON.parse(JSON.stringify(fullData));
    } catch (error) {
        console.error("Something went wrong while fetching appointment:", error);
        throw error;
    }
}


async function _createAppointment(user: User, appointmentData: {
    patientId: string
    date: Date
    timeSlot: string
    appointmentType: string
    reason?: string
    duration: number
    priority: string
}) {
    try {
        if (!user) throw new Error("User not authorized")
        await connectToDB()

        // Check if the time slot is already booked
        const existingAppointment = await Appointment.findOne({
            date: appointmentData.date,
            timeSlot: appointmentData.timeSlot,
            status: { $in: ["scheduled", "completed"] },
        });

        const patient = await Patient.findById(appointmentData.patientId)

        if (!patient) throw new Error("Patient not found")

        if (existingAppointment) {
            return {
                success: false,
                error: "This time slot is already booked",
            }
        }

        const values = {
            destination: patient.phone,
            message: `Dear ${patient.fullName}, your appointment is confirmed for ${format(appointmentData.date, "PPP")} at ${appointmentData.timeSlot}.`
        }

        // Create the new appointment
        const newAppointment = new Appointment({
            ...appointmentData,
            status: "scheduled",
            createdAt: new Date(),
            updatedAt: new Date(),
        });


        const history = new History({
            actionType: 'APPOINTMENT_CREATED', // Use a relevant action type
            details: {
                itemId: newAppointment._id,
                deletedAt: new Date(),
            },
            message: `User ${user.fullName} created appointment for "${patient.fullName}" (ID: ${patient._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id, // User who performed the action,
            entityId: newAppointment._id,  // The ID of the deleted unit
            entityType: 'APPOINTMENT',  // The type of the entity
        });



        await Promise.all([
            newAppointment.save(),
            history.save(),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}sms/send-sms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            }),
        ])

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


async function _deleteAppointment(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB()

        const appointment = await Appointment.findById(id)

        await deleteDocument({
            actionType: 'APPOINTMENT_DELETED',
            documentId: appointment._id,
            collectionName: 'Appointment',
            userId: `${user?._id}`,
            trashMessage: `"Appointment" with (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `User ${user.fullName} deleted "Appointment" with (ID: ${id}) on ${new Date().toLocaleString()}.`
        });

        return { success: true, message: "Class deleted successfully" };
    } catch (error) {
        console.log("error while deleting patient", error)
        throw error;
    }
}


export const createAppointment = await withAuth(_createAppointment);
export const fetchAppointments = await withAuth(_fetchAppointments);
export const deleteAppointment = await withAuth(_deleteAppointment)