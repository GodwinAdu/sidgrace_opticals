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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createProcedure } from "@/lib/actions/procedure.actions";
import { toast } from "sonner";

const ProcedureSchema = z.object({
    code: z.string().min(1, { message: "Code is required." }),
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    category: z.string().min(1, { message: "Category is required." }),
    description: z.string().optional(),
    defaultDuration: z.coerce.number().min(1),
    price: z.coerce.number().min(0),
});

export function ProcedureModal() {
    const router = useRouter();
    const form = useForm<z.infer<typeof ProcedureSchema>>({
        resolver: zodResolver(ProcedureSchema),
        defaultValues: {
            code: "",
            name: "",
            category: "General",
            description: "",
            defaultDuration: 30,
            price: 0,
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: z.infer<typeof ProcedureSchema>) {
        try {
            await createProcedure(values);
            form.reset();
            router.refresh();
            toast.success("Procedure created", {
                description: "The procedure was added to the catalog.",
            });
        } catch (error) {
            console.log("error creating procedure", error);
            toast.error("Something went wrong", { description: "Please try again later..." });
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className={cn(buttonVariants())}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Procedure
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>New Procedure</DialogTitle>
                    <DialogDescription>Add a dental procedure to the catalog.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. D2140" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Restorative" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Procedure Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Amalgam filling - one surface" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="defaultDuration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duration (min)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Optional notes about this procedure" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button disabled={isSubmitting} type="submit">
                                {isSubmitting ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
