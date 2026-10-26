"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, History } from "lucide-react";
import { recordPayment, settlePatientOutstanding } from "@/lib/actions/payment.actions";

interface Invoice {
    _id: string;
    patientId?: { _id?: string } | string;
    balance: number;
    total: number;
    amountPaid: number;
}
interface Payment {
    _id: string;
    amount: number;
    method: string;
    reference?: string;
    receivedBy?: { fullName?: string } | null;
    createdAt?: string;
}

const METHODS = [
    { value: "cash", label: "Cash" },
    { value: "card", label: "Card" },
    { value: "mobile-money", label: "Mobile Money" },
    { value: "bank-transfer", label: "Bank Transfer" },
    { value: "insurance", label: "Insurance" },
    { value: "other", label: "Other" },
];

export function PaymentPanel({
    invoice,
    payments,
    outstanding,
    currency = "",
}: {
    invoice: Invoice;
    payments: Payment[];
    outstanding?: { total: number; count: number };
    currency?: string;
}) {
    const router = useRouter();
    const path = usePathname();
    const [amount, setAmount] = useState(String(invoice.balance || 0));
    const [method, setMethod] = useState("cash");
    const [reference, setReference] = useState("");
    const [saving, setSaving] = useState(false);

    // Settle-previous-outstanding state
    const prevTotal = Number(outstanding?.total) || 0;
    const prevCount = Number(outstanding?.count) || 0;
    const [settleAmount, setSettleAmount] = useState(String(prevTotal || 0));
    const [settleMethod, setSettleMethod] = useState("cash");
    const [settling, setSettling] = useState(false);

    const patientId = typeof invoice.patientId === "object" && invoice.patientId ? invoice.patientId._id : (invoice.patientId as string);

    const settle = async () => {
        const amt = Number(settleAmount);
        if (!amt || amt <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        try {
            setSettling(true);
            const res = await settlePatientOutstanding(
                patientId as string,
                amt,
                settleMethod as "cash",
                invoice._id,
                path
            );
            toast.success(`Settled ${Number(res?.applied || 0).toFixed(2)} across ${res?.settledCount || 0} invoice(s)`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSettling(false);
        }
    };

    const save = async () => {
        const amt = Number(amount);
        if (!amt || amt <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        try {
            setSaving(true);
            await recordPayment(
                { patientId: patientId as string, invoiceId: invoice._id, amount: amt, method: method as "cash", reference },
                path
            );
            toast.success("Payment recorded");
            setReference("");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="h-fit">
            <CardContent className="space-y-4 pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Record Payment</h3>
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between"><span>Balance due</span><span className="font-bold">{Number(invoice.balance).toFixed(2)}</span></div>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Method</label>
                    <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Reference (optional)</label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ref / receipt no." />
                </div>
                <Button className="w-full" onClick={save} disabled={saving || invoice.balance <= 0}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {invoice.balance <= 0 ? "Fully Paid" : saving ? "Recording..." : "Record Payment"}
                </Button>

                <div className="border-t pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment History</p>
                    {(!payments || payments.length === 0) ? (
                        <p className="text-xs text-muted-foreground">No payments yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {payments.map((p) => (
                                <div key={p._id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <div>
                                        <p className="font-medium">{Number(p.amount).toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.method}{p.createdAt ? ` • ${new Date(p.createdAt).toLocaleDateString()}` : ""}
                                        </p>
                                    </div>
                                    {p.reference && <span className="text-xs text-muted-foreground">{p.reference}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {prevTotal > 0 && (
                    <div className="border-t pt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <History className="h-3.5 w-3.5" /> Settle Previous Outstanding
                        </p>
                        <div className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
                            <div className="flex justify-between">
                                <span>Previous unpaid ({prevCount} invoice{prevCount === 1 ? "" : "s"})</span>
                                <span className="font-bold">{currency ? `${currency} ` : ""}{prevTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="mt-2">
                            <label className="mb-1 block text-xs text-muted-foreground">Amount to settle</label>
                            <Input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
                        </div>
                        <div className="mt-2">
                            <label className="mb-1 block text-xs text-muted-foreground">Method</label>
                            <Select value={settleMethod} onValueChange={setSettleMethod}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="secondary" className="mt-3 w-full" onClick={settle} disabled={settling}>
                            {settling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                            {settling ? "Settling..." : "Settle Oldest First"}
                        </Button>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            Pays down the patient&#39;s older unpaid invoices, oldest first. Does not affect this invoice.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
