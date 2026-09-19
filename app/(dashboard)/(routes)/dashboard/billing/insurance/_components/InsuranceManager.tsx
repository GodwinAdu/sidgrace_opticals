"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";
import { createInsurance, deleteInsurance } from "@/lib/actions/insurance.actions";

interface Ins {
    _id: string;
    insurer: string;
    policyNumber: string;
    coveragePercent: number;
    validUntil?: string | null;
    notes?: string;
}

export function InsuranceManager({ patientId, records }: { patientId: string; records: Ins[] }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [form, setForm] = useState({ insurer: "", policyNumber: "", coveragePercent: "0", validUntil: "", notes: "" });

    const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const save = async () => {
        if (!form.insurer.trim() || !form.policyNumber.trim()) {
            toast.error("Insurer and policy number are required");
            return;
        }
        try {
            setSaving(true);
            await createInsurance({
                patientId,
                insurer: form.insurer.trim(),
                policyNumber: form.policyNumber.trim(),
                coveragePercent: Number(form.coveragePercent) || 0,
                validUntil: form.validUntil || null,
                notes: form.notes,
            });
            toast.success("Insurance added");
            setForm({ insurer: "", policyNumber: "", coveragePercent: "0", validUntil: "", notes: "" });
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteInsurance(id);
            toast.success("Insurance removed");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add Insurance Policy</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Insurer</label>
                            <Input value={form.insurer} onChange={(e) => set("insurer", e.target.value)} placeholder="e.g. Acme Health" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Policy Number</label>
                            <Input value={form.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Coverage %</label>
                            <Input type="number" value={form.coveragePercent} onChange={(e) => set("coveragePercent", e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Valid Until</label>
                            <Input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
                        </div>
                    </div>
                    <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes..." />
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {saving ? "Saving..." : "Add Policy"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Policies</h3>
                {(!records || records.length === 0) && <p className="text-sm text-muted-foreground">No insurance policies on file.</p>}
                {records?.map((r) => (
                    <Card key={r._id}>
                        <CardContent className="flex items-start justify-between pt-5">
                            <div className="flex gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                                    <ShieldCheck className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold">{r.insurer}</p>
                                    <p className="text-xs text-muted-foreground">Policy: {r.policyNumber}</p>
                                    <div className="mt-1 flex gap-2">
                                        <Badge variant="secondary">{r.coveragePercent}% covered</Badge>
                                        {r.validUntil && <Badge variant="outline">Valid to {new Date(r.validUntil).toLocaleDateString()}</Badge>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => remove(r._id)} disabled={busyId === r._id} className="text-red-500 hover:text-red-700">
                                {busyId === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
