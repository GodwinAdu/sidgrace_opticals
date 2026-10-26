"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Target } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";
import {
    createBudget,
    updateBudget,
    deleteBudget,
} from "@/lib/actions/accounting/budget.actions";

interface Populated {
    _id?: string;
    code?: string;
    name?: string;
    type?: string;
}

interface BudgetRow {
    _id: string;
    fiscalYear: number;
    periodNo?: number | null;
    accountId?: Populated | string | null;
    departmentId?: Populated | string | null;
    amount: number;
    note?: string;
}

interface AccountOption {
    _id: string;
    code: string;
    name: string;
    type: string;
}

const WHOLE_YEAR = "__year__";

const PERIOD_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const periodLabel = (periodNo?: number | null) =>
    typeof periodNo === "number" && periodNo >= 1 && periodNo <= 12
        ? PERIOD_LABELS[periodNo - 1]
        : "Whole year";

const EMPTY_FORM = {
    fiscalYear: new Date().getFullYear(),
    periodNo: WHOLE_YEAR,
    accountId: "",
    amount: "",
    note: "",
};

export default function BudgetManager({
    budgets: initial,
    accounts,
    fiscalYear,
    currency = "",
}: {
    budgets: BudgetRow[];
    accounts: AccountOption[];
    fiscalYear: number;
    currency?: string;
}) {
    const router = useRouter();
    const path = usePathname();
    const money = (n: number) => formatMoney(n, currency);
    const [isPending, startTransition] = useTransition();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BudgetRow | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM, fiscalYear });
    const [busyId, setBusyId] = useState<string | null>(null);

    // Budgets most commonly target revenue/expense accounts, but any account is
    // allowed; the picker shows the type so the user can scope the budget.
    const accountOptions = useMemo(
        () => accounts.filter((a) => a.type === "expense" || a.type === "revenue").length
            ? accounts.filter((a) => a.type === "expense" || a.type === "revenue")
            : accounts,
        [accounts],
    );

    const accountMeta = (acc?: Populated | string | null): Populated | null => {
        if (!acc) return null;
        if (typeof acc === "object") return acc;
        const found = accounts.find((a) => a._id === acc);
        return found ? { _id: found._id, code: found.code, name: found.name } : { _id: acc };
    };

    const set = (key: keyof typeof form, value: string | number) =>
        setForm((f) => ({ ...f, [key]: value }));

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, fiscalYear });
        setOpen(true);
    };

    const openEdit = (b: BudgetRow) => {
        setEditing(b);
        const acc = accountMeta(b.accountId);
        setForm({
            fiscalYear: b.fiscalYear,
            periodNo: typeof b.periodNo === "number" ? String(b.periodNo) : WHOLE_YEAR,
            accountId: acc?._id || "",
            amount: String(b.amount ?? ""),
            note: b.note || "",
        });
        setOpen(true);
    };

    const save = () => {
        const amount = Number(form.amount);
        if (!editing && !form.accountId) {
            toast.error("Select an account to budget");
            return;
        }
        if (!Number.isFinite(amount) || amount < 0) {
            toast.error("Enter a budget amount of zero or greater");
            return;
        }
        startTransition(async () => {
            try {
                if (editing?._id) {
                    await updateBudget(
                        editing._id,
                        { amount, note: form.note.trim() },
                        path,
                    );
                    toast.success("Budget updated");
                } else {
                    await createBudget(
                        {
                            fiscalYear: Number(form.fiscalYear),
                            periodNo:
                                form.periodNo === WHOLE_YEAR ? null : Number(form.periodNo),
                            accountId: form.accountId,
                            amount,
                            note: form.note.trim(),
                        },
                        path,
                    );
                    toast.success("Budget created");
                }
                setOpen(false);
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Something went wrong");
            }
        });
    };

    const remove = (b: BudgetRow) => {
        setBusyId(b._id);
        startTransition(async () => {
            try {
                await deleteBudget(b._id, path);
                toast.success("Budget deleted");
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Budget cannot be deleted");
            } finally {
                setBusyId(null);
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Budgets — FY {fiscalYear}
                </h3>
                <Button onClick={openCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> New Budget
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {!initial || initial.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                            <Target className="h-8 w-8" />
                            <p className="text-sm">
                                No budgets for this fiscal year yet. Add one to enable budget-vs-actual and over-budget guards.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Note</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initial.map((b) => {
                                    const acc = accountMeta(b.accountId);
                                    return (
                                        <TableRow key={b._id}>
                                            <TableCell>
                                                <div className="font-medium">{acc?.name || "—"}</div>
                                                {acc?.code ? (
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {acc.code}
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{periodLabel(b.periodNo)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {money(b.amount)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {b.note || "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEdit(b)}
                                                        disabled={isPending}
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => remove(b)}
                                                        disabled={isPending && busyId === b._id}
                                                        title="Delete"
                                                    >
                                                        {busyId === b._id && isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Budget" : "New Budget"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="budget-year">Fiscal year</Label>
                                <Input
                                    id="budget-year"
                                    type="number"
                                    value={form.fiscalYear}
                                    disabled={!!editing}
                                    onChange={(e) => set("fiscalYear", Number(e.target.value))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Period</Label>
                                <Select
                                    value={form.periodNo}
                                    disabled={!!editing}
                                    onValueChange={(v) => set("periodNo", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Whole year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={WHOLE_YEAR}>Whole year</SelectItem>
                                        {PERIOD_LABELS.map((label, idx) => (
                                            <SelectItem key={label} value={String(idx + 1)}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Account</Label>
                            <Select
                                value={form.accountId}
                                disabled={!!editing}
                                onValueChange={(v) => set("accountId", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accountOptions.map((a) => (
                                        <SelectItem key={a._id} value={a._id}>
                                            {a.code} — {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editing ? (
                                <p className="text-xs text-muted-foreground">
                                    The account and period are fixed on create. Delete and recreate to change them.
                                </p>
                            ) : null}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="budget-amount">Amount</Label>
                            <Input
                                id="budget-amount"
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => set("amount", e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="budget-note">Note</Label>
                            <Textarea
                                id="budget-note"
                                rows={2}
                                value={form.note}
                                onChange={(e) => set("note", e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editing ? "Save Changes" : "Create Budget"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
