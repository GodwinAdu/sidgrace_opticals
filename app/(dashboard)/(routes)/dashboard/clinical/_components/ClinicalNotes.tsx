"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createClinicalNote, deleteClinicalNote } from "@/lib/actions/clinical.actions";
import { VisitPicker, type VisitOption } from "./VisitPicker";

interface Note {
    _id: string;
    teeth?: number[];
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    authoredBy?: { fullName?: string } | null;
    createdAt?: string;
}

export function ClinicalNotes({ patientId, notes, appointments = [] }: { patientId: string; notes: Note[]; appointments?: VisitOption[] }) {
    const router = useRouter();
    const path = usePathname();
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [form, setForm] = useState({ teeth: "", subjective: "", objective: "", assessment: "", plan: "" });
    const [appointmentId, setAppointmentId] = useState("");

    const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const save = async () => {
        if (!form.subjective && !form.objective && !form.assessment && !form.plan) {
            toast.error("Fill at least one SOAP field");
            return;
        }
        try {
            setSaving(true);
            const teeth = form.teeth
                .split(",")
                .map((t) => Number(t.trim()))
                .filter((n) => !Number.isNaN(n));
            await createClinicalNote(
                patientId,
                { teeth, subjective: form.subjective, objective: form.objective, assessment: form.assessment, plan: form.plan, appointmentId: appointmentId || null },
                path
            );
            toast.success("Note saved");
            setForm({ teeth: "", subjective: "", objective: "", assessment: "", plan: "" });
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
            await deleteClinicalNote(id);
            toast.success("Note moved to trash");
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
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New SOAP Note</h3>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Teeth involved (comma separated)</label>
                        <Input value={form.teeth} onChange={(e) => set("teeth", e.target.value)} placeholder="e.g. 14, 15, 16" />
                    </div>
                    {appointments.length > 0 && (
                        <VisitPicker appointments={appointments} value={appointmentId} onChange={setAppointmentId} />
                    )}
                    {(["subjective", "objective", "assessment", "plan"] as const).map((f) => (
                        <div key={f}>
                            <label className="mb-1 block text-xs font-medium capitalize">{f}</label>
                            <Textarea value={form[f]} onChange={(e) => set(f, e.target.value)} rows={2} placeholder={`${f}...`} />
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {saving ? "Saving..." : "Add Note"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">History</h3>
                {(!notes || notes.length === 0) && (
                    <p className="text-sm text-muted-foreground">No clinical notes recorded yet.</p>
                )}
                {notes?.map((n) => (
                    <Card key={n._id}>
                        <CardContent className="pt-5">
                            <div className="flex items-start justify-between">
                                <div className="text-xs text-muted-foreground">
                                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                                    {n.authoredBy?.fullName ? ` • ${n.authoredBy.fullName}` : ""}
                                    {n.teeth && n.teeth.length > 0 ? ` • Teeth: ${n.teeth.join(", ")}` : ""}
                                </div>
                                <button onClick={() => remove(n._id)} disabled={busyId === n._id} className="text-red-500 hover:text-red-700">
                                    {busyId === n._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                            <dl className="mt-2 space-y-1 text-sm">
                                {n.subjective && <div><span className="font-semibold">S:</span> {n.subjective}</div>}
                                {n.objective && <div><span className="font-semibold">O:</span> {n.objective}</div>}
                                {n.assessment && <div><span className="font-semibold">A:</span> {n.assessment}</div>}
                                {n.plan && <div><span className="font-semibold">P:</span> {n.plan}</div>}
                            </dl>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
