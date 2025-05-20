"use server"

import History from "../models/history.models";
import { connectToDB } from "../mongoose";
import { type User, withAuth } from '../helpers/auth';


async function _fetchAllHistories(user: User, lastId: string | null, limit: number) {
    try {
        if (!user) throw new Error('User not logged in');

        await connectToDB();

        // Explicitly type `query` to allow dynamic properties
        const query: { _id?: { $lt: string } } = {};
        console.log("Query object before adding lastId:", query);

        if (lastId) {
            query._id = { $lt: lastId }; // Fetch only documents with `_id` less than `lastId`
        }

        const histories = await History.find(query)
            .populate("performedBy", "fullName")
            .sort({ _id: -1 }) // Sort by descending `_id`
            .limit(limit)
            .exec();

        return JSON.parse(JSON.stringify(histories));
    } catch (error) {
        console.error("Error fetching histories:", error);
        throw error;
    }
}

export const fetchAllHistories = await withAuth(_fetchAllHistories)




async function _deleteHistory(user: User, id: string) {
    try {

        if (!user) throw new Error('User not logged in');
        // Ensure the database connection
        await connectToDB();

        // Attempt to find and delete the document
        const deletedHistory = await History.findByIdAndDelete(id);

        // Check if the document existed
        if (!deletedHistory) {
            console.warn(`No history found with ID ${id}`);
            throw new Error(`History with ID ${id} does not exist`);
        }

        console.log(`History with ID ${id} deleted successfully`);
    } catch (error) {
        console.error("Error deleting history:", error);
        throw new Error(`Failed to delete history with ID ${id}: ${error}`);
    }
}

export const deleteHistory = await withAuth(_deleteHistory)