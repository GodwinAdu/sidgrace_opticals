"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, Search, User2, Bell, Trash2, CalendarClock } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { createRecall, updateRecallStatus, sendRecallReminder, deleteRecall } from "@/lib/actions/recall.actions";

interface Recall {
    _id: string;
    patientId?: { fullName?: string; phone?: string } | string;
    type: string;
    dueDate: string;
    status: string;
    lastRemindedAt?: string | null;
}
interface PatientLite { _id: string; fullName?: string; phone?: string; }

const RECALL_TYPES = ["6-month checkup", "3-month cleaning", "annual exam", "post-op followup", "orthodontic review"];
const STATUSES = ["pending", "contacted", "scheduled", "completed", "cancelled"];
const STATUS_COLOR: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    contacted: "bg-blue-100 text-blue-700",
    scheduled: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

export function RecallManager({ recalls }: { recalls: Recall[] }) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();

    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [type, setType] = useState(RECALL_TYPES[0]);
    const [dueDate, setDueDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const search = () => {
        startTransition(async () => {
            try { setResults((await fetchPatientBySearch(term)) || []); } catch { setResults([]); }
        });
    };

    const create = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!dueDate) return toast.error("Pick a due date");
        try {
            setSaving(true);
            await createRecall({ patientId: patient._id, type, dueDate, note: "" });
            toast.success("Recall scheduled");
            setPatient(null); setTerm(""); setResults([]); setDueDate("");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    const remind = async (id: string) => {
        try {
            setBusyId(id);
            const res = await sendRecallReminder(id, path);
            if (res?.sent) toast.success("Reminder sent");
            else toast.warning("Reminder not sent", { description: res?.reason || "Unknown reason" });
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    const setStatus = async (id: string, status: string) => {
        try {
            setBusyId(id);
            await updateRecallStatus(id, status, path);
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteRecall(id);
            toast.success("Recall removed");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    const isOverdue = (d: string, status: string) => new Date(d) < new Date() && !["completed", "cancelled"].includes(status);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Schedule Recall</h3>
                    {!patient ? (
                        <div>
                            <div className="flex gap-2">
                                <Input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search patient..." className="max-w-sm" />
                                <Button type="button" onClick={search} disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {results.map((p) => (
                                    <button key={p._id} onClick={() => setPatient(p)} className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted">
                                        <User2 className="h-4 w-4 text-teal-600" /> {p.fullName}
                                        {p.phone && <span className="text-xs text-muted-foreground">{p.phone}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 px-3 py-2 text-sm">
                                <User2 className="h-4 w-4 text-teal-600" /> {patient.fullName}
                                <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                                    <SelectContent>{RECALL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Due date</label>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                            <Button onClick={create} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Schedule
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recall List</h3>
                {(!recalls || recalls.length === 0) && <p className="text-sm text-muted-foreground">No recalls scheduled.</p>}
                {recalls?.map((r) => {
                    const p = typeof r.patientId === "object" ? r.patientId : null;
                    const overdue = isOverdue(r.dueDate, r.status);
                    return (
                        <Card key={r._id} className={overdue ? "border-red-300" : ""}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                <div className="flex items-center gap-3">
                                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${overdue ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
                                        <CalendarClock className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="font-semibold">{p?.fullName || "Patient"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {r.type} • due {new Date(r.dueDate).toLocaleDateString()}
                                            {overdue && <span className="ml-1 font-semibold text-red-600">OVERDUE</span>}
                                            {r.lastRemindedAt && <span className="ml-1">• reminded {new Date(r.lastRemindedAt).toLocaleDateString()}</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[r.status] || ""}`}>{r.status}</span>
                                    <Select value={r.status} onValueChange={(v) => setStatus(r._id, v)}>
                                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" onClick={() => remind(r._id)} disabled={busyId === r._id}>
                                        {busyId === r._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="mr-1 h-3.5 w-3.5" />}
                                        Remind
                                    </Button>
                                    <button onClick={() => remove(r._id)} disabled={busyId === r._id} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
