"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Save, Pencil, X } from "lucide-react";
import { createProcedure, updateProcedure, deleteProcedure } from "@/lib/actions/procedure.actions";

interface Procedure {
    _id: string;
    code: string;
    name: string;
    category?: string;
    defaultDuration?: number;
    price: number;
    isActive?: boolean;
}

export function ProcedureManager({ procedures }: { procedures: Procedure[] }) {
    const router = useRouter();
    const path = usePathname();

    const [form, setForm] = useState({ code: "", name: "", category: "General", price: "", defaultDuration: "30" });
    const [creating, setCreating] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<string>("");

    const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const create = async () => {
        if (!form.code.trim() || !form.name.trim()) return toast.error("Code and name are required");
        try {
            setCreating(true);
            await createProcedure({
                code: form.code.trim(),
                name: form.name.trim(),
                category: form.category.trim() || "General",
                price: Number(form.price) || 0,
                defaultDuration: Number(form.defaultDuration) || 30,
            });
            toast.success("Procedure added");
            setForm({ code: "", name: "", category: "General", price: "", defaultDuration: "30" });
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const startEdit = (p: Procedure) => { setEditId(p._id); setEditPrice(String(p.price ?? 0)); };
    const cancelEdit = () => { setEditId(null); setEditPrice(""); };

    const savePrice = async (id: string) => {
        try {
            setBusyId(id);
            await updateProcedure(id, { price: Number(editPrice) || 0 }, path);
            toast.success("Price updated");
            setEditId(null);
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteProcedure(id);
            toast.success("Procedure removed");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Add Procedure / Service</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-28">
                            <label className="mb-1 block text-xs text-muted-foreground">Code</label>
                            <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="D2740" />
                        </div>
                        <div className="min-w-[200px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Porcelain crown" />
                        </div>
                        <div className="w-40">
                            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Restorative" />
                        </div>
                        <div className="w-28">
                            <label className="mb-1 block text-xs text-muted-foreground">Price</label>
                            <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="w-24">
                            <label className="mb-1 block text-xs text-muted-foreground">Mins</label>
                            <Input type="number" value={form.defaultDuration} onChange={(e) => set("defaultDuration", e.target.value)} />
                        </div>
                        <Button onClick={create} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Price List</CardTitle>
                </CardHeader>
                <CardContent>
                    {(!procedures || procedures.length === 0) ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No procedures yet. Add your first service above.</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {procedures.map((p) => (
                                        <TableRow key={p._id}>
                                            <TableCell className="font-mono text-xs">{p.code}</TableCell>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell><Badge variant="outline">{p.category || "General"}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {editId === p._id ? (
                                                    <Input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        className="ml-auto h-8 w-28 text-right"
                                                    />
                                                ) : (
                                                    Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {editId === p._id ? (
                                                        <>
                                                            <Button size="icon" variant="ghost" onClick={() => savePrice(p._id)} disabled={busyId === p._id}>
                                                                {busyId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="icon" variant="ghost" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                                            <Button size="icon" variant="ghost" onClick={() => remove(p._id)} disabled={busyId === p._id} className="text-red-500">
                                                                {busyId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
