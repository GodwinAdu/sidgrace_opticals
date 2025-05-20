"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useParams, usePathname, useRouter } from "next/navigation"
import { createProduct, updateProduct } from "@/lib/actions/inventory-product.actions"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
const formSchema = z.object({
    name: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    categoryId: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    purchasePrice: z.coerce.number(),
    salePrice: z.coerce.number(),
    quantity: z.coerce.number(),
})


const ProductForm = ({
    categories,
    type,
    initialData
}: {
    categories: { name: string, _id: string }[],
    type: "create" | "update",
    initialData?: IInventoryProduct,
}) => {
    const router = useRouter();
    const path = usePathname();
    const params = useParams();

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ?? {
            name: "",
            categoryId: "",
            purchasePrice: 0,
            salePrice: 0,
            quantity: 0
        },
    })

    const { isSubmitting } = form.formState;
    const submit = initialData ? "Update product" : "Create product";
    const submitting = initialData ? "Updating ..." : "Creating ...";
    const productId = initialData?._id as string;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "create") {
                await createProduct(values, path)
            }

            if (type === "update") {
                await updateProduct(productId, values, path)
            }
            form.reset()
            router.push(`/dashboard/inventory/products`)
            toast.success(`Product ${type === "create" ? "Create" : "Update"}`,{
                description: `product was ${type === "create" ? "added" : "update"} successfully...`,
            })

        } catch (error) {
            console.error("Failed to submit values  for form schema", error);
            toast.error( "Failed to submit form",{
                description: "Failed to submit form due to an error. Please try again.",
            })

        }
    }
    return (
        <Card>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Product Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categories</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="purchasePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="salePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sales Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </div>

                        <Button disabled={isSubmitting} type="submit">
                            {isSubmitting ? submitting : submit}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

export default ProductForm
