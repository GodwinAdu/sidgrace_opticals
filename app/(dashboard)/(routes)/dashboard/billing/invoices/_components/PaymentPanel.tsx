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
import { Loader2, Plus } from "lucide-react";
import { recordPayment } from "@/lib/actions/payment.actions";

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

export function PaymentPanel({ invoice, payments }: { invoice: Invoice; payments: Payment[] }) {
    const router = useRouter();
    const path = usePathname();
    const [amount, setAmount] = useState(String(invoice.balance || 0));
    const [method, setMethod] = useState("cash");
    const [reference, setReference] = useState("");
    const [saving, setSaving] = useState(false);

    const patientId = typeof invoice.patientId === "object" && invoice.patientId ? invoice.patientId._id : (invoice.patientId as string);

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
            </CardContent>
        </Card>
    );
}
