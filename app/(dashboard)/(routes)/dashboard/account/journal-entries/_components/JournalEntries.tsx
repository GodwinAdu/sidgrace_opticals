"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn, formatMoney } from "@/lib/utils";
import { Loader2, Plus, Trash2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    createDraft,
    updateDraft,
    post as postEntry,
    reverse as reverseEntry,
} from "@/lib/actions/accounting/journal-entry.actions";

type AccountOption = { _id: string; code: string; name: string; type: string };

type JournalLine = { accountId: string; debit: number; credit: number; memo?: string };

type JournalEntry = {
    _id: string;
    entryNo: string;
    date: string;
    memo?: string;
    status: "draft" | "posted" | "reversed";
    basis: "accrual" | "cash";
    lines: Array<{ accountId: { _id?: string; code?: string; name?: string } | string; debit?: number; credit?: number; memo?: string }>;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary",
    posted: "default",
    reversed: "outline",
};

function emptyLine(): JournalLine {
    return { accountId: "", debit: 0, credit: 0, memo: "" };
}

export function JournalEntries({
    initialEntries,
    accounts,
    currency = "",
}: {
    initialEntries: JournalEntry[];
    accounts: AccountOption[];
    currency?: string;
}) {
    const router = useRouter();
    const money = (n: number) => formatMoney(n, currency);
    const [isPending, startTransition] = useTransition();

    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [memo, setMemo] = useState("");
    const [basis, setBasis] = useState<"accrual" | "cash">("accrual");
    const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

    const accountLabel = (id: string) => {
        const a = accounts.find((x) => String(x._id) === String(id));
        return a ? a.code + " - " + a.name : "-";
    };

    const totals = useMemo(() => {
        const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
        const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
        const balanced = debit === credit && debit > 0 && lines.filter((l) => l.accountId).length >= 2;
        return { debit, credit, balanced };
    }, [lines]);

    function resetForm() {
        setEditingId(null);
        setDate(new Date().toISOString().slice(0, 10));
        setMemo("");
        setBasis("accrual");
        setLines([emptyLine(), emptyLine()]);
    }

    function openNew() {
        resetForm();
        setOpen(true);
    }

    function openEdit(entry: JournalEntry) {
        setEditingId(entry._id);
        setDate(new Date(entry.date).toISOString().slice(0, 10));
        setMemo(entry.memo || "");
        setBasis(entry.basis);
        setLines(
            (entry.lines || []).map((l) => ({
                accountId: typeof l.accountId === "object" ? String(l.accountId?._id || "") : String(l.accountId),
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0,
                memo: l.memo || "",
            })),
        );
        setOpen(true);
    }

    function setLine(i: number, patch: Partial<JournalLine>) {
        setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    }

    function addLine() {
        setLines((prev) => [...prev, emptyLine()]);
    }

    function removeLine(i: number) {
        setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
    }

    function saveDraft() {
        const payloadLines = lines
            .filter((l) => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
            .map((l) => ({
                accountId: l.accountId,
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0,
                memo: l.memo || "",
            }));

        startTransition(async () => {
            try {
                if (editingId) {
                    await updateDraft(editingId, { date, memo, basis, lines: payloadLines });
                    toast.success("Draft updated");
                } else {
                    await createDraft({ date, memo, basis, lines: payloadLines });
                    toast.success("Draft created");
                }
                setOpen(false);
                resetForm();
                router.refresh();
            } catch (error) {
                toast.error("Could not save draft", {
                    description: error instanceof Error ? error.message : "Please try again.",
                });
            }
        });
    }

    function doPost(id: string) {
        startTransition(async () => {
            try {
                await postEntry(id);
                toast.success("Entry posted");
                router.refresh();
            } catch (error) {
                toast.error("Could not post entry", {
                    description: error instanceof Error ? error.message : "Please try again.",
                });
            }
        });
    }

    function doReverse(id: string) {
        startTransition(async () => {
            try {
                await reverseEntry(id, {});
                toast.success("Entry reversed");
                router.refresh();
            } catch (error) {
                toast.error("Could not reverse entry", {
                    description: error instanceof Error ? error.message : "Please try again.",
                });
            }
        });
    }

    const lineTotal = (l: { debit?: number; credit?: number }) => (Number(l.debit) || 0) || (Number(l.credit) || 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={openNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New entry
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {initialEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No journal entries yet. Create a draft, then post it to the ledger.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Entry No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Memo</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialEntries.map((e) => {
                                    const amount = (e.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
                                    return (
                                        <TableRow key={e._id}>
                                            <TableCell className="font-mono text-xs">{e.entryNo}</TableCell>
                                            <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="max-w-[220px] truncate">{e.memo || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[e.status] ?? "secondary"} className="capitalize">
                                                    {e.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{money(amount)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {e.status === "draft" && (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => openEdit(e)} disabled={isPending}>
                                                                Edit
                                                            </Button>
                                                            <Button size="sm" onClick={() => doPost(e._id)} disabled={isPending}>
                                                                Post
                                                            </Button>
                                                        </>
                                                    )}
                                                    {e.status === "posted" && (
                                                        <Button size="sm" variant="outline" onClick={() => doReverse(e._id)} disabled={isPending}>
                                                            Reverse
                                                        </Button>
                                                    )}
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
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit draft entry" : "New journal entry"}</DialogTitle>
                        <DialogDescription>
                            Enter at least two lines. Total debits must equal total credits before you can post.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-muted-foreground">Memo</label>
                            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What is this entry for?" />
                        </div>
                    </div>

                    <div className="mt-2 space-y-2">
                        {lines.map((l, i) => (
                            <div key={i} className="grid grid-cols-12 items-center gap-2">
                                <div className="col-span-5">
                                    <Select value={l.accountId} onValueChange={(v) => setLine(i, { accountId: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map((a) => (
                                                <SelectItem key={a._id} value={String(a._id)}>
                                                    {a.code} - {a.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="Debit"
                                        value={l.debit || ""}
                                        onChange={(e) => setLine(i, { debit: Number(e.target.value) || 0, credit: 0 })}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="Credit"
                                        value={l.credit || ""}
                                        onChange={(e) => setLine(i, { credit: Number(e.target.value) || 0, debit: 0 })}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeLine(i)}
                                        disabled={lines.length <= 2}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addLine}>
                            <Plus className="mr-2 h-4 w-4" /> Add line
                        </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
                        <span className="font-medium">Totals</span>
                        <div className="flex items-center gap-6 font-mono">
                            <span>Dr {money(totals.debit)}</span>
                            <span>Cr {money(totals.credit)}</span>
                            <Badge variant={totals.balanced ? "default" : "destructive"}>
                                {totals.balanced ? "Balanced" : "Not balanced"}
                            </Badge>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={saveDraft} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save draft
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}