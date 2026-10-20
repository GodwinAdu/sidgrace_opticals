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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePathname, useRouter } from "next/navigation";
import { CardContent, Card } from "@/components/ui/card";
import { updateChartAccount } from "@/lib/actions/accounting/chart-account.actions";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = {
    asset: "Asset",
    liability: "Liability",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expense",
};

type ChartAccount = {
    _id: string;
    code: string;
    name: string;
    type: string;
    subtype?: string;
    isCashAccount?: boolean;
    description?: string;
    parentId?: string | null;
    normalBalance?: string;
};

const NONE = "__none__";

const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    subtype: z.string().optional(),
    isCashAccount: z.boolean().optional(),
    description: z.string().optional(),
    parentId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditAccount({
    initialData,
    parentOptions = [],
}: {
    initialData: ChartAccount;
    parentOptions?: ChartAccount[];
}) {
    const router = useRouter();
    const path = usePathname();
    const accountId = initialData?._id as string;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name ?? "",
            subtype: initialData?.subtype ?? "",
            isCashAccount: !!initialData?.isCashAccount,
            description: initialData?.description ?? "",
            parentId: initialData?.parentId ? String(initialData.parentId) : NONE,
        },
    });

    const { isSubmitting } = form.formState;

    async function onSubmit(values: FormValues) {
        try {
            await updateChartAccount(
                accountId,
                {
                    name: values.name,
                    subtype: values.subtype,
                    isCashAccount: values.isCashAccount,
                    description: values.description,
                    parentId: values.parentId && values.parentId !== NONE ? values.parentId : null,
                },
                path,
            );
            toast.success("Account updated", {
                description: "Your changes were saved.",
            });
            router.push(`/dashboard/account/account-list`);
            router.refresh();
        } catch (error) {
            console.error("error updating chart account", error);
            toast.error("Something went wrong", {
                description: error instanceof Error ? error.message : "Please try again later.",
            });
        }
    }

    return (
        <div className="mx-auto max-w-xl w-[96%]">
            <Card>
                <CardContent className="pt-6">
                    {/* Read-only identity: code + type + normal balance are fixed after creation. */}
                    <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-muted/40 p-4 text-sm">
                        <div>
                            <div className="text-xs text-muted-foreground">Code</div>
                            <div className="font-mono">{initialData.code}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Type</div>
                            <div>{TYPE_LABEL[initialData.type] ?? initialData.type}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Normal Balance</div>
                            <div className="capitalize">{initialData.normalBalance ?? "-"}</div>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Account name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="subtype"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Group (optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. operating-expense" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="parentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Parent account (optional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || NONE}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="No parent" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>No parent</SelectItem>
                                                {parentOptions.map((p) => (
                                                    <SelectItem key={p._id} value={String(p._id)}>
                                                        {p.code} - {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Only same-type accounts can be a parent.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isCashAccount"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Cash / bank account</FormLabel>
                                            <FormDescription>
                                                Feeds the cash-flow report.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="What this account is used for" {...field} />
                                        </FormControl>
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