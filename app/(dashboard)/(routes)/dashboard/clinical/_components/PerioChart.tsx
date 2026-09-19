"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { savePerioChart } from "@/lib/actions/clinical.actions";
import { VisitPicker, type VisitOption } from "./VisitPicker";

interface Measurement {
    tooth: number;
    pocketDepth: number[]; // 6 sites
    bleeding: boolean;
    recession: number;
    mobility: number;
}

interface PastChart {
    _id: string;
    measurements: Measurement[];
    note?: string;
    createdAt?: string;
}

const emptyRow = (tooth: number): Measurement => ({
    tooth,
    pocketDepth: [0, 0, 0, 0, 0, 0],
    bleeding: false,
    recession: 0,
    mobility: 0,
});

export function PerioChart({ patientId, charts, appointments = [] }: { patientId: string; charts: PastChart[]; appointments?: VisitOption[] }) {
    const router = useRouter();
    const path = usePathname();
    const [rows, setRows] = useState<Measurement[]>([emptyRow(1)]);
    const [note, setNote] = useState("");
    const [appointmentId, setAppointmentId] = useState("");
    const [saving, setSaving] = useState(false);

    const addRow = () => setRows((p) => [...p, emptyRow(p.length + 1)]);
    const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

    const updateRow = (i: number, patch: Partial<Measurement>) =>
        setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const updateDepth = (i: number, site: number, val: number) =>
        setRows((p) =>
            p.map((r, idx) => {
                if (idx !== i) return r;
                const pd = [...r.pocketDepth];
                pd[site] = val;
                return { ...r, pocketDepth: pd };
            })
        );

    const save = async () => {
        try {
            setSaving(true);
            await savePerioChart(patientId, { measurements: rows, note, appointmentId: appointmentId || null }, path);
            toast.success("Periodontal chart saved");
            setRows([emptyRow(1)]);
            setNote("");
            setAppointmentId("");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New Perio Exam</h3>
                        <Button size="sm" variant="secondary" onClick={addRow}>
                            <Plus className="mr-1 h-4 w-4" /> Add Tooth
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted-foreground">
                                    <th className="p-2">Tooth</th>
                                    <th className="p-2" colSpan={6}>Pocket Depth (6 sites, mm)</th>
                                    <th className="p-2">Recession</th>
                                    <th className="p-2">Mobility</th>
                                    <th className="p-2">BOP</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-1">
                                            <Input
                                                className="w-16"
                                                type="number"
                                                value={r.tooth}
                                                onChange={(e) => updateRow(i, { tooth: Number(e.target.value) })}
                                            />
                                        </td>
                                        {r.pocketDepth.map((d, s) => (
                                            <td key={s} className="p-1">
                                                <Input
                                                    className="w-12"
                                                    type="number"
                                                    value={d}
                                                    onChange={(e) => updateDepth(i, s, Number(e.target.value))}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-1">
                                            <Input className="w-14" type="number" value={r.recession} onChange={(e) => updateRow(i, { recession: Number(e.target.value) })} />
                                        </td>
                                        <td className="p-1">
                                            <Input className="w-14" type="number" value={r.mobility} onChange={(e) => updateRow(i, { mobility: Number(e.target.value) })} />
                                        </td>
                                        <td className="p-1 text-center">
                                            <Checkbox checked={r.bleeding} onCheckedChange={(v) => updateRow(i, { bleeding: !!v })} />
                                        </td>
                                        <td className="p-1">
                                            <button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Notes / diagnosis..." />
                    {appointments.length > 0 && (
                        <VisitPicker appointments={appointments} value={appointmentId} onChange={setAppointmentId} />
                    )}
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {saving ? "Saving..." : "Save Exam"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Previous Exams</h3>
                {(!charts || charts.length === 0) && <p className="text-sm text-muted-foreground">No periodontal exams recorded yet.</p>}
                {charts?.map((c) => (
                    <Card key={c._id}>
                        <CardContent className="pt-5">
                            <p className="text-xs text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {c.measurements.map((m, idx) => (
                                    <span key={idx} className="rounded border px-2 py-1 text-xs">
                                        T{m.tooth}: {m.pocketDepth.join("-")}mm{m.bleeding ? " • BOP" : ""}
                                    </span>
                                ))}
                            </div>
                            {c.note && <p className="mt-2 text-sm text-muted-foreground">{c.note}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
