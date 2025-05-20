"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "next/navigation";
import { CardContent, Card } from '@/components/ui/card';
import { updateAccount } from "@/lib/actions/account.actions";
import { toast } from "sonner";



const formSchema = z.object({
    accountName: z.string().min(2, {
        message: "name must be at least 2 characters.",
    }),
    balance: z.coerce.number(),
});

export function EditAccount({ initialData }: { initialData: IAccount }) {

    const router = useRouter();
    const path = usePathname();


const accountId = initialData?._id as string;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData,
    });

    const { isSubmitting } = form.formState;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await updateAccount(accountId, values, path);

            toast.success( "Update Successfully",{
                description: "Update Account  successfully...",
            });
            form.reset();
            router.push(`/dashboard/account/account-list`);
        } catch (error) {
            console.log("error happened while updating day", error);

            toast( "Something went wrong",{
                description:"Please try again later",
            });
        }
    }

    return (
        <div className="mx-auto max-w-xl w-[96%]">
            <Card>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="accountName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Enter Account Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter " {...field} />
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
                                        <FormLabel>Account Balance</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Enter created By" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            You can change to suit your needs...
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button disabled={isSubmitting} type="submit">
                                {isSubmitting ? "Updating..." : "Update"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
