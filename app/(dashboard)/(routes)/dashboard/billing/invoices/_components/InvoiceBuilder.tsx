"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Trash2, Save, User2 } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { createInvoice } from "@/lib/actions/invoice.actions";

interface ProcedureLite { _id: string; code: string; name: string; price: number; }
interface Item { description: string; procedureId?: string | null; tooth?: number | null; quantity: number; unitPrice: number; }
interface PatientLite { _id: string; fullName?: string; patientId?: string; phone?: string; }

export function InvoiceBuilder({ procedures }: { procedures: ProcedureLite[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // patient selection
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);

    // items
    const [items, setItems] = useState<Item[]>([]);
    const [desc, setDesc] = useState("");
    const [qty, setQty] = useState("1");
    const [price, setPrice] = useState("0");
    const [selProc, setSelProc] = useState("");

    const [tax, setTax] = useState("0");
    const [discount, setDiscount] = useState("0");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
    const total = useMemo(() => Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0)), [subtotal, tax, discount]);

    const search = () => {
        startTransition(async () => {
            try {
                const data = await fetchPatientBySearch(term);
                setResults(data || []);
            } catch {
                setResults([]);
            }
        });
    };

    const pickProcedure = (id: string) => {
        setSelProc(id);
        const p = procedures.find((x) => x._id === id);
        if (p) {
            setDesc(`${p.code} — ${p.name}`);
            setPrice(String(p.price));
        }
    };

    const addItem = () => {
        if (!desc.trim()) {
            toast.error("Enter a description");
            return;
        }
        setItems((prev) => [
            ...prev,
            {
                description: desc.trim(),
                procedureId: selProc || null,
                quantity: Number(qty) || 1,
                unitPrice: Number(price) || 0,
            },
        ]);
        setDesc(""); setQty("1"); setPrice("0"); setSelProc("");
    };

    const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

    const save = async () => {
        if (!patient) {
            toast.error("Select a patient first");
            return;
        }
        if (items.length === 0) {
            toast.error("Add at least one line item");
            return;
        }
        try {
            setSaving(true);
            const invoice = await createInvoice({
                patientId: patient._id,
                items,
                tax: Number(tax || 0),
                discount: Number(discount || 0),
                notes,
            });
            toast.success("Invoice created");
            router.push(`/dashboard/billing/invoices/${invoice._id}`);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card>
                <CardContent className="space-y-5 pt-6">
                    {/* Patient */}
                    {!patient ? (
                        <div>
                            <label className="mb-1 block text-sm font-medium">Patient</label>
                            <div className="flex gap-2">
                                <Input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search patient..." />
                                <Button type="button" onClick={search} disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {results.map((p) => (
                                    <button key={p._id} onClick={() => setPatient(p)} className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted">
                                        <User2 className="h-4 w-4 text-teal-600" />
                                        {p.fullName} <span className="text-xs text-muted-foreground">{p.patientId || ""}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between rounded-lg border bg-teal-50/50 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <User2 className="h-5 w-5 text-teal-600" />
                                <span className="font-medium">{patient.fullName}</span>
                                <span className="text-xs text-muted-foreground">{patient.patientId || ""}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                        </div>
                    )}

                    {/* Add item */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="mb-3 text-sm font-medium">Add Line Item</p>
                        <div className="mb-3">
                            <label className="mb-1 block text-xs text-muted-foreground">From catalog (optional)</label>
                            <Select value={selProc} onValueChange={pickProcedure}>
                                <SelectTrigger><SelectValue placeholder="Pick a procedure" /></SelectTrigger>
                                <SelectContent>
                                    {procedures.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>{p.code} — {p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-[1fr_70px_90px_auto] items-end gap-2">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                                <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Qty</label>
                                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Unit Price</label>
                                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </div>
                            <Button type="button" variant="secondary" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    {/* Items list */}
                    {items.length > 0 && (
                        <div className="space-y-2">
                            {items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <span>{it.description} <span className="text-muted-foreground">× {it.quantity}</span></span>
                                    <span className="flex items-center gap-3">
                                        <span className="font-medium">{(it.quantity * it.unitPrice).toFixed(2)}</span>
                                        <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Invoice notes..." />
                </CardContent>
            </Card>

            {/* Summary */}
            <Card className="h-fit">
                <CardContent className="space-y-3 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between text-sm">
                        <span>Tax</span>
                        <Input className="w-24" type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span>Discount</span>
                        <Input className="w-24" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                    </div>
                    <div className="flex justify-between border-t pt-3 text-base font-bold"><span>Total</span><span>{total.toFixed(2)}</span></div>
                    <Button className="w-full" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? "Creating..." : "Create Invoice"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
