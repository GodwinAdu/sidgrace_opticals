"use server"

import { Patient } from "../models/patient.models";
import Record from "../models/record.models";
import { connectToDB } from "../mongoose";
import { withAuth, type User } from '../helpers/auth';
import { deleteDocument } from "./trash.actions";

interface FetchPatientsParams {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
}


async function _createPatient(user: User, values) {
    try {
        if (!user) throw new Error("User not authenticated")

        const data = {
            destination: values.phone,
            message: `Hi ${values.fullName}, welcome to SidGrace! Your account is now active. We're glad to have you with us!`
        }
        await connectToDB();

        const patient = new Patient({
            ...values,
            createdBy: user._id,
            updatedBy: user._id,
        })

        await patient.save()
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}sms/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });


        return JSON.parse(JSON.stringify(patient))

    } catch (error) {
        console.log("error while creating patient", error);
        throw error;
    }
}

export const createPatient = await withAuth(_createPatient)

async function _fetchPatientId(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB();

        const patient = await Patient.findById(id)

        if (!patient) throw new Error("patient not found")

        return JSON.parse(JSON.stringify(patient))

    } catch (error) {
        console.log("error while fetching patient by id", error);
        throw error;

    }
}

export const fetchPatientId = await withAuth(_fetchPatientId)


async function _fetchInfinityPatient(user: User, {
    page = 1,
    limit = 20,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
}: FetchPatientsParams = {}) {
    try {
        if (!user) throw new Error("User not authenticated")
        await connectToDB()

        // Calculate how many documents to skip
        const skip = (page - 1) * limit

        // Build the query
        let query = {}

        // Add search functionality if provided
        if (search) {
            query = {
                $or: [{ fullName: { $regex: search, $options: "i" } }, { contact: { $regex: search, $options: "i" } }, { patientId: { $regex: search, $options: "i" } }],
            }
        }

        // Build the sort object
        const sort: Record<string, 1 | -1> = {}
        sort[sortBy] = sortOrder === "asc" ? 1 : -1

        // Execute the query with pagination
        const patients = await Patient.find(query).sort(sort).skip(skip).limit(limit).lean()

        return JSON.parse(JSON.stringify(patients))
    } catch (error) {
        console.error("Error fetching patients:", error)
        throw new Error("Failed to fetch patients")
    }
}

export const fetchInfinityPatient = await withAuth(_fetchInfinityPatient)

async function _fetchPatientBySearch(user: User, search: string) {
    try {
        if (!user) throw new Error("User not authenticated");

        await connectToDB();

        let query = {};

        if (search) {
            const searchTerms = search.trim().split(/\s+/).filter(Boolean);

            if (searchTerms.length > 1) {
                // For multiple words (e.g., "John Doe" or "Doe John")
                query = {
                    $or: [
                        {
                            $and: searchTerms.map(term => ({
                                fullName: { $regex: term, $options: "i" },
                            }))
                        },
                        { contact: { $regex: search, $options: "i" } },
                        { patientId: { $regex: search, $options: "i" } },
                    ]
                };
            } else {
                // For single word search
                query = {
                    $or: [
                        { fullName: { $regex: search, $options: "i" } },
                        { contact: { $regex: search, $options: "i" } },
                        { patientId: { $regex: search, $options: "i" } },
                    ]
                };
            }
        }

        const patients = await Patient.find(query);

        return JSON.parse(JSON.stringify(patients));

    } catch (error) {
        console.error("Error while fetching patient by search:", error);
        throw error;
    }
}

export const fetchPatientBySearch = await withAuth(_fetchPatientBySearch);
async function _fetchSinglePatientBySearch(user: User, search: string) {
    try {
        if (!user) throw new Error("User not authenticated");

        await connectToDB();

        let query = {};

        if (search) {
            const searchTerms = search.trim().split(/\s+/).filter(Boolean);

            if (searchTerms.length > 1) {
                // For multiple words (e.g., "John Doe" or "Doe John")
                query = {
                    $or: [
                        {
                            $and: searchTerms.map(term => ({
                                fullName: { $regex: term, $options: "i" },
                            }))
                        },
                        { contact: { $regex: search, $options: "i" } },
                        { patientId: { $regex: search, $options: "i" } },
                    ]
                };
            } else {
                // For single word search
                query = {
                    $or: [
                        { fullName: { $regex: search, $options: "i" } },
                        { contact: { $regex: search, $options: "i" } },
                        { patientId: { $regex: search, $options: "i" } },
                    ]
                };
            }
        }

        const patients = await Patient.findOne(query);

        return JSON.parse(JSON.stringify(patients));

    } catch (error) {
        console.error("Error while fetching patient by search:", error);
        throw error;
    }
}

export const fetchSinglePatientBySearch = await withAuth(_fetchSinglePatientBySearch);



async function _fetchPatientThisMonth(user: User) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Query patients created this month
        const patientsThisMonth = await Patient.find({ createdAt: { $gte: startOfMonth } }).sort({ createdAt: -1 }).lean();

        if (patientsThisMonth.length === 0) return []

        return JSON.parse(JSON.stringify(patientsThisMonth));

    } catch (error) {
        console.log("error while fetching patient this month", error);
        throw error;

    }
}

export const fetchPatientThisMonth = await withAuth(_fetchPatientThisMonth)

export async function getPatientDashboardStats() {
    await connectToDB();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Query patients
    const [totalPatients, newPatientsThisMonth, newPatientsLastMonth, appointmentsToday, followUpsRequired] = await Promise.all([
        Patient.countDocuments({}),
        Patient.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Patient.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

        // Placeholder for "appointments today"
        Promise.resolve(32), // Replace with actual query if you have Appointments collection

        // Placeholder for "follow-ups required"
        Promise.resolve(16)  // Replace with actual logic
    ]);

    const newPatientsChangeValue = newPatientsThisMonth - newPatientsLastMonth;
    const newPatientsChangePercent = newPatientsLastMonth === 0
        ? 100
        : ((newPatientsChangeValue / newPatientsLastMonth) * 100).toFixed(1);

    return [
        {
            title: "Total Patients",
            value: totalPatients.toLocaleString(),
            change: `+${newPatientsThisMonth} this month`,
        },
        {
            title: "New Patients",
            value: newPatientsThisMonth.toString(),
            change: `${newPatientsChangeValue >= 0 ? '+' : ''}${newPatientsChangePercent}% from last month`,
        },
        {
            title: "Appointments Today",
            value: appointmentsToday.toString(),
            change: "8 remaining", // You can make this dynamic later
        },
        {
            title: "Follow-ups Required",
            value: followUpsRequired.toString(),
            change: "5 urgent", // You can make this dynamic later
        },
    ];
}




export async function updatePatient() {
    try {
        await connectToDB()
        // await Patient.collection.dropIndex("id_1")
        // await Record.updateMany({}, { $unset: { patientId: "" } });
        const records = await Record.find();

        for (const record of records) {
            // Match based on patient_id == patient.patientId
            const patient = await Patient.findOne({ patientId: record.patient_id });

            if (patient) {
                record.patientId = patient._id;

                // Debug check
                console.log(`Linking record ${record.patient_id} to patient ${patient.patientId} (${patient._id})`);

                await record.save(); // MUST call save()
            } else {
                console.warn(`No matching patient found for patient_id: ${record.patient_id}`);
            }
        }
        console.log("Migration complete ✅");
        // await Patient.collection.updateMany(
        //     {},
        //     [
        //         {
        //             $set: {
        //                 phone: {
        //                     $cond: {
        //                         if: { $and: [{ $ne: ["$phone", null] }, { $ne: ["$phone", ""] }] },
        //                         then: { $concat: ["+233", { $toString: "$phone" }] },
        //                         else: ""
        //                     }
        //                 }
        //             }
        //         }
        //     ]
        // );

        // await Patient.collection.updateMany(
        //     {},
        //     [
        //         {
        //             $set: {
        //                 gender: {
        //                     $cond: {
        //                         if: { $eq: ["$gender", "M"] },
        //                         then: "male",
        //                         else: {
        //                             $cond: {
        //                                 if: { $eq: ["$gender", "F"] },
        //                                 then: "female",
        //                                 else: "$gender"
        //                             }
        //                         }
        //                     }
        //                 },
        //                 occupation: {
        //                     $cond: { if: { $eq: ["$occupation", 0] }, then: "", else: "$occupation" }
        //                 },
        //                 providerId: {
        //                     $cond: { if: { $eq: ["$providerId", 0] }, then: "", else: "$providerId" }
        //                 },
        //                 serviceNumber: {
        //                     $cond: { if: { $eq: ["$serviceNumber", "N/A"] }, then: "", else: "$serviceNumber" }
        //                 },
        //                 emergencyName: {
        //                     $cond: { if: { $eq: ["$emergencyName", "N/A"] }, then: "", else: "$emergencyName" }
        //                 },
        //                 emergencyPhone: {
        //                     $cond: { if: { $eq: ["$emergencyPhone", "N/A"] }, then: "", else: "$emergencyPhone" }
        //                 }
        //             }
        //         }
        //     ])




    } catch (error) {
        throw error

    }
}


async function _deletePatient(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB()

        const patient = await Patient.findById(id)

        await deleteDocument({
            actionType: 'PATIENT_DELETED',
            documentId: patient._id,
            collectionName: 'Patient',
            userId: `${user?._id}`,
            trashMessage: `"${patient.fullName}" (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `User ${user.fullName} deleted "${patient.fullName}" (ID: ${id}) on ${new Date().toLocaleString()}.`
        });

        return { success: true, message: "Class deleted successfully" };
    } catch (error) {
        console.log("error while deleting patient", error)
        throw error;
    }
}

export const deletePatient = await withAuth(_deletePatient)