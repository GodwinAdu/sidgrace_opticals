"use server"

import { revalidatePath } from "next/cache";
import InventoryCategory from "../models/inventory-category.models";
import { connectToDB } from "../mongoose";
import InventoryStore from "../models/inventory-store.models";
import { currentUser } from "../helpers/current-user";
import History from "../models/history.models";


export async function createCategory(values: { name: string, storeId: string }) {
    try {
        const { name, storeId } = values;
        const user = await currentUser();

        if (!user) throw new Error(`User not authenticated`);
        const schoolId = user.schoolId;

        await connectToDB();

        const [existingCategory, store] = await Promise.all([
            InventoryCategory.findOne({ schoolId, name }),
            InventoryStore.findById(storeId),
        ])


        if (existingCategory) {
            throw new Error("Category already exists");
        }


        if (!store) throw new Error("No such store found");

        const newCategory = new InventoryCategory({
            schoolId,
            name,
            storeId,
            createdBy: user._id,
            action_type: "created",
        });
        const history = new History({
            schoolId,
            actionType: 'CATEGORY_CREATED', // Use a relevant action type
            details: {
                itemId: newCategory._id,
                deletedAt: new Date(),
            },
            message: `${user.fullName} created new category "${name}" (ID: ${newCategory._id}) for store "${store.name}" on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: newCategory._id,
            entityType: 'CATEGORY', // The type of the entity
        })

        store.categories.push(newCategory._id);
        await Promise.all([
            newCategory.save(),
            store.save(),
            history.save(),
        ]);

    } catch (error) {
        console.error("Error creating category for category", error);
        throw error;
    }
}



export async function fetchCategories() {
    try {
        const user = await currentUser();

        if (!user) {
            throw new Error('User not authenticated');
        };
        const schoolId = user.schoolId;

        await connectToDB();

        const categories = await InventoryCategory.find({schoolId})
        .populate('createdBy', 'fullName');

        if (categories.length === 0) {
            console.log('Categories don\'t exist');
            return []; // or throw an error if you want to handle it differently
        }

        return JSON.parse(JSON.stringify(categories));

    } catch (error) {
        console.error("Error fetching categories for category", error);
        throw error;
    }
}

export async function fetchCategoryById(id: string) {
    try {
        await connectToDB();
        const category = await InventoryCategory.findById(id)

        if (!category) {
            console.log("Category doesn't exist")
        }

        return JSON.parse(JSON.stringify(category));
    } catch (error) {
        console.log("unable to fetch Category", error);
        throw error;
    }
}




interface updateCategoryProps {
    name: string;
   storeId:string;
}



export async function updateCategory(categoryId: string, values: updateCategoryProps, path: string) {
    try {
        const user = await currentUser();

        await connectToDB();

        const newValues = {
            ...values,
            mod_flag: true,
            modifyBy: user?._id,
            action_type: "updated",
        }

        const updatedCategory = await InventoryCategory.findByIdAndUpdate(
            categoryId,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            console.log("Category not found");
            return null;
        }

        console.log("Update successful");

        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedCategory));
    } catch (error) {
        console.error("Error updating House:", error);
        throw error;
    }
}

export async function deleteCategory(id: string) {
    try {
        await connectToDB();

        // Find the category by ID
        const category = await InventoryCategory.findById(id);

        if (!category) {
            console.log("category doesn't exist");
            return null; // or throw an error if you want to handle it differently
        }

        // Check if the category has any products
        if (category.products && category.products.length > 0) {
            console.log("category has products and cannot be deleted");
            throw new Error("category has products and cannot be deleted")
        }
        await InventoryCategory.findByIdAndDelete(id)

        // Remove the product ID from the products array in InventoryStore
        await InventoryStore.updateMany(
            { categories: id },
            { $pull: { categories: id } }
        );
        console.log("delete successfully")

        return JSON.parse(JSON.stringify(category));

    } catch (error) {
        console.error("Error deleting Category:", error);
        throw error; // throw the error to handle it at a higher Category if needed
    }

}

