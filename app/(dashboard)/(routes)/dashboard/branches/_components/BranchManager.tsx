"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Building2 } from "lucide-react";
import { createBranch, deleteBranch } from "@/lib/actions/branch.actions";

interface Branch {
    _id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

export function BranchManager({ branches }: { branches: Branch[] }) {
    const router = useRouter();
    const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const create = async () => {
        if (!form.name.trim()) return toast.error("Enter a branch name");
        try {
            setSaving(true);
            await createBranch({ ...form, name: form.name.trim() });
            toast.success("Branch created");
            setForm({ name: "", address: "", phone: "", email: "" });
            router.refresh();
        } catch (e) {
            toast.error("Something went wrong", { description: e instanceof Error ? e.message : undefined });
        } finally { setSaving(false); }
    };

    const remove = async (id: string) => {
        try { setBusyId(id); await deleteBranch(id); toast.success("Branch removed"); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add Branch</h3>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Downtown Clinic" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Address</label>
                        <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Phone</label>
                            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                            <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={create} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add Branch
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Branches</h3>
                {(!branches || branches.length === 0) && <p className="text-sm text-muted-foreground">No branches yet.</p>}
                {branches?.map((b) => (
                    <Card key={b._id}>
                        <CardContent className="flex items-start justify-between pt-5">
                            <div className="flex gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"><Building2 className="h-5 w-5" /></span>
                                <div>
                                    <p className="font-semibold">{b.name}</p>
                                    <p className="text-xs text-muted-foreground">{[b.address, b.phone, b.email].filter(Boolean).join(" • ") || "—"}</p>
                                </div>
                            </div>
                            <button onClick={() => remove(b._id)} disabled={busyId === b._id} className="text-red-500 hover:text-red-700">
                                {busyId === b._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
