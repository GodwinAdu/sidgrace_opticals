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
import { Input } from "@/components/ui/input"
import { useParams, usePathname, useRouter } from "next/navigation"
import { createSupplier, updateSupplier } from "@/lib/actions/inventory-supplier.actions"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
const formSchema = z.object({
    name: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    email: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    companyName: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    contactNumber: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    address: z.string(),
})


const SupplierForm = ({
    type,
    initialData
}: {
    type: "create" | "update",
    initialData?: IInventorySupplier,
}) => {
    const router = useRouter();
    const path = usePathname();
    const params = useParams();

    const { schoolId, userId } = params;
    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ?? {
            name: "",
            email: "",
            companyName: "",
            contactNumber: "",
            address: ""
        },
    })

    const { isSubmitting } = form.formState;
    const submit = initialData ? "Update supplier" : "Create supplier";
    const submitting = initialData ? "Updating ..." : "Creating ...";
    const supplierId = initialData?._id as string;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "create") {
                await createSupplier(values, path)
            }

            if (type === "update") {
                await updateSupplier(supplierId, values, path)
            }

            form.reset()

            router.push(`/${schoolId}/admin/${userId}/inventory/suppliers`)

            toast(`Supplier ${type === "create" ? "Create" : "Update"}`,{
                description: `Supplier was ${type === "create" ? "added" : "update"} successfully...`,
            })

        } catch (error) {
            console.error("Failed to submit values  for form schema", error);
            toast("Failed to submit form",{
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
                                        <FormLabel>Supplier Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Supplier Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg. hello@gmail.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />


                            <FormField
                                control={form.control}
                                name="companyName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Company Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="contactNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg. 0551556650" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Enter Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg Suame , Kumasi." {...field} />
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

export default SupplierForm
