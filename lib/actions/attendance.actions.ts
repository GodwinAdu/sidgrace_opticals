"use server";
import { Types } from 'mongoose';
import { withAuth, type User } from '../helpers/auth';
import Attendance from '../models/attendance.models';
import { connectToDB } from '../mongoose';
import Staff from '../models/staff.models';
import { Patient } from '../models/patient.models';
import { deleteDocument } from './trash.actions';
import { format } from 'date-fns';

async function _createAttendance(user: User, values: Record<string, unknown>) {

    try {
        if (!user) throw new Error("User is not authenticated");

        const date = new Date();

        await connectToDB();

        const existingAttendance = await Attendance.findOne({ patientId: values.patientId, date });

        if (existingAttendance) throw new Error("Attendance for this patient on this date already exists");
        const attendance = new Attendance({
            ...values,
            date,
            createdBy: user._id,
        });
        await attendance.save();

    } catch (error) {
        console.error("Error creating attendance", error);
        throw error;

    }
}


export const createAttendance = await withAuth(_createAttendance);

async function _getAttendanceById(user: User, id: string) {
    if (!user || !user._id) {
        throw new Error("Unauthorized: User is not authenticated.");
    }
    await connectToDB();
    if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid attendance ID.");
    }
    try {
        const attendance = await Attendance.findById(id)
            .populate([
                { path: 'patientId', model: Patient },
                { path: 'createdBy', model: Staff, select: 'fullName' }
            ])
        if (!attendance) {
            throw new Error("Attendance not found.");
        }
        return JSON.parse(JSON.stringify(attendance));
    } catch (err) {
        console.error("Failed to fetch attendance:", err);
        throw new Error("Unable to fetch attendance. Please try again later.");
    }
}
export const getAttendanceById = await withAuth(_getAttendanceById);



async function _getAllAttendances(user: User) {
    if (!user || !user._id) {
        throw new Error("Unauthorized: User is not authenticated.");
    }
    await connectToDB();
    const date = new Date();
    try {
        const attendances = await Attendance.find({
            date: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        })
            .populate([{
                path: 'patientId',
                model: Patient,
                select: 'fullName'
            }, {
                path: 'createdBy',
                model: Staff,
                select: 'fullName'
            }])
            .sort({ date: -1 })
            .exec();

        if (!attendances || attendances.length === 0) return [];

        const filterAttendance = attendances.map(data => ({
            _id: data._id,
            patient: data.patientId.fullName,
            visitDate:format(data.date,"PPP"),
            status: data.status,
            ...data._doc
        }));

        console.log(filterAttendance,"filter")

        // Convert Mongoose documents to plain objects
        return JSON.parse(JSON.stringify(filterAttendance));
    } catch (err) {
        console.error("Failed to fetch attendances:", err);
        throw new Error("Unable to fetch attendances. Please try again later.");
    }
}
export const getAllAttendances = await withAuth(_getAllAttendances);

export async function getPreviousVisitsByPatientId(patientId: string) {
    try {
        await connectToDB()

        // Build query to find visits for this patient
        const query: Record<string, unknown> = {
            patientId: patientId,  // Find all visits for this specific patient
            status: { $in: ['completed', 'ongoing', 'cancelled', 'waiting'] }, // Only show past visits (not pending new ones)
        }


        const previousVisits = await Attendance.find(query)
            .select('_id date status visitType') // Only get fields we need for the list
            .sort({ date: -1 }) // Sort by date, newest first
            .limit(10) // Only get last 10 visits (for performance)
            .lean() // Return plain JavaScript objects (faster)

        // Convert MongoDB ObjectIds to strings for JSON serialization
        return previousVisits.map(visit => ({
            ...visit,
            _id: (visit._id as Types.ObjectId | string).toString(),
        }))
    } catch (error) {
        console.error('Error fetching previous visits:', error)
        return [] // Return empty array if error occurs
    }
}


async function _updateAttendanceById(
    user: User,
    id: string,
    values: Record<string, unknown>
) {
    if (!user || !user._id) {
        throw new Error("Unauthorized: User is not authenticated.");
    }

    await connectToDB();

    const { ...updateFields } = values;

    if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid attendance ID.");
    }

    // Append updatedBy field to the update object
    updateFields.updatedBy = user._id;
    updateFields.status = "completed"

    try {
        const updatedAttendance = await Attendance.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedAttendance) {
            throw new Error("Attendance not found.");
        }

        return JSON.parse(JSON.stringify(updatedAttendance));
    } catch (err) {
        console.error("Failed to update attendance:", err);
        throw new Error("Unable to update attendance. Please try again later.");
    }
}

export const updateAttendance = await withAuth(_updateAttendanceById);


export async function updateUserAttendance(id: string) {
    try {
        await connectToDB();

        const updateFields = {
            status: "ongoing"
        }

        const updatedAttendance = await Attendance.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedAttendance) {
            throw new Error("Attendance not found.");
        }

        return JSON.parse(JSON.stringify(updatedAttendance));
    } catch (error) {
        throw error
    }
}


async function _deleteAttendance(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB()

        const patient = await Attendance.findById(id)

        await deleteDocument({
            actionType: 'ATTENDANCE_DELETED',
            documentId: patient._id,
            collectionName: 'Attendance',
            userId: `${user?._id}`,
            trashMessage: `Attendance with (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `User ${user.fullName} deleted Attendance with (ID: ${id}) on ${new Date().toLocaleString()}.`
        });

        return { success: true, message: "Attendance deleted successfully" };
    } catch (error) {
        console.log("error while deleting Attendance", error)
        throw error;
    }
}

export const deleteAttendance = await withAuth(_deleteAttendance)