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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, Search, User2, Trash2 } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { addToWaitlist, updateWaitlistStatus, removeFromWaitlist } from "@/lib/actions/waitlist.actions";

interface Entry {
    _id: string;
    patientId?: { fullName?: string; phone?: string } | string;
    reason?: string;
    priority: string;
    status: string;
    createdAt?: string;
}
interface PatientLite { _id: string; fullName?: string; phone?: string; }

const PRIORITIES = ["normal", "urgent", "emergency"];
const STATUSES = ["waiting", "contacted", "scheduled", "removed"];
const PRIORITY_COLOR: Record<string, string> = {
    normal: "bg-slate-100 text-slate-700",
    urgent: "bg-amber-100 text-amber-700",
    emergency: "bg-red-100 text-red-700",
};

export function WaitlistManager({ entries }: { entries: Entry[] }) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [reason, setReason] = useState("");
    const [priority, setPriority] = useState("normal");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const search = () => {
        startTransition(async () => {
            try { setResults((await fetchPatientBySearch(term)) || []); } catch { setResults([]); }
        });
    };

    const add = async () => {
        if (!patient) return toast.error("Select a patient");
        try {
            setSaving(true);
            await addToWaitlist({ patientId: patient._id, reason, priority: priority as "normal" });
            toast.success("Added to waitlist");
            setPatient(null); setTerm(""); setResults([]); setReason("");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    const setStatus = async (id: string, status: string) => {
        try { setBusyId(id); await updateWaitlistStatus(id, status, path); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    const remove = async (id: string) => {
        try { setBusyId(id); await removeFromWaitlist(id); toast.success("Removed"); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add to Waitlist</h3>
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
                            <div className="flex-1 min-w-[180px]">
                                <label className="mb-1 block text-xs text-muted-foreground">Reason</label>
                                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. cancellation slot" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Button onClick={add} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Current Waitlist</h3>
                {(!entries || entries.length === 0) && <p className="text-sm text-muted-foreground">Waitlist is empty.</p>}
                {entries?.map((e) => {
                    const p = typeof e.patientId === "object" ? e.patientId : null;
                    return (
                        <Card key={e._id}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                <div>
                                    <p className="font-semibold">{p?.fullName || "Patient"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {e.reason || "—"}{e.createdAt ? ` • added ${new Date(e.createdAt).toLocaleDateString()}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={PRIORITY_COLOR[e.priority]}>{e.priority}</Badge>
                                    <Select value={e.status} onValueChange={(v) => setStatus(e._id, v)}>
                                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <button onClick={() => remove(e._id)} disabled={busyId === e._id} className="text-red-500 hover:text-red-700">
                                        {busyId === e._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
