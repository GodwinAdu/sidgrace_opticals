"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Ban, AlertTriangle } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { dispensePrescription, cancelPrescription } from "@/lib/actions/prescription.actions";

interface Item {
    productId?: { _id?: string; name?: string; salePrice?: number; quantity?: number } | string | null;
    drugName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    dispensedQuantity?: number;
    instructions?: string;
}
interface Prescription {
    _id: string;
    status: string;
    appointmentId?: string | null;
    createdAt?: string;
    patientId?: { fullName?: string; patientId?: string; phone?: string } | null;
    prescribedBy?: { fullName?: string } | null;
    items?: Item[];
    notes?: string;
}

export function DispenseView({ prescription, currency = "" }: { prescription: Prescription; currency?: string }) {
    const router = useRouter();
    const path = usePathname();
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(prescription.status);

    const patient = prescription.patientId;
    const linkedToVisit = !!prescription.appointmentId;
    const items = prescription.items || [];

    const prod = (it: Item) => (typeof it.productId === "object" && it.productId ? it.productId : null);
    const billable = items.filter((it) => prod(it));
    const billTotal = billable.reduce((s, it) => {
        const p = prod(it);
        return s + (Number(p?.salePrice) || 0) * (Number(it.quantity) || 0);
    }, 0);
    const stockShort = billable.some((it) => {
        const p = prod(it);
        const remaining = (Number(it.quantity) || 0) - (Number(it.dispensedQuantity) || 0);
        return (Number(p?.quantity) || 0) < remaining;
    });

    const dispense = async () => {
        if (billable.length > 0 && !linkedToVisit) {
            return toast.error("Not linked to a visit. Dispense in-stock drugs from the patient's visit billing.");
        }
        try {
            setBusy(true);
            await dispensePrescription(prescription._id, path);
            setStatus("dispensed");
            toast.success("Prescription dispensed");
            router.refresh();
        } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); }
    };

    const cancel = async () => {
        try {
            setBusy(true);
            await cancelPrescription(prescription._id, path);
            setStatus("cancelled");
            toast.success("Prescription cancelled");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setBusy(false); }
    };

    const done = status === "dispensed" || status === "cancelled";

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div>
                            <p className="font-semibold">{patient?.fullName || "Patient"}</p>
                            <p className="text-xs text-muted-foreground">
                                {patient?.patientId ? `${patient.patientId} • ` : ""}
                                {prescription.createdAt ? new Date(prescription.createdAt).toLocaleString() : ""}
                                {prescription.prescribedBy?.fullName ? ` • ${prescription.prescribedBy.fullName}` : ""}
                            </p>
                        </div>
                        <Badge className={status === "dispensed" ? "bg-green-600" : status === "cancelled" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"}>
                            {status}
                        </Badge>
                    </div>

                    <table className="mt-4 w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="py-2">Drug</th>
                                <th className="py-2">Sig</th>
                                <th className="py-2 text-center">Qty</th>
                                <th className="py-2 text-center">Stock</th>
                                <th className="py-2 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, i) => {
                                const p = prod(it);
                                const price = p ? (Number(p.salePrice) || 0) * (Number(it.quantity) || 0) : 0;
                                return (
                                    <tr key={i} className="border-b">
                                        <td className="py-2">
                                            {it.drugName}
                                            {!p && <Badge variant="outline" className="ml-2 text-xs">advisory</Badge>}
                                        </td>
                                        <td className="py-2 text-muted-foreground">{[it.dosage, it.frequency, it.duration].filter(Boolean).join(", ") || "—"}</td>
                                        <td className="py-2 text-center">{it.quantity}</td>
                                        <td className="py-2 text-center">{p ? (Number(p.quantity) || 0) : "—"}</td>
                                        <td className="py-2 text-right">{p ? formatMoney(price, currency) : "—"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {prescription.notes && <p className="mt-4 text-sm text-muted-foreground">Notes: {prescription.notes}</p>}
                </CardContent>
            </Card>

            <Card className="h-fit">
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dispense</h3>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Billable drugs</span>
                        <span>{billable.length}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                        <span>Bill total</span>
                        <span>{formatMoney(billTotal, currency)}</span>
                    </div>

                    {!linkedToVisit && billable.length > 0 && (
                        <p className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Not linked to a visit — in-stock drugs must be dispensed from the patient&#39;s visit billing to be billed.
                        </p>
                    )}
                    {stockShort && (
                        <p className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Insufficient stock for one or more drugs.
                        </p>
                    )}

                    {!done && (
                        <div className="space-y-2">
                            <Button className="w-full" onClick={dispense} disabled={busy || stockShort || (billable.length > 0 && !linkedToVisit)}>
                                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Dispense &amp; Bill Visit
                            </Button>
                            <Button variant="outline" className="w-full text-red-600" onClick={cancel} disabled={busy}>
                                <Ban className="mr-2 h-4 w-4" /> Cancel Prescription
                            </Button>
                        </div>
                    )}
                    {done && (
                        <p className="text-sm text-muted-foreground">This prescription is {status}.</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Dispensing decrements drug stock, adds the drugs to the visit bill/invoice, and posts income when the patient pays.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
