"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/actions/inventory-category.actions";
import { toast } from "sonner";


const formSchema = z.object({
    name: z.string().min(1, {
        message: "name must be at least 2 characters.",
    }),
    storeId: z.string()
});

export function CategoryModal({ stores }: { stores: IInventoryCategory[] }) {
    const router = useRouter();
    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            storeId: ""
        },
    });

    const { isSubmitting } = form.formState;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {

            await createCategory(values)
            form.reset();
            toast.success("New Category created",{
                description: "New Account was added successfully...",
            });
            router.refresh();
        } catch (error) {
            console.log("error happened while creating category", error);
            toast.error("Something went wrong",{
                description: "Please try again later...",
            });
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className={cn(buttonVariants())}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Inventory Category</DialogTitle>
                    <DialogDescription>
                        Create Inventory Category.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Enter Category Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg.Category name ...." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="storeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Store</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a Store" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {stores.map((store)=>(
                                                    <SelectItem key={store._id} value={store._id ?? ""}>{store.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Saving ..." : "Save"}</Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
