"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Send, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";
import { capture, submit } from "@/lib/actions/accounting/expense.actions";

interface AccountOption {
    _id: string;
    code: string;
    name: string;
    type: string;
}

interface VendorOption {
    _id: string;
    name: string;
}

type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "posted";

interface Populated {
    _id?: string;
    code?: string;
    name?: string;
}

interface ExpenseRow {
    _id: string;
    expenseNo: string;
    date: string;
    amount: number;
    status: ExpenseStatus;
    payee?: string;
    description?: string;
    expenseAccountId?: Populated | null;
    creditAccountId?: Populated | null;
    vendorId?: { _id?: string; name?: string } | null;
}

const NONE = "__none__";

const STATUS_VARIANT: Record<ExpenseStatus, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    submitted: "outline",
    approved: "default",
    rejected: "destructive",
    posted: "default",
};

export default function ExpenseWorkflow({
    expenses: initial,
    accounts,
    vendors,
    currency = "",
}: {
    expenses: ExpenseRow[];
    accounts: AccountOption[];
    vendors: VendorOption[];
    currency?: string;
}) {
    const router = useRouter();
    const path = usePathname();
    const money = (n: number) => formatMoney(n, currency);
    const [isPending, startTransition] = useTransition();
    const [busyId, setBusyId] = useState<string | null>(null);

    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [amount, setAmount] = useState("");
    const [expenseAccountId, setExpenseAccountId] = useState("");
    const [creditAccountId, setCreditAccountId] = useState("");
    const [vendorId, setVendorId] = useState("");
    const [payee, setPayee] = useState("");
    const [description, setDescription] = useState("");

    // Debit side is an expense account; credit side is cash or a payable.
    const expenseAccounts = useMemo(
        () => accounts.filter((a) => a.type === "expense"),
        [accounts],
    );
    const creditAccounts = useMemo(
        () => accounts.filter((a) => a.type === "asset" || a.type === "liability"),
        [accounts],
    );

    const resetForm = () => {
        setAmount("");
        setExpenseAccountId("");
        setCreditAccountId("");
        setVendorId("");
        setPayee("");
        setDescription("");
    };

    const captureExpense = () => {
        if (!Number(amount) || Number(amount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        if (!expenseAccountId) {
            toast.error("Pick an expense account (debit side)");
            return;
        }
        if (!creditAccountId) {
            toast.error("Pick a credit account (cash or payable)");
            return;
        }
        startTransition(async () => {
            try {
                await capture(
                    {
                        date,
                        amount: Number(amount),
                        expenseAccountId,
                        creditAccountId,
                        vendorId: vendorId || null,
                        payee: payee.trim(),
                        description: description.trim(),
                    },
                    path,
                );
                toast.success("Expense captured as draft");
                resetForm();
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Something went wrong");
            }
        });
    };

    const submitExpense = (id: string) => {
        setBusyId(id);
        startTransition(async () => {
            try {
                const result = await submit(id, path);
                // Over-budget hook: budgets land in a later layer. When the submit
                // action starts returning a `warnings` array, surface each one as a
                // toast; until then this is simply skipped. Loosely coupled — no
                // budget action is imported here.
                const warnings = (result as { warnings?: string[] } | null)?.warnings;
                if (Array.isArray(warnings) && warnings.length > 0) {
                    warnings.forEach((w) => toast.warning(w));
                }
                toast.success("Expense submitted for approval");
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Something went wrong");
            } finally {
                setBusyId(null);
            }
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <Card className="h-fit">
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Capture Expense
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Date</Label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Amount</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Expense account (debit)</Label>
                        <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select expense account" />
                            </SelectTrigger>
                            <SelectContent>
                                {expenseAccounts.map((a) => (
                                    <SelectItem key={a._id} value={a._id}>
                                        {a.code} — {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Credit account (cash / payable)</Label>
                        <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select cash or payable account" />
                            </SelectTrigger>
                            <SelectContent>
                                {creditAccounts.map((a) => (
                                    <SelectItem key={a._id} value={a._id}>
                                        {a.code} — {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Vendor (optional)</Label>
                        <Select
                            value={vendorId || NONE}
                            onValueChange={(v) => setVendorId(v === NONE ? "" : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="No vendor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>No vendor</SelectItem>
                                {vendors.map((v) => (
                                    <SelectItem key={v._id} value={v._id}>
                                        {v.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Payee</Label>
                        <Input value={payee} onChange={(e) => setPayee(e.target.value)} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <Button className="w-full" onClick={captureExpense} disabled={isPending}>
                        {isPending && !busyId ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        Capture Expense
                    </Button>
                </CardContent>
            </Card>

            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Expenses
                </h3>
                <Card>
                    <CardContent className="pt-6">
                        {!initial || initial.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                                <Receipt className="h-8 w-8" />
                                <p className="text-sm">No expenses captured yet.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No.</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Vendor / Payee</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initial.map((e) => (
                                        <TableRow key={e._id}>
                                            <TableCell className="font-mono text-xs">{e.expenseNo}</TableCell>
                                            <TableCell className="text-sm">
                                                {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {e.expenseAccountId?.name || "—"}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {e.vendorId?.name || e.payee || "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {money(e.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {e.status === "draft" || e.status === "rejected" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => submitExpense(e._id)}
                                                        disabled={isPending && busyId === e._id}
                                                    >
                                                        {isPending && busyId === e._id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Send className="mr-2 h-4 w-4" />
                                                        )}
                                                        Submit
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
