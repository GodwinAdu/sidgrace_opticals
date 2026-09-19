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
import { Loader2, Plus, Search, User2, Trash2, FlaskConical } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { createLabCase, updateLabCaseStatus, deleteLabCase } from "@/lib/actions/lab-case.actions";

interface LabCase {
    _id: string;
    patientId?: { fullName?: string } | string;
    labName: string;
    caseType: string;
    tooth?: number | null;
    sentDate?: string;
    expectedDate?: string | null;
    status: string;
    cost?: number;
}
interface PatientLite { _id: string; fullName?: string; }

const CASE_TYPES = ["crown", "bridge", "denture", "veneer", "implant-crown", "night-guard", "retainer"];
const STATUSES = ["sent", "in-progress", "received", "fitted", "cancelled"];
const STATUS_COLOR: Record<string, string> = {
    sent: "bg-blue-100 text-blue-700",
    "in-progress": "bg-amber-100 text-amber-700",
    received: "bg-indigo-100 text-indigo-700",
    fitted: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

export function LabCaseManager({ cases, presetPatient }: { cases: LabCase[]; presetPatient?: PatientLite | null }) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();

    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(presetPatient || null);
    const lockedPatient = !!presetPatient;
    const [labName, setLabName] = useState("");
    const [caseType, setCaseType] = useState(CASE_TYPES[0]);
    const [tooth, setTooth] = useState("");
    const [expectedDate, setExpectedDate] = useState("");
    const [cost, setCost] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const search = () => {
        startTransition(async () => {
            try { setResults((await fetchPatientBySearch(term)) || []); } catch { setResults([]); }
        });
    };

    const create = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!labName.trim()) return toast.error("Enter a lab name");
        try {
            setSaving(true);
            await createLabCase({
                patientId: patient._id,
                labName: labName.trim(),
                caseType,
                tooth: tooth ? Number(tooth) : null,
                expectedDate: expectedDate || null,
                cost: Number(cost) || 0,
            });
            toast.success("Lab case created");
            setPatient(null); setTerm(""); setResults([]); setLabName(""); setTooth(""); setExpectedDate(""); setCost("");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    const setStatus = async (id: string, status: string) => {
        try { setBusyId(id); await updateLabCaseStatus(id, status, path); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    const remove = async (id: string) => {
        try { setBusyId(id); await deleteLabCase(id); toast.success("Removed"); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Send New Case</h3>
                    {!patient && !lockedPatient ? (
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
                                <User2 className="h-4 w-4 text-teal-600" /> {patient?.fullName}
                                {!lockedPatient && <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Lab name</label>
                                <Input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="e.g. Precision Dental Lab" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Case type</label>
                                <Select value={caseType} onValueChange={setCaseType}>
                                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                    <SelectContent>{CASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="w-20">
                                <label className="mb-1 block text-xs text-muted-foreground">Tooth</label>
                                <Input value={tooth} onChange={(e) => setTooth(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Expected</label>
                                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                            </div>
                            <div className="w-24">
                                <label className="mb-1 block text-xs text-muted-foreground">Cost</label>
                                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
                            </div>
                            <Button onClick={create} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Send
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lab Cases</h3>
                {(!cases || cases.length === 0) && <p className="text-sm text-muted-foreground">No lab cases.</p>}
                {cases?.map((c) => {
                    const p = typeof c.patientId === "object" ? c.patientId : null;
                    return (
                        <Card key={c._id}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"><FlaskConical className="h-5 w-5" /></span>
                                    <div>
                                        <p className="font-semibold">{c.caseType}{c.tooth ? ` (Tooth ${c.tooth})` : ""}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p?.fullName || "Patient"} • {c.labName}
                                            {c.sentDate ? ` • sent ${new Date(c.sentDate).toLocaleDateString()}` : ""}
                                            {c.expectedDate ? ` • due ${new Date(c.expectedDate).toLocaleDateString()}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[c.status] || ""}`}>{c.status}</span>
                                    <Select value={c.status} onValueChange={(v) => setStatus(c._id, v)}>
                                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <button onClick={() => remove(c._id)} disabled={busyId === c._id} className="text-red-500 hover:text-red-700">
                                        {busyId === c._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
