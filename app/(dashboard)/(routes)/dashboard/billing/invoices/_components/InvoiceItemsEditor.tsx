"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, X, Save } from "lucide-react";
import { updateInvoiceItems } from "@/lib/actions/invoice.actions";

interface Item {
    description?: string;
    procedureId?: string | null;
    tooth?: number | null;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
}

interface Invoice {
    _id: string;
    status: string;
    items?: Item[];
    tax?: number;
    discount?: number;
}

/**
 * Accountant-facing editor for an invoice's line items, tax and discount.
 * Replaces the attendance CustomChargesPanel. Specialty-neutral copy.
 */
export function InvoiceItemsEditor({ invoice, currency = "" }: { invoice: Invoice; currency?: string }) {
    const router = useRouter();
    const path = usePathname();
    const readOnly = invoice.status === "cancelled";

    const [rows, setRows] = useState<Item[]>(() =>
        (invoice.items || []).map((it) => ({
            description: it.description || "",
            procedureId: it.procedureId ?? null,
            tooth: it.tooth ?? null,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
        }))
    );
    const [tax, setTax] = useState(String(Number(invoice.tax) || 0));
    const [discount, setDiscount] = useState(String(Number(invoice.discount) || 0));
    const [desc, setDesc] = useState("");
    const [qty, setQty] = useState("1");
    const [price, setPrice] = useState("");
    const [saving, setSaving] = useState(false);

    const money = (n: number) => `${currency ? `${currency} ` : ""}${n.toFixed(2)}`;
    const lineTotal = (r: Item) => (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
    const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0);
    const total = Math.max(0, subtotal + (Number(tax) || 0) - (Number(discount) || 0));

    const addRow = () => {
        if (!desc.trim()) return toast.error("Enter a description");
        const p = Number(price);
        if (!p || p <= 0) return toast.error("Enter an amount");
        const q = Number(qty) || 1;
        setRows((prev) => [...prev, { description: desc.trim(), quantity: q, unitPrice: p, procedureId: null, tooth: null }]);
        setDesc(""); setQty("1"); setPrice("");
    };
    const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

    const save = async () => {
        try {
            setSaving(true);
            const items = rows.map((r) => ({
                description: r.description || "Charge",
                procedureId: r.procedureId ?? null,
                tooth: r.tooth ?? null,
                quantity: Number(r.quantity) || 1,
                unitPrice: Number(r.unitPrice) || 0,
            }));
            await updateInvoiceItems(invoice._id, items, Number(tax) || 0, Number(discount) || 0, path);
            toast.success("Invoice updated");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    if (readOnly) {
        return (
            <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                    This invoice is cancelled and cannot be edited.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Edit Charges</h3>

                <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                    <div className="min-w-[200px] flex-1">
                        <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Procedure, Materials, Discount note" />
                    </div>
                    <div className="w-20">
                        <label className="mb-1 block text-xs text-muted-foreground">Qty</label>
                        <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                    </div>
                    <div className="w-28">
                        <label className="mb-1 block text-xs text-muted-foreground">Unit price</label>
                        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button type="button" variant="secondary" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                </div>

                {rows.length > 0 ? (
                    <div className="space-y-1.5">
                        {rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <span>{r.description || "Charge"}{(Number(r.quantity) || 1) > 1 ? ` × ${r.quantity}` : ""}</span>
                                <span className="flex items-center gap-3">
                                    <span className="font-medium">{money(lineTotal(r))}</span>
                                    <button onClick={() => removeRow(i)} className="text-red-500"><X className="h-4 w-4" /></button>
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No line items.</p>
                )}

                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                        <label className="mb-1 block text-xs text-muted-foreground">Tax</label>
                        <Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                    <div className="w-28">
                        <label className="mb-1 block text-xs text-muted-foreground">Discount</label>
                        <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                    </div>
                    <div className="ml-auto text-right text-sm">
                        <div className="text-muted-foreground">Subtotal: {money(subtotal)}</div>
                        <div className="font-bold">Total: {money(total)}</div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Editing charges recomputes the balance. Payments already recorded are preserved.
                </p>
            </CardContent>
        </Card>
    );
}
