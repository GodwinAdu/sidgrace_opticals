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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createStore } from "@/lib/actions/inventory-store.actions";
import { toast } from "sonner";


const formSchema = z.object({
    name: z.string().min(1, {
        message: "name must be at least 2 characters.",
    }),
    address: z.string(),
    contactNumber: z.string()
});

export function StoreModal() {
    const router = useRouter();
    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            address: "",
            contactNumber: ""
        },
    });

    const { isSubmitting } = form.formState;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {

            await createStore(values)
            form.reset();
            toast.success("New Store created",{
                description: "New Store was added successfully...",
            });
            router.refresh();
        } catch (error) {
            console.log("error happened while creating Store", error);
            toast.error( "Something went wrong",{
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
                    <DialogTitle>New Inventory Store</DialogTitle>
                    <DialogDescription>
                        Create Inventory Store.
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
                                        <FormLabel>Enter Store Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg. Book Shop ...." {...field} />
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
                                        <FormLabel>Enter Store Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter store address" {...field} />
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
                                        <FormLabel>Enter Store Contact</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg. 0545......" {...field} />
                                        </FormControl>
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
