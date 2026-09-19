"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
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
import { usePathname, useRouter } from "next/navigation";
import { CardContent, Card } from "@/components/ui/card";
import { updateProcedure } from "@/lib/actions/procedure.actions";
import { toast } from "sonner";

const formSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(2),
    category: z.string().min(1),
    description: z.string().optional(),
    defaultDuration: z.coerce.number().min(1),
    price: z.coerce.number().min(0),
});

export function EditProcedure({ initialData }: { initialData: IProcedure }) {
    const router = useRouter();
    const path = usePathname();
    const procedureId = initialData?._id as string;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: initialData?.code ?? "",
            name: initialData?.name ?? "",
            category: initialData?.category ?? "General",
            description: initialData?.description ?? "",
            defaultDuration: initialData?.defaultDuration ?? 30,
            price: initialData?.price ?? 0,
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await updateProcedure(procedureId, values, path);
            toast.success("Updated successfully", { description: "Procedure updated." });
            router.push(`/dashboard/procedures`);
        } catch (error) {
            console.log("error updating procedure", error);
            toast.error("Something went wrong", { description: "Please try again later" });
        }
    }

    return (
        <div className="mx-auto max-w-xl w-[96%]">
            <Card>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
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
                                            <FormControl><Input {...field} /></FormControl>
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
                                        <FormControl><Input {...field} /></FormControl>
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
                                            <FormControl><Input type="number" {...field} /></FormControl>
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
                                            <FormControl><Input type="number" {...field} /></FormControl>
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
                                        <FormControl><Textarea {...field} /></FormControl>
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
