"use server"

import { revalidatePath } from "next/cache";
import Role from "../models/role.models";
import { connectToDB } from "../mongoose";
import { currentUser } from "../helpers/current-user";
import { deleteDocument } from "./trash.actions";
import { type User, withAuth } from "../helpers/auth";



interface CreateRoleProps {
    name: string
    displayName: string
    description?: string
    dashboard: boolean
    opdManagement: boolean
    attendantManagement: boolean
    patientManagement: boolean
    staffManagement: boolean
    appointmentManagement: boolean
    accountManagement: boolean
    salesManagement: boolean
    messaging: boolean
    inventoryManagement: boolean
    report: boolean
    trash: boolean
    history: boolean
    addOpd: boolean
    manageOpd: boolean
    viewOpd: boolean
    editOpd: boolean
    deleteOpd: boolean
    addAttendance: boolean
    manageAttendance: boolean
    viewAttendance: boolean
    editAttendance: boolean
    deleteAttendance: boolean
    addStaff: boolean
    manageStaff: boolean
    viewStaff: boolean
    editStaff: boolean
    deleteStaff: boolean
    addPatient: boolean
    managePatient: boolean
    viewPatient: boolean
    editPatient: boolean
    deletePatient: boolean
    addAppointment: boolean
    manageAppointment: boolean
    viewAppointment: boolean
    editAppointment: boolean
    deleteAppointment: boolean
    addAccount: boolean
    manageAccount: boolean
    viewAccount: boolean
    editAccount: boolean
    deleteAccount: boolean
    addSales: boolean
    manageSales: boolean
    viewSales: boolean
    editSales: boolean
    deleteSales: boolean
    addInventory: boolean
    manageInventory: boolean
    viewInventory: boolean
    editInventory: boolean
    deleteInventory: boolean
    AccountReport: boolean
    inventoryReport: boolean
    attendanceReport: boolean
}
async function _createRole(user: User, values: CreateRoleProps, path: string) {
    const {
        name,
        displayName,
        description,
        ...permissions
    } = values;

    try {
        if (!user) throw new Error("User not authenticated")
        await connectToDB();
        // Check if any existing role matches the provided name, display name, or description
        const existingRole = await Role.findOne({
            $or: [
                { name },
                { displayName },
                { description }
            ]
        });

        // If an existing role is found, throw an error
        if (existingRole) {
            throw new Error('Role with the same name, display name, or description already exists');
        }

        const role = new Role({
            name,
            displayName,
            description,
            createdBy: user?._id,
            action_type: "create",
            ...permissions
        });

        await role.save();

        revalidatePath(path)

    } catch (error) {
        throw error;
    }
}

export const createRole = await withAuth(_createRole)


async function _fetchRoleById(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")
        await connectToDB();

        const role = await Role.findById(id);

        if (!role) {
            throw new Error('No Role found')
        }


        return JSON.parse(JSON.stringify(role))

    } catch (error) {
        console.error("Error fetching role by id:", error);
        throw error;
    }
}

export const fetchRoleById = await withAuth(_fetchRoleById)

async function _getAllRoles(user: User) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB();
        const roles = await Role.find({});

        if (!roles || roles.length === 0) {
            console.log("Roles don't exist");
            return []
        }

        return JSON.parse(JSON.stringify(roles))

    } catch (error) {
        console.error("Error fetching roles:", error);
        throw error;
    }
}
export const getAllRoles = await withAuth(_getAllRoles)


async function _getRolesName(user: User) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB();

        const roles = await Role.find({}, { displayName: 1, _id: 1 });


        if (!roles || roles.length === 0) {
            console.log("Roles name don't exist");
            return null; // or throw an error if you want to handle it differently
        }

        return JSON.parse(JSON.stringify(roles))

    } catch (error) {
        console.error("Error fetching roles name:", error);
        throw error;
    }
}

export const getRoleName = await withAuth(_getRolesName)


async function _updateRole(user: User, roleId: string, values: Partial<CreateRoleProps>, path: string) {

    try {
        if (!user) throw new Error("User not authenticated")
        await connectToDB();
        const updatedRole = await Role.findByIdAndUpdate(
            roleId,
            { $set: values },
            { new: true, runValidators: true }
        );

        if (!updatedRole) {
            console.log("Role not found");
            return null;
        }

        console.log("Update successful");

        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedRole));
    } catch (error) {
        console.error("Error updating role:", error);
        throw error;
    }
}

export const updateRole = await withAuth(_updateRole)

export async function fetchRole(value: string) {
    try {
        await connectToDB();

        const role = await Role.findOne({ displayName: value });

        if (!role) {
            throw new Error("Role not found");
        }

        return JSON.parse(JSON.stringify(role));

    } catch (error) {
        console.log('Error fetching role', error);
        throw error;
    }

}



export async function deleteRole(id: string) {
    try {
        const user = await currentUser();
        const result = await deleteDocument({
            actionType: 'ROLE_DELETED',
            documentId: id,
            collectionName: 'Role',
            userId: user?._id,
            trashMessage: `Role with ID ${id} deleted by ${user.fullName}`,
            historyMessage: `Role with ID ${id} deleted by ${user.fullName}`
        });

        console.log(`Role with ID ${id} deleted by user ${user._id}`);
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        console.error("Error deleting role:", error);
        throw new Error('Failed to delete the role. Please try again.');
    }

}