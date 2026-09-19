"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { createTreatmentPlan } from "@/lib/actions/treatment-plan.actions";

interface ProcedureLite {
    _id: string;
    code: string;
    name: string;
    price: number;
}

interface Item {
    procedureId?: string | null;
    procedureName: string;
    tooth?: number | null;
    phase: number;
    cost: number;
    status: "proposed" | "accepted" | "in-progress" | "completed" | "cancelled";
    note?: string;
}

const STATUS_COLORS: Record<string, string> = {
    proposed: "bg-slate-100 text-slate-700",
    accepted: "bg-blue-100 text-blue-700",
    "in-progress": "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

export function TreatmentPlanBuilder({
    patientId,
    procedures,
}: {
    patientId: string;
    procedures: ProcedureLite[];
}) {
    const router = useRouter();
    const path = usePathname();
    const [title, setTitle] = useState("");
    const [items, setItems] = useState<Item[]>([]);
    const [saving, setSaving] = useState(false);

    // draft row
    const [selProc, setSelProc] = useState<string>("");
    const [tooth, setTooth] = useState<string>("");
    const [phase, setPhase] = useState<string>("1");

    const total = useMemo(() => items.reduce((s, i) => s + (Number(i.cost) || 0), 0), [items]);

    const addItem = () => {
        const proc = procedures.find((p) => p._id === selProc);
        if (!proc) {
            toast.error("Select a procedure first");
            return;
        }
        setItems((prev) => [
            ...prev,
            {
                procedureId: proc._id,
                procedureName: `${proc.code} — ${proc.name}`,
                tooth: tooth ? Number(tooth) : null,
                phase: Number(phase) || 1,
                cost: Number(proc.price) || 0,
                status: "proposed",
            },
        ]);
        setSelProc("");
        setTooth("");
    };

    const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Enter a plan title");
            return;
        }
        if (items.length === 0) {
            toast.error("Add at least one procedure");
            return;
        }
        try {
            setSaving(true);
            await createTreatmentPlan({ patientId, title: title.trim(), items, status: "proposed" });
            toast.success("Treatment plan created");
            setTitle("");
            setItems([]);
            router.refresh();
        } catch (error) {
            console.log("error creating plan", error);
            toast.error("Something went wrong", { description: "Please try again later" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-5 pt-6">
                <div>
                    <label className="mb-1.5 block text-sm font-medium">Plan Title</label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Full mouth rehabilitation"
                        className="max-w-md"
                    />
                </div>

                {/* Add item row */}
                <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-3 text-sm font-medium">Add Procedure</p>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[240px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Procedure</label>
                            <Select value={selProc} onValueChange={setSelProc}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select from catalog" />
                                </SelectTrigger>
                                <SelectContent>
                                    {procedures.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            No procedures — add them in Procedure Catalog
                                        </SelectItem>
                                    ) : (
                                        procedures.map((p) => (
                                            <SelectItem key={p._id} value={p._id}>
                                                {p.code} — {p.name} ({Number(p.price).toFixed(2)})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-24">
                            <label className="mb-1 block text-xs text-muted-foreground">Tooth #</label>
                            <Input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="e.g. 14" />
                        </div>
                        <div className="w-24">
                            <label className="mb-1 block text-xs text-muted-foreground">Phase</label>
                            <Input value={phase} onChange={(e) => setPhase(e.target.value)} type="number" />
                        </div>
                        <Button type="button" onClick={addItem} variant="secondary">
                            <Plus className="mr-1 h-4 w-4" /> Add
                        </Button>
                    </div>
                </div>

                {/* Items list */}
                {items.length > 0 && (
                    <div className="space-y-2">
                        {items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded-lg border px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline">Phase {it.phase}</Badge>
                                    <div>
                                        <p className="text-sm font-medium">{it.procedureName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {it.tooth ? `Tooth ${it.tooth}` : "General"}
                                            <span className={`ml-2 rounded px-1.5 py-0.5 ${STATUS_COLORS[it.status]}`}>{it.status}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold">{Number(it.cost).toFixed(2)}</span>
                                    <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-between border-t pt-3">
                            <span className="text-sm text-muted-foreground">Estimated Total</span>
                            <span className="text-lg font-bold">{total.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? "Saving..." : "Save Treatment Plan"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
