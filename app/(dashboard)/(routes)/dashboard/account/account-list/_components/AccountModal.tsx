"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { Loader2, PlusCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    createChartAccount,
    seedDefaultChart,
} from "@/lib/actions/accounting/chart-account.actions";
import { toast } from "sonner";

/**
 * The five accounting types, each with a plain-language hint so non-accountants
 * pick correctly. The server derives the normal balance from this and routes
 * the account into the right financial statement, so getting it right matters.
 */
const ACCOUNT_TYPES = [
    { value: "asset", label: "Asset", hint: "Things the clinic owns (cash, equipment, receivables)" },
    { value: "liability", label: "Liability", hint: "What the clinic owes (payables, loans, taxes)" },
    { value: "equity", label: "Equity", hint: "Owner's capital and retained earnings" },
    { value: "revenue", label: "Revenue", hint: "Income the clinic earns (consultations, sales)" },
    { value: "expense", label: "Expense", hint: "Costs of running the clinic (rent, wages, supplies)" },
] as const;

/** The leading-digit convention the server enforces, shown as a code hint. */
const CODE_HINT: Record<string, string> = {
    asset: "1xxx",
    liability: "2xxx",
    equity: "3xxx",
    revenue: "4xxx",
    expense: "5xxx / 6xxx",
};

const ChartAccountSchema = z.object({
    code: z.string().min(1, { message: "A code is required (e.g. 6210)." }),
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
    subtype: z.string().optional(),
    isCashAccount: z.boolean().optional(),
    description: z.string().optional(),
});

type ChartAccountValues = z.infer<typeof ChartAccountSchema>;

export function ChartAccountModal({ isEmpty = false }: { isEmpty?: boolean }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const form = useForm<ChartAccountValues>({
        resolver: zodResolver(ChartAccountSchema),
        defaultValues: {
            code: "",
            name: "",
            type: "expense",
            subtype: "",
            isCashAccount: false,
            description: "",
        },
    });

    const { isSubmitting } = form.formState;
    const selectedType = form.watch("type");

    async function onSubmit(values: ChartAccountValues) {
        try {
            await createChartAccount(values);
            form.reset();
            setOpen(false);
            router.refresh();
            toast.success("Account created", {
                description: values.code + " - " + values.name + " was added to the chart.",
            });
        } catch (error) {
            console.error("error creating chart account", error);
            toast.error("Could not create account", {
                description:
                    error instanceof Error ? error.message : "Please check the details and try again.",
            });
        }
    }

    async function onSeed() {
        try {
            setSeeding(true);
            const res = await seedDefaultChart();
            router.refresh();
            toast.success("Default chart ready", {
                description:
                    (res?.inserted ?? 0) +
                    " new account(s) added of " +
                    (res?.total ?? 0) +
                    " standard accounts.",
            });
        } catch (error) {
            console.error("error seeding default chart", error);
            toast.error("Could not seed the default chart", {
                description:
                    error instanceof Error ? error.message : "Please try again later.",
            });
        } finally {
            setSeeding(false);
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onSeed} disabled={seeding}>
                {seeding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isEmpty ? "Seed default chart" : "Add missing defaults"}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className={cn(buttonVariants())}>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add account
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New account</DialogTitle>
                        <DialogDescription>
                            Add a custom account to your chart. Opening balances are entered later
                            as a journal entry, not here.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose a type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ACCOUNT_TYPES.map((t) => (
                                                    <SelectItem key={t.value} value={t.value}>
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {ACCOUNT_TYPES.find((t) => t.value === field.value)?.hint}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 6210" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Convention: {CODE_HINT[selectedType]} for a {selectedType} account.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Cleaning Expense" {...field} />
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
                                        <FormDescription>
                                            A reporting sub-group used to subtotal statements.
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
                                            <Checkbox
                                                checked={!!field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Cash / bank account</FormLabel>
                                            <FormDescription>
                                                Tick for cash and bank accounts so they feed the cash-flow report.
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

                            <div className="flex justify-end">
                                <Button disabled={isSubmitting} type="submit">
                                    {isSubmitting ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}