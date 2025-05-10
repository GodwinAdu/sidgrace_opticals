"use server"

import { Patient } from "../models/patient.models";
import Record from "../models/record.models";
import { connectToDB } from "../mongoose";
import { currentUser } from "../helpers/current-user";

interface FetchPatientsParams {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
}


export async function fetchPatientId(id: string) {
    try {

        await connectToDB();

        const patient = await Patient.findById(id)

        if (!patient) throw new Error("patient not found")

        return JSON.parse(JSON.stringify(patient))

    } catch (error) {
        console.log("error while fetching patient by id", error);
        throw error;

    }
}


export async function fetchInfinityPatient({
    page = 1,
    limit = 20,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
}: FetchPatientsParams = {}) {
    try {
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


export async function fetchPatientBySearch(search: string) {
    try {

        const user = await currentUser();

        if (!user) throw new Error("User not authenticated")

        await connectToDB();

        // Build the query
        let query = {}

        // Add search functionality if provided
        if (search) {
            query = {
                $or: [{ fullName: { $regex: search, $options: "i" } }, { contact: { $regex: search, $options: "i" } }, { patientId: { $regex: search, $options: "i" } }],
            }
        }

        const patient = await Patient.find(query)

        if (!patient) return {}

        return JSON.parse(JSON.stringify(patient))

    } catch (error) {
        console.log("error happening while fetching patient by search", error);
        throw error;
    }
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