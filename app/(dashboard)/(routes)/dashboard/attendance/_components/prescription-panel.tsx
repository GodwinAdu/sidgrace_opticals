"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pill, X, Send } from "lucide-react";
import { fetchDrugProducts } from "@/lib/actions/inventory-product.actions";
import { createPrescription, getPrescriptionsByVisit } from "@/lib/actions/prescription.actions";

interface Drug { _id: string; name: string; salePrice?: number; quantity?: number; strength?: string; form?: string }
interface Item {
    productId?: string | null;
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
}
interface ExistingRx {
    _id: string;
    status: string;
    createdAt?: string;
    prescribedBy?: { fullName?: string } | null;
    items?: { drugName?: string; dosage?: string; quantity?: number; dispensedQuantity?: number }[];
}

const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    "partially-dispensed": "bg-blue-100 text-blue-700",
    dispensed: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-600",
};

export function PrescriptionPanel({
    attendanceId,
    patientId,
    readOnly,
}: {
    attendanceId?: string;
    patientId: string;
    readOnly?: boolean;
}) {
    const router = useRouter();
    const path = usePathname();
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [existing, setExisting] = useState<ExistingRx[]>([]);
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Item[]>([]);
    const [sel, setSel] = useState("");
    const [free, setFree] = useState("");
    const [dosage, setDosage] = useState("");
    const [frequency, setFrequency] = useState("");
    const [duration, setDuration] = useState("");
    const [qty, setQty] = useState("1");
    const [saving, setSaving] = useState(false);

    const load = () => {
        if (!attendanceId) { setLoading(false); return; }
        setLoading(true);
        Promise.all([fetchDrugProducts(), getPrescriptionsByVisit(attendanceId)])
            .then(([d, rx]) => {
                setDrugs((d || []) as Drug[]);
                setExisting((rx || []) as ExistingRx[]);
            })
            .catch(() => { setDrugs([]); setExisting([]); })
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [attendanceId]);

    const addRow = () => {
        const prod = sel ? drugs.find((d) => d._id === sel) : null;
        const name = prod ? prod.name : free.trim();
        if (!name) return toast.error("Pick a drug or type a name");
        setRows((p) => [...p, {
            productId: prod?._id || null,
            drugName: prod ? `${prod.name}${prod.strength ? ` ${prod.strength}` : ""}` : name,
            dosage, frequency, duration,
            quantity: Number(qty) || 1,
        }]);
        setSel(""); setFree(""); setDosage(""); setFrequency(""); setDuration(""); setQty("1");
    };
    const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

    const submit = async () => {
        if (!patientId) return toast.error("No patient linked to this visit");
        if (rows.length === 0) return toast.error("Add at least one drug");
        try {
            setSaving(true);
            await createPrescription({
                patientId,
                appointmentId: attendanceId || null,
                items: rows,
            }, path);
            toast.success("Prescription sent to pharmacy");
            setRows([]);
            load();
            router.refresh();
        } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            {!readOnly && (
                <Card>
                    <CardContent className="space-y-4 pt-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            <Pill className="h-4 w-4" /> Prescribe Drugs
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Drug (from pharmacy)</label>
                                <Select value={sel} onValueChange={(v) => { setSel(v); setFree(""); }}>
                                    <SelectTrigger><SelectValue placeholder="Select a drug" /></SelectTrigger>
                                    <SelectContent>
                                        {drugs.length === 0 ? (
                                            <SelectItem value="none" disabled>No drugs in pharmacy inventory</SelectItem>
                                        ) : drugs.map((d) => (
                                            <SelectItem key={d._id} value={d._id}>
                                                {d.name}{d.strength ? ` ${d.strength}` : ""}{d.form ? ` (${d.form})` : ""} — {Number(d.quantity) || 0} in stock
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">…or type a drug (not in stock)</label>
                                <Input value={free} onChange={(e) => { setFree(e.target.value); setSel(""); }} placeholder="e.g. Amoxicillin 500mg" />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Dosage</label>
                                <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 tab" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Frequency</label>
                                <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="3x daily" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Duration</label>
                                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="5 days" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Qty to dispense</label>
                                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="button" variant="secondary" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add drug</Button>
                        </div>

                        {rows.length > 0 && (
                            <div className="space-y-1.5">
                                {rows.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                        <span>
                                            {r.drugName}
                                            <span className="text-muted-foreground"> — {[r.dosage, r.frequency, r.duration].filter(Boolean).join(", ")} • qty {r.quantity}</span>
                                            {!r.productId && <Badge variant="outline" className="ml-2 text-xs">not in stock</Badge>}
                                        </span>
                                        <button onClick={() => removeRow(i)} className="text-red-500"><X className="h-4 w-4" /></button>
                                    </div>
                                ))}
                                <div className="flex justify-end pt-2">
                                    <Button onClick={submit} disabled={saving}>
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Send to Pharmacy
                                    </Button>
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            In-stock drugs are dispensed by the pharmacy (decrement stock, bill the visit). Typed drugs are advisory only.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prescriptions for this visit</h3>
                {existing.length === 0 && <p className="text-sm text-muted-foreground">No prescriptions yet.</p>}
                {existing.map((rx) => (
                    <Card key={rx._id}>
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {rx.createdAt ? new Date(rx.createdAt).toLocaleString() : ""}
                                    {rx.prescribedBy?.fullName ? ` • ${rx.prescribedBy.fullName}` : ""}
                                </span>
                                <Badge className={STATUS_COLOR[rx.status] || ""}>{rx.status}</Badge>
                            </div>
                            <ul className="mt-2 space-y-1 text-sm">
                                {(rx.items || []).map((it, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                        <span>{it.drugName}{it.dosage ? ` — ${it.dosage}` : ""}</span>
                                        <span className="text-muted-foreground">qty {it.quantity}{(it.dispensedQuantity || 0) > 0 ? ` • dispensed ${it.dispensedQuantity}` : ""}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
