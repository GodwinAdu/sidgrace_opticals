"use server"

import { revalidatePath } from "next/cache";
import InventoryStore from "../models/inventory-store.models";
import { connectToDB } from "../mongoose";
import History from "../models/history.models";
import { User, withAuth } from '../helpers/auth';

interface StoreProps {
    name: string;
    address: string;
    contactNumber: string;
}
async function _createStore(user: User, values: StoreProps) {
    try {
        const { name, address, contactNumber } = values;


        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const existingStore = await InventoryStore.findOne({ name });

        if (existingStore) {
            throw new Error("Store already exists");
        }

        const newStore = new InventoryStore({
            name,
            address,
            contactNumber,
            createdBy: user._id,
            action_type: "created",
        });

        const history = new History({
            actionType: 'INVENTORY_STORE_CREATED',
            details: {
                itemId: newStore._id,
                deletedAt: new Date(),
            },
            message: `${user.fullName} created new store with (ID: ${newStore._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: newStore._id,
            entityType: 'STORE', // The type of the entity, e.g., 'PRODUCT', 'SUPPLIER', etc.
        });

        await Promise.all([
            newStore.save(),
            history.save(),
        ]);

    } catch (error) {
        console.log("Error creating store", error)
        throw error;

    }
}
export const createStore = await withAuth(_createStore)


async function _fetchAllStores(user:User) {
    try {

        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const stores = await InventoryStore.find({});

        if (stores.length === 0) {
            console.log("No stores found");
            return [];
        }

        return JSON.parse(JSON.stringify(stores));

    } catch (error) {
        console.log("Error fetching all stores", error);
        throw error;
    }

}
export const fetchAllStores = await withAuth(_fetchAllStores)

async function _fetchStoreById(user:User, id: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const store = await InventoryStore.findById(id);

        if (!store) {
            console.log("Store not found");
            return null;
        }

        return JSON.parse(JSON.stringify(store));

    } catch (error) {
        console.log("Error fetching store by id", error);
        throw error;
    }
}
export const fetchStoreById = await withAuth(_fetchStoreById)



async function _updateStore(user:User,id: string, values: Partial<StoreProps>, path: string) {
    try {


        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const newValues = {
            ...values,
            mod_flag: true,
            modifyBy: user?._id,
            action_type: "updated",
        };

        const updatedStore = await InventoryStore.findByIdAndUpdate(
            id,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updatedStore) {
            console.log("Store not found");
            return null;
        }

        console.log("Update successful");
        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedStore));

    } catch (error) {
        console.error("Error updating store", error);
        throw error;
    }
}
export const updateStore = await withAuth(_updateStore)




export async function deleteStore(storeId: string) {
    try {
        await connectToDB();

        // Find the store by ID
        const store = await InventoryStore.findById(storeId);

        if (!store) {
            console.log("Store doesn't exist");
            return null; // or throw an error if you want to handle it differently
        }

        // Check if the store has any categories
        if (store.categories && store.categories.length > 0) {
            console.log("Store has categories and cannot be deleted");
            throw new Error("Store has categories and cannot be deleted")
        }

        // Proceed with deletion if no categories
        await InventoryStore.findByIdAndDelete(storeId);
        console.log("Delete successful");

        return JSON.parse(JSON.stringify(store));

    } catch (error) {
        console.error("Error deleting store", error);
        throw error;
    }
}
