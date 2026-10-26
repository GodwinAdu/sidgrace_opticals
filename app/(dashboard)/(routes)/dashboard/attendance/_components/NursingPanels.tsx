"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, StickyNote, Pill, Droplets, HeartPulse, ClipboardList, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { addNursingNote, addMedicationAdmin, addIntakeOutput, addCarePlanItem, updateCarePlanItem } from "@/lib/actions/nursing.actions";
import { addIcuChartEntry, getIcuChart } from "@/lib/actions/icu.actions";
import { ICU_ENTRY_TYPES, orderTimeline, type IcuEntryType, type IcuTimelineEntry } from "@/lib/clinical/icu";

const when = (d?: string) => (d ? new Date(d).toLocaleString() : "");

/* ─────────────── NURSING NOTES ─────────────── */
export function NursingNotesPanel({
    attendanceId,
    notes = [],
    readOnly,
}: {
    attendanceId?: string;
    notes?: { note?: string; createdAt?: string }[];
    readOnly?: boolean;
}) {
    const router = useRouter();
    const path = usePathname();
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);

    const add = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        if (!text.trim()) return toast.error("Enter a note");
        try {
            setSaving(true);
            await addNursingNote(attendanceId, text.trim(), path);
            toast.success("Nursing note added");
            setText("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <StickyNote className="h-4 w-4" /> Nursing Notes
                </h3>
                {!readOnly && (
                    <div className="space-y-2">
                        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Observation, care given, patient response..." />
                        <div className="flex justify-end">
                            <Button onClick={add} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add Note
                            </Button>
                        </div>
                    </div>
                )}
                {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No nursing notes yet.</p>
                ) : (
                    <div className="space-y-2">
                        {[...notes].reverse().map((n, i) => (
                            <div key={i} className="rounded border px-3 py-2 text-sm">
                                <p className="whitespace-pre-wrap">{n.note}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{when(n.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ─────────────── MEDICATION ADMINISTRATION (MAR) ─────────────── */
const ROUTES = ["oral", "IV", "IM", "subcutaneous", "topical", "inhaled", "rectal", "other"];
export function MedicationAdminPanel({
    attendanceId,
    entries = [],
    readOnly,
}: {
    attendanceId?: string;
    entries?: { drugName?: string; dose?: string; route?: string; note?: string; givenAt?: string }[];
    readOnly?: boolean;
}) {
    const router = useRouter();
    const path = usePathname();
    const [drugName, setDrugName] = useState("");
    const [dose, setDose] = useState("");
    const [route, setRoute] = useState("oral");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const add = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        if (!drugName.trim()) return toast.error("Enter the drug name");
        try {
            setSaving(true);
            await addMedicationAdmin(attendanceId, { drugName: drugName.trim(), dose, route, note }, path);
            toast.success("Medication recorded");
            setDrugName(""); setDose(""); setRoute("oral"); setNote("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Pill className="h-4 w-4" /> Medication Administration
                </h3>
                {!readOnly && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="min-w-[160px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Drug</label>
                            <Input value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="e.g. Paracetamol" />
                        </div>
                        <div className="w-28">
                            <label className="mb-1 block text-xs text-muted-foreground">Dose</label>
                            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="500mg" />
                        </div>
                        <div className="w-32">
                            <label className="mb-1 block text-xs text-muted-foreground">Route</label>
                            <Select value={route} onValueChange={setRoute}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ROUTES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-[140px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Note</label>
                            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
                        </div>
                        <Button onClick={add} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Record
                        </Button>
                    </div>
                )}
                {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No medications administered yet.</p>
                ) : (
                    <div className="space-y-2">
                        {[...entries].reverse().map((e, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <div>
                                    <p className="font-medium">{e.drugName} {e.dose ? `· ${e.dose}` : ""} {e.route ? `· ${e.route}` : ""}</p>
                                    {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                                </div>
                                <span className="text-xs text-muted-foreground">{when(e.givenAt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ─────────────── INTAKE / OUTPUT ─────────────── */
export function IntakeOutputPanel({
    attendanceId,
    entries = [],
    readOnly,
}: {
    attendanceId?: string;
    entries?: { type?: string; kind?: string; amountMl?: number; recordedAt?: string }[];
    readOnly?: boolean;
}) {
    const router = useRouter();
    const path = usePathname();
    const [type, setType] = useState<"intake" | "output">("intake");
    const [kind, setKind] = useState("");
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);

    const totalIn = entries.filter((e) => e.type !== "output").reduce((s, e) => s + (Number(e.amountMl) || 0), 0);
    const totalOut = entries.filter((e) => e.type === "output").reduce((s, e) => s + (Number(e.amountMl) || 0), 0);

    const add = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        if (!Number(amount)) return toast.error("Enter an amount (ml)");
        try {
            setSaving(true);
            await addIntakeOutput(attendanceId, { type, kind, amountMl: Number(amount) }, path);
            toast.success("Recorded");
            setKind(""); setAmount("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Droplets className="h-4 w-4" /> Intake / Output
                </h3>
                {!readOnly && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="w-32">
                            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                            <Select value={type} onValueChange={(v) => setType(v as "intake" | "output")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="intake">Intake</SelectItem>
                                    <SelectItem value="output">Output</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-[140px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Kind</label>
                            <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="e.g. Oral fluids, Urine" />
                        </div>
                        <div className="w-28">
                            <label className="mb-1 block text-xs text-muted-foreground">Amount (ml)</label>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <Button onClick={add} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add
                        </Button>
                    </div>
                )}
                <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">Total intake: <span className="font-semibold text-foreground">{totalIn} ml</span></span>
                    <span className="text-muted-foreground">Total output: <span className="font-semibold text-foreground">{totalOut} ml</span></span>
                </div>
                {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                    <div className="space-y-2">
                        {[...entries].reverse().map((e, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <span>
                                    <span className={`mr-2 rounded px-2 py-0.5 text-[10px] uppercase ${e.type === "output" ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700"}`}>
                                        {e.type || "intake"}
                                    </span>
                                    {e.kind} · {Number(e.amountMl) || 0} ml
                                </span>
                                <span className="text-xs text-muted-foreground">{when(e.recordedAt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ─────────────── NURSING CARE PLAN ─────────────── */
interface CarePlanItem {
    _id?: string;
    problem?: string;
    goal?: string;
    interventions?: string;
    evaluation?: string;
    status?: "active" | "resolved";
    authoredByName?: string;
    updatedByName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export function CarePlanPanel({
    attendanceId,
    items = [],
    readOnly,
}: {
    attendanceId?: string;
    items?: CarePlanItem[];
    readOnly?: boolean;
}) {
    const router = useRouter();
    const path = usePathname();
    const [problem, setProblem] = useState("");
    const [goal, setGoal] = useState("");
    const [interventions, setInterventions] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [evalDraft, setEvalDraft] = useState<Record<string, string>>({});

    const add = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        if (!problem.trim()) return toast.error("Enter a problem / nursing diagnosis");
        try {
            setSaving(true);
            await addCarePlanItem(attendanceId, { problem: problem.trim(), goal, interventions }, path);
            toast.success("Care-plan item added");
            setProblem(""); setGoal(""); setInterventions("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const saveItem = async (id: string, update: { evaluation?: string; status?: "active" | "resolved" }) => {
        if (!attendanceId || !id) return;
        try {
            setBusyId(id);
            await updateCarePlanItem(attendanceId, id, update, path);
            toast.success("Care-plan item updated");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <ClipboardList className="h-4 w-4" /> Nursing Care Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                    Open a problem (nursing diagnosis) with a goal and planned interventions, then record
                    evaluation and mark it resolved as care progresses.
                </p>

                {!readOnly && (
                    <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Problem / Nursing diagnosis</label>
                            <Input value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="e.g. Risk of falls related to impaired vision" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Goal / Expected outcome</label>
                            <Textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Patient remains free of injury for the duration of the visit" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Interventions</label>
                            <Textarea rows={2} value={interventions} onChange={(e) => setInterventions(e.target.value)} placeholder="e.g. Keep call bell within reach; assist with ambulation; clear walkway" />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={add} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add Care Item
                            </Button>
                        </div>
                    </div>
                )}

                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No care-plan items yet.</p>
                ) : (
                    <div className="space-y-3">
                        {[...items].reverse().map((c, i) => {
                            const id = c._id ? String(c._id) : "";
                            const resolved = c.status === "resolved";
                            return (
                                <div key={id || i} className="rounded-lg border px-3 py-3 text-sm">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium">{c.problem}</p>
                                        <Badge variant={resolved ? "default" : "secondary"} className="shrink-0 capitalize">
                                            {resolved ? "resolved" : "active"}
                                        </Badge>
                                    </div>
                                    {c.goal && <p className="mt-1 text-xs"><span className="text-muted-foreground">Goal:</span> {c.goal}</p>}
                                    {c.interventions && <p className="mt-0.5 text-xs"><span className="text-muted-foreground">Interventions:</span> {c.interventions}</p>}
                                    {c.evaluation && <p className="mt-0.5 text-xs"><span className="text-muted-foreground">Evaluation:</span> {c.evaluation}</p>}
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        {c.authoredByName ? `Opened by ${c.authoredByName}` : ""}{c.createdAt ? ` · ${when(c.createdAt)}` : ""}
                                    </p>

                                    {!readOnly && id && (
                                        <div className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
                                            <div className="min-w-[200px] flex-1">
                                                <label className="mb-1 block text-xs text-muted-foreground">Record evaluation</label>
                                                <Input
                                                    value={evalDraft[id] ?? ""}
                                                    onChange={(e) => setEvalDraft((p) => ({ ...p, [id]: e.target.value }))}
                                                    placeholder="Patient response / outcome so far"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={busyId === id || (evalDraft[id] ?? "").trim() === ""}
                                                onClick={() => { void saveItem(id, { evaluation: evalDraft[id] }); setEvalDraft((p) => ({ ...p, [id]: "" })); }}
                                            >
                                                {busyId === id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Save Evaluation
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={resolved ? "secondary" : "default"}
                                                disabled={busyId === id}
                                                onClick={() => void saveItem(id, { status: resolved ? "active" : "resolved" })}
                                            >
                                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                                {resolved ? "Reopen" : "Mark Resolved"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ─────────────── ICU CHARTING (append-only timeline) ─────────────── */
interface IcuEntry extends IcuTimelineEntry {
    _id?: string;
    type?: string;
    recordedAt?: string;
    temperature?: number | null;
    pulse?: number | null;
    bloodPressure?: string;
    respiratoryRate?: number | null;
    spo2?: number | null;
    ventMode?: string;
    fio2?: number | null;
    peep?: number | null;
    tidalVolume?: number | null;
    gcsEye?: number | null;
    gcsVerbal?: number | null;
    gcsMotor?: number | null;
    gcsTotal?: number | null;
    fluidDirection?: "in" | "out" | "";
    fluidKind?: string;
    fluidVolumeMl?: number | null;
    note?: string;
    recordedBy?: { fullName?: string } | string | null;
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Compact one-line summary of an ICU entry for the timeline. */
function summarise(e: IcuEntry): string {
    switch (e.type) {
        case "vitals":
            return [
                e.temperature != null ? `T ${e.temperature}°C` : null,
                e.pulse != null ? `HR ${e.pulse}` : null,
                e.bloodPressure ? `BP ${e.bloodPressure}` : null,
                e.respiratoryRate != null ? `RR ${e.respiratoryRate}` : null,
                e.spo2 != null ? `SpO₂ ${e.spo2}%` : null,
            ].filter(Boolean).join(" · ") || "Vitals";
        case "ventilator":
            return [
                e.ventMode ? e.ventMode : null,
                e.fio2 != null ? `FiO₂ ${e.fio2}%` : null,
                e.peep != null ? `PEEP ${e.peep}` : null,
                e.tidalVolume != null ? `Vt ${e.tidalVolume}ml` : null,
            ].filter(Boolean).join(" · ") || "Ventilator";
        case "gcs":
            return `GCS ${e.gcsTotal ?? "?"} (E${e.gcsEye ?? "-"} V${e.gcsVerbal ?? "-"} M${e.gcsMotor ?? "-"})`;
        case "fluids":
            return `${e.fluidDirection === "out" ? "Out" : "In"} · ${e.fluidKind || "fluid"} · ${e.fluidVolumeMl ?? 0} ml`;
        default:
            return e.note || "Note";
    }
}

export function IcuChartPanel({
    admissionId,
    readOnly,
}: {
    admissionId?: string;
    readOnly?: boolean;
}) {
    const [entries, setEntries] = useState<IcuEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState<IcuEntryType>("vitals");
    const [form, setForm] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const load = async () => {
        if (!admissionId) { setLoading(false); return; }
        try {
            const list = await getIcuChart(admissionId, "desc");
            setEntries((list || []) as IcuEntry[]);
        } catch {
            // leave existing entries in place on a transient read failure
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admissionId]);

    const add = async () => {
        if (!admissionId) return toast.error("No active admission to chart against");
        try {
            setSaving(true);
            const payload = {
                type,
                temperature: num(form.temperature || ""),
                pulse: num(form.pulse || ""),
                bloodPressure: form.bloodPressure || "",
                respiratoryRate: num(form.respiratoryRate || ""),
                spo2: num(form.spo2 || ""),
                ventMode: form.ventMode || "",
                fio2: num(form.fio2 || ""),
                peep: num(form.peep || ""),
                tidalVolume: num(form.tidalVolume || ""),
                gcsEye: num(form.gcsEye || ""),
                gcsVerbal: num(form.gcsVerbal || ""),
                gcsMotor: num(form.gcsMotor || ""),
                fluidDirection: (form.fluidDirection as "in" | "out") || "in",
                fluidKind: form.fluidKind || "",
                fluidVolumeMl: num(form.fluidVolumeMl || ""),
                note: form.note || "",
            };
            await addIcuChartEntry(admissionId, payload);
            setForm({});
            toast.success("ICU observation recorded");
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    // Newest-first for the feed (server already orders desc; re-order defensively).
    const timeline = orderTimeline(entries, "desc");

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <HeartPulse className="h-4 w-4" /> ICU Chart
                </h3>
                <p className="text-xs text-muted-foreground">
                    Append-only, time-stamped observations against this admission. Entries can&apos;t be edited or deleted.
                </p>

                {!admissionId ? (
                    <p className="text-sm text-muted-foreground">
                        ICU charting is available once the patient is admitted.
                    </p>
                ) : (
                    <>
                        {!readOnly && (
                            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                <div className="w-full sm:w-56">
                                    <label className="mb-1 block text-xs text-muted-foreground">Observation type</label>
                                    <Select value={type} onValueChange={(v) => setType(v as IcuEntryType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ICU_ENTRY_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {type === "vitals" && (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                                        <Field label="Temp (°C)"><Input type="number" value={form.temperature || ""} onChange={(e) => set("temperature", e.target.value)} /></Field>
                                        <Field label="Pulse"><Input type="number" value={form.pulse || ""} onChange={(e) => set("pulse", e.target.value)} /></Field>
                                        <Field label="BP"><Input value={form.bloodPressure || ""} onChange={(e) => set("bloodPressure", e.target.value)} placeholder="120/80" /></Field>
                                        <Field label="Resp rate"><Input type="number" value={form.respiratoryRate || ""} onChange={(e) => set("respiratoryRate", e.target.value)} /></Field>
                                        <Field label="SpO₂ (%)"><Input type="number" value={form.spo2 || ""} onChange={(e) => set("spo2", e.target.value)} /></Field>
                                    </div>
                                )}

                                {type === "ventilator" && (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <Field label="Mode"><Input value={form.ventMode || ""} onChange={(e) => set("ventMode", e.target.value)} placeholder="SIMV" /></Field>
                                        <Field label="FiO₂ (%)"><Input type="number" value={form.fio2 || ""} onChange={(e) => set("fio2", e.target.value)} /></Field>
                                        <Field label="PEEP"><Input type="number" value={form.peep || ""} onChange={(e) => set("peep", e.target.value)} /></Field>
                                        <Field label="Tidal vol (ml)"><Input type="number" value={form.tidalVolume || ""} onChange={(e) => set("tidalVolume", e.target.value)} /></Field>
                                    </div>
                                )}

                                {type === "gcs" && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Eye (1–4)"><Input type="number" value={form.gcsEye || ""} onChange={(e) => set("gcsEye", e.target.value)} /></Field>
                                        <Field label="Verbal (1–5)"><Input type="number" value={form.gcsVerbal || ""} onChange={(e) => set("gcsVerbal", e.target.value)} /></Field>
                                        <Field label="Motor (1–6)"><Input type="number" value={form.gcsMotor || ""} onChange={(e) => set("gcsMotor", e.target.value)} /></Field>
                                    </div>
                                )}

                                {type === "fluids" && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Direction">
                                            <Select value={form.fluidDirection || "in"} onValueChange={(v) => set("fluidDirection", v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="in">In</SelectItem>
                                                    <SelectItem value="out">Out</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field label="Kind"><Input value={form.fluidKind || ""} onChange={(e) => set("fluidKind", e.target.value)} placeholder="Normal saline" /></Field>
                                        <Field label="Volume (ml)"><Input type="number" value={form.fluidVolumeMl || ""} onChange={(e) => set("fluidVolumeMl", e.target.value)} /></Field>
                                    </div>
                                )}

                                <Field label="Note">
                                    <Textarea rows={2} value={form.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="Optional" />
                                </Field>

                                <div className="flex justify-end">
                                    <Button onClick={add} disabled={saving}>
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Record Observation
                                    </Button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : timeline.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No ICU observations charted yet.</p>
                        ) : (
                            <ol className="relative space-y-3 border-l pl-4">
                                {timeline.map((e, i) => (
                                    <li key={e._id || i} className="relative">
                                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500" />
                                        <div className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                                            <div>
                                                <span className="flex items-center gap-2">
                                                    <Badge variant="outline" className="capitalize">{String(e.type || "note")}</Badge>
                                                    <span>{summarise(e)}</span>
                                                </span>
                                                {e.note && e.type !== "note" && <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>}
                                            </div>
                                            <span className="whitespace-nowrap text-xs text-muted-foreground">{when(e.recordedAt)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
            {children}
        </div>
    );
}
