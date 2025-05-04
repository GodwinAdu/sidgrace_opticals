"use server"

import { Patient } from "../models/patient.models";
import { connectToDB } from "../mongoose";


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