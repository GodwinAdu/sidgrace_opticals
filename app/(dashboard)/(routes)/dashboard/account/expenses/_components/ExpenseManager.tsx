"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, Trash2, TrendingDown } from "lucide-react";
import { recordExpense, deleteTransaction } from "@/lib/actions/transaction.actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants/accounting";
import { formatMoney } from "@/lib/utils";

interface Txn {
    _id: string;
    category: string;
    amount: number;
    date?: string;
    description?: string;
    createdBy?: { fullName?: string } | null;
}

export function ExpenseManager({ expenses, currency = "" }: { expenses: Txn[]; currency?: string }) {
    const router = useRouter();
    const path = usePathname();
    const money = (n: number) => formatMoney(n, currency);
    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const save = async () => {
        if (!Number(amount) || Number(amount) <= 0) return toast.error("Enter a valid amount");
        try {
            setSaving(true);
            await recordExpense({ category, amount: Number(amount), date, description }, path);
            toast.success("Expense recorded");
            setAmount(""); setDescription("");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    const remove = async (id: string) => {
        try { setBusyId(id); await deleteTransaction(id, path); toast.success("Expense removed"); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card className="h-fit">
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Record Expense</h3>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                    </div>
                    <Button className="w-full" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Record Expense
                    </Button>
                </CardContent>
            </Card>

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Expenses</h3>
                    <div className="flex items-center gap-2 text-sm text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        <span className="font-bold">{money(total)}</span>
                    </div>
                </div>
                {(!expenses || expenses.length === 0) ? (
                    <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
                ) : (
                    <div className="space-y-2">
                        {expenses.map((e) => (
                            <Card key={e._id}>
                                <CardContent className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-medium">{e.category}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {e.date ? new Date(e.date).toLocaleDateString() : ""}
                                            {e.description ? ` • ${e.description}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-semibold text-red-600">{money(e.amount)}</span>
                                        <button onClick={() => remove(e._id)} disabled={busyId === e._id} className="text-red-500 hover:text-red-700">
                                            {busyId === e._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
