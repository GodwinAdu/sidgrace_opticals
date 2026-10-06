"use server"

import { revalidatePath } from "next/cache";
import InventoryCategory from "../models/inventory-category.models";
import InventoryProduct from "../models/inventory-product.models";
import { connectToDB } from "../mongoose";
import History from "../models/history.models";
import { type User, withAuth } from '../helpers/auth';


interface ProductProps {
    name: string;
    categoryId: string;
    purchasePrice: number;
    salePrice: number;
    quantity: number;
    // Optional drug / pharmacy fields
    isDrug?: boolean;
    strength?: string;
    form?: string;
    unit?: string;
    reorderLevel?: number;
    prescriptionRequired?: boolean;
}

async function _createProduct(user: User, values: ProductProps, path: string) {
    try {
        const { name, categoryId, purchasePrice, salePrice, quantity } = values

        if (!user) throw new Error("user not logged in");


        await connectToDB();

        const [existingProduct, category] = await Promise.all([
            InventoryProduct.findOne({ name }),
            InventoryCategory.findById(categoryId)
        ])


        if (existingProduct) {
            throw new Error("Product already exists");
        }

        if (!category) {
            throw new Error("Invalid category ID");
        }


        const newProduct = new InventoryProduct({
            name,
            categoryId,
            purchasePrice,
            salePrice,
            quantity,
            isDrug: values.isDrug ?? false,
            strength: values.strength ?? "",
            form: values.form ?? "",
            unit: values.unit ?? "",
            reorderLevel: values.reorderLevel ?? 0,
            prescriptionRequired: values.prescriptionRequired ?? false,
            createdBy: user._id,
            action_type: "created",
        });
        const history = new History({
            actionType: 'PRODUCT_CREATED', // Use a relevant action type
            details: {
                itemId: newProduct._id,
                deletedAt: new Date(),
            },
            message: `${user.fullName} created new product with (ID: ${newProduct._id}) on ${new Date().toLocaleString()}.`,
            performedBy: user._id,
            entityId: newProduct._id,
            entityType: 'PRODUCT', // The type of the entity
        })

        category.products.push(newProduct._id);

        await Promise.all([
            newProduct.save(),
            category.save(),
            history.save(),
        ]);

        revalidatePath(path)

    } catch (error) {
        console.log("Error creating product: ", error);
        throw error;

    }

}

export const createProduct = await withAuth(_createProduct)


async function _fetchAllProducts(user: User) {
    try {

        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const products = await InventoryProduct.find({});

        if (products.length === 0) {
            console.log("No products found");
            return [];
        }

        return JSON.parse(JSON.stringify(products));

    } catch (error) {
        console.log("Error fetching inventory products: ", error);
        throw error;
    }
}

export const fetchAllProducts = await withAuth(_fetchAllProducts)


async function _fetchProductById(user: User, productId: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const product = await InventoryProduct.findById(productId);

        if (!product) {
            console.log("Product not found");
            return null;
        }

        return JSON.parse(JSON.stringify(product));

    } catch (error) {
        console.log("Error fetching inventory product by id: ", error);
        throw error;
    }
}

export const fetchProductById = await withAuth(_fetchProductById)



async function _fetchProductsByCategory(user: User, categoryId: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();
        const products = await InventoryProduct.find({ categoryId });
        if (!products) {
            console.log("No products found for this category");
            return [];
        }
        return JSON.parse(JSON.stringify(products));

    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}
export const fetchProductsByCategory = await withAuth(_fetchProductsByCategory)


async function _updateProduct(user: User, productId: string, values: Partial<ProductProps>, path: string) {
    try {
        if (!user) throw new Error("User not logged in");

        await connectToDB();

        const newValues = {
            ...values,
            mod_flag: true,
            modifyBy: user._id,
            action_type: "updated",
        };

        const updatedProduct = await InventoryProduct.findByIdAndUpdate(
            productId,
            { $set: newValues },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            console.log("Product not found");
            return null;
        }

        console.log("Update successful");

        revalidatePath(path)

        return JSON.parse(JSON.stringify(updatedProduct));
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}
export const updateProduct = await withAuth(_updateProduct)

export async function deleteProduct(id: string) {
    try {
        await connectToDB();

        const product = await InventoryProduct.findByIdAndDelete(id);
        if (!product) {
            console.log("Product doesn't exist");
            return null; // or throw an error if you want to handle it differently
        }

        // Remove the product ID from the products array in InventoryCategory
        await InventoryCategory.updateMany(
            { products: id },
            { $pull: { products: id } }
        );

        console.log("Delete successfully");

        return JSON.parse(JSON.stringify(product));
    } catch (error) {
        console.error("Error deleting Product:", error);
        throw error; // throw the error to handle it at a higher level if needed
    }
}


async function _fetchDrugProducts(user: User) {
    try {
        if (!user) throw new Error("User not logged in");
        await connectToDB();
        const products = await InventoryProduct.find({ isDrug: true, del_flag: { $ne: true } })
            .populate("categoryId", "name")
            .sort({ name: 1 });
        if (!products || products.length === 0) return [];
        return JSON.parse(JSON.stringify(products));
    } catch (error) {
        console.error("Error fetching drug products:", error);
        return [];
    }
}
export const fetchDrugProducts = await withAuth(_fetchDrugProducts)
