"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose"
import Department from '../models/department.models';
import History from "../models/history.models";
import { User, withAuth } from '../helpers/auth';


async function _createDepartment(user: User, values: { name: string }) {
    try {
        const { name } = values

        if (!user) throw new Error('User not authenticated');

        await connectToDB();

        const existingDepartment = await Department.findOne({ name });

        if (existingDepartment) {
            throw new Error("Department already exists");
        }

        const department = new Department({
            name,
            createdBy: user?._id,
            action_type: "created",
        });

        const history = new History({
            actionType: 'DEPARTMENT_CREATED', // Use a relevant action type
            details: {
                itemId: department._id,
                deletedAt: new Date(),
            },
            message: `${user.fullName} created new department with (ID: ${department._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id, // User who performed the action,
            entityId: department._id,  // The ID of the deleted unit
            entityType: 'DEPARTMENT',  // The type of the entity
        });

        await Promise.all([
            department.save(),
            history.save()
        ]);

    } catch (error) {
        console.log("unable to create new department", error)
        throw error;
    }
}

export const createDepartment = await withAuth(_createDepartment)

async function _fetchDepartmentById(user: User, id: string) {
    try {
        if (!user) throw new Error('User not authenticated');

        await connectToDB();
        const department = await Department.findById(id)

        if (!department) {
            console.log("department doesn't exist")
        }
        return JSON.parse(JSON.stringify(department));
    } catch (error) {
        console.log("unable to fetch department", error);
        throw error;
    }
}

export const fetchDepartmentById = await withAuth(_fetchDepartmentById)


async function _getAllDepartments(user: User) {
    try {

        if (!user) throw new Error('user not logged in');

        await connectToDB();

        const departments = await Department.find({})
            .populate("createdBy", "fullName")
            .exec()

        if (!departments || departments.length === 0) {

            console.log("departments don't exist");

            return []; // or throw an error if you want to handle it differently
        }

        return JSON.parse(JSON.stringify(departments));

    } catch (error) {
        console.error("Error fetching Departments:", error);
        throw error; // throw the error to handle it at a higher Day if needed
    }
}

export const getAllDepartments = await withAuth(_getAllDepartments)

interface UpdateDepartmentProps {
    name: string;
    createdBy: string;
}

async function _updateDepartment(user:User,departmentId: string, values: UpdateDepartmentProps, path: string) {
    try {

        if (!user) throw new Error('User not authenticated');

        await connectToDB();

        const newValues = {
            ...values,
            mod_flag: true,
            modifyBy: user._id,
            action_type: "updated",
        }
        const updatedDepartment = await Department.findByIdAndUpdate(
            departmentId,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updatedDepartment) {
            console.log("department not found");
            return null;
        }

        console.log("Update successful");

        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedDepartment));
    } catch (error) {
        console.error("Error updating department:", error);
        throw error;
    }
}

export const updateDepartment = await withAuth(_updateDepartment)
async function _deleteDepartment(user:User,id:string) {
    try {

        if (!user) throw new Error('user not logged in');

        await connectToDB();

        const department = await Department.findByIdAndDelete(id)

        if (!department) {
            console.log("department don't exist");
            return null; // or throw an error if you want to handle it differently
        }
        console.log("delete successfully")

        return JSON.parse(JSON.stringify(department));

    } catch (error) {
        console.error("Error deleting department:", error);
        throw error; // throw the error to handle it at a higher Department if needed
    }

}

export const deleteDepartment = await withAuth(_deleteDepartment)

