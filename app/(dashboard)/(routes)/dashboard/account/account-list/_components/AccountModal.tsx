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
import { createAccount } from "@/lib/actions/account.actions";
import { toast } from "sonner";




const AccountSchema= z.object({
    accountName: z.string().min(1, {
        message: "name must be at least 2 characters.",
    }),
    balance: z.coerce.number()
});


export function AccountModal() {
    const router = useRouter();
    // 1. Define your form.
    const form = useForm<z.infer<typeof AccountSchema>>({
        resolver: zodResolver(AccountSchema),
        defaultValues: {
            accountName: "",
            balance: 0

        },
    });

    const { isSubmitting } = form.formState;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof AccountSchema>) {
        try {

            await createAccount(values)

            form.reset();
            router.refresh();
            toast.success("New Account created",{
                description: "New Account was added successfully...",
            });
        } catch (error) {
            console.log("error happened while creating Account", error);

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
                    <DialogTitle>Create New Account</DialogTitle>
                    <DialogDescription>
                        Create Account for new transactions.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="accountName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Enter Account Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Eg. Account name ...." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="balance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Enter Opening Balance</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Amount" {...field} />
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
