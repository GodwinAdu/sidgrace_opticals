"use server"

import { revalidatePath } from "next/cache";
import Account from "../models/account.models";
import { connectToDB } from "../mongoose";
import { currentUser } from "../helpers/current-user";
import History from "../models/history.models";
import {type User, withAuth } from "../helpers/auth";



interface CreateAccountProps {
    accountName: string;
    balance: number;
}

async function _createAccount(user: User, values: CreateAccountProps) {
    try {
        const { accountName, balance } = values;


        const schoolId = user.schoolId;

        await connectToDB();

        const existingAccount = await Account.findOne({ accountName });

        if (existingAccount) {
            throw new Error("Account already exists");
        }

        const account = new Account({
            accountName,
            balance,
            createdBy: user?._id,
            action_type: "created",
        });
        const history = new History({
            schoolId,
            actionType: 'ACCOUNT_CREATED', // Use a relevant action type
            details: {
                itemId: account._id,
                deletedAt: new Date(),
            },
            message: `User ${user.fullName} created Account named "${accountName}" (ID: ${account._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id, // User who performed the action,
            entityId: account._id,  // The ID of the deleted unit
            entityType: 'ACCOUNT',  // The type of the entity
        });

        await Promise.all([
            account.save(),
            history.save()
        ])


    } catch (error) {
        console.error("Error creating account", error);
        throw error;
    }
}


export const createAccount = await withAuth(_createAccount)


async function _getAllAccounts(user: User) {
    try {
        const schoolId = user.schoolId;

        await connectToDB();

        const accounts = await Account.find({ schoolId });
        if (accounts.length === 0) {
            return []; // or throw an error if you want to handle it differently
        }

        return JSON.parse(JSON.stringify(accounts));

    } catch (error) {
        console.log("Something went wrong", error);
        throw error;
    }
}

export const getAllAccounts = await withAuth(_getAllAccounts)


async function _getAccountById(user: User, accountId: string) {
    try {
        await connectToDB();

        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error("Account not found");
        }

        return JSON.parse(JSON.stringify(account));

    } catch (error) {
        console.log("Something went wrong", error);
        throw error;
    }
}

export const getAccountById = await withAuth(_getAccountById)

export async function updateAccount(accountId: string, values: Partial<CreateAccountProps>, path: string) {
    try {
        const user = await currentUser();

        if (!user) throw new Error('user not logged in');

        await connectToDB();

        const newValues = {
            ...values,
            mod_flag: true,
            modifyBy: user?._id,
            action_type: "updated",
        }

        const updateAccount = await Account.findByIdAndUpdate(
            accountId,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updateAccount) {
            console.log("Account not found");
            return null;
        }

        console.log("Update successful");

        revalidatePath(path)

        return JSON.parse(JSON.stringify(updateAccount));
    } catch (error) {
        console.error("Error updating House:", error);
        throw error;
    }
}


export async function deleteAccount(accountId: string) {
    try {
        await connectToDB();
        const accountToDelete = await Account.findById(accountId);

        if (!accountToDelete) {
            throw new Error('Account not found');
        }

        if (accountToDelete.balance > 0) {
            throw new Error('Account balance is greater than 0. Cannot delete account.');
        }

        const value = {
            del_flag: true
        }

        await Account.findByIdAndUpdate(
            accountId,
            { $set: value },
            { new: true, runValidators: true }
        );
    } catch (error) {
        console.log("Unable to delete account", error);
        throw error;
    }
}