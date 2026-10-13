"use client";

import { useState } from "react";
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
import Link from "next/link";
import { Loader2, Search, User2, Ambulance, BedDouble, LogOut } from "lucide-react";
import { format } from "date-fns";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import {
    createEmergencyCase,
    assignBay,
    setDisposition,
} from "@/lib/actions/emergency.actions";
import { TRIAGE_LEVELS, triageSeverityRank } from "@/lib/clinical/emergency";

interface PatientLite { _id: string; fullName?: string; patientId?: string }
interface CaseRow {
    _id: string;
    caseNumber?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string;
    triageLevel?: string;
    chiefComplaint?: string;
    bay?: string;
    status?: string;
    disposition?: string;
    dispositionNote?: string;
    arrivedAt?: string;
    disposedAt?: string;
}

const DISPOSITIONS = [
    { value: "admit", label: "Admit" },
    { value: "discharge", label: "Discharge" },
    { value: "refer", label: "Refer" },
    { value: "transfer", label: "Transfer" },
] as const;

const triageTone = (level?: string) => {
    const rank = triageSeverityRank(level);
    if (rank <= 1) return "border-red-300 bg-red-50";
    if (rank === 2) return "border-orange-300 bg-orange-50";
    if (rank === 3) return "border-amber-200 bg-amber-50";
    return "border-slate-200 bg-slate-50";
};

const patientName = (p: CaseRow["patientId"]) =>
    typeof p === "object" && p ? p.fullName || "" : "";

export function EmergencyManager({
    board,
    disposed = [],
}: {
    board: CaseRow[];
    disposed?: CaseRow[];
}) {
    const router = useRouter();
    const path = usePathname();

    // Triage flow state
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [triageLevel, setTriageLevel] = useState("");
    const [chiefComplaint, setChiefComplaint] = useState("");
    const [bay, setBay] = useState("");
    const [searching, setSearching] = useState(false);
    const [triaging, setTriaging] = useState(false);

    // Row action state
    const [busyId, setBusyId] = useState<string | null>(null);
    const [bayInput, setBayInput] = useState<Record<string, string>>({});
    const [dispo, setDispo] = useState<Record<string, string>>({});
    const [dispoNote, setDispoNote] = useState<Record<string, string>>({});

    const search = async () => {
        try {
            setSearching(true);
            setResults((await fetchPatientBySearch(term)) || []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const triage = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!triageLevel) return toast.error("Select a triage level");
        if (!chiefComplaint.trim()) return toast.error("Enter the chief complaint");
        try {
            setTriaging(true);
            await createEmergencyCase(
                { patientId: patient._id, triageLevel, chiefComplaint, bay },
                path,
            );
            toast.success("Patient triaged");
            setPatient(null); setResults([]); setTerm(""); setTriageLevel(""); setChiefComplaint(""); setBay("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setTriaging(false);
        }
    };

    const doAssignBay = async (id: string) => {
        const value = bayInput[id];
        if (!value?.trim()) return toast.error("Enter a bay/space");
        try {
            setBusyId(id);
            await assignBay(id, value.trim(), path);
            toast.success("Bay assigned");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doDispose = async (id: string) => {
        const choice = dispo[id] as "admit" | "discharge" | "refer" | "transfer" | undefined;
        if (!choice) return toast.error("Pick a disposition");
        try {
            setBusyId(id);
            await setDisposition(id, choice, dispoNote[id] || "", path);
            toast.success("Disposition set");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Triage */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Triage Arrival</h3>

                    {!patient ? (
                        <div>
                            <div className="flex gap-2">
                                <Input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search patient..." className="max-w-sm" />
                                <Button type="button" onClick={search} disabled={searching}>
                                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {results.map((p) => (
                                    <button key={p._id} onClick={() => { setPatient(p); setResults([]); }} className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted">
                                        <User2 className="h-4 w-4 text-teal-600" /> {p.fullName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 px-3 py-2 text-sm">
                                <User2 className="h-4 w-4 text-teal-600" /> {patient.fullName}
                                <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Triage level</label>
                                    <Select value={triageLevel} onValueChange={setTriageLevel}>
                                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                                        <SelectContent>
                                            {TRIAGE_LEVELS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs text-muted-foreground">Chief complaint</label>
                                    <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g. chest pain" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Bay (optional)</label>
                                    <Input value={bay} onChange={(e) => setBay(e.target.value)} placeholder="e.g. Bay 3" />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={triage} disabled={triaging}>
                                    {triaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ambulance className="mr-2 h-4 w-4" />}
                                    Triage
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ER Board */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">ER Board</h3>
                {(!board || board.length === 0) && <p className="text-sm text-muted-foreground">No active emergency cases.</p>}
                {board?.map((c) => (
                    <Card key={c._id} className={triageTone(c.triageLevel)}>
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold">
                                        {patientName(c.patientId)}
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">{c.caseNumber}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Triage {c.triageLevel} · {c.status}
                                        {c.bay ? ` · ${c.bay}` : " · no bay"}
                                        {c.arrivedAt ? ` · arrived ${format(new Date(c.arrivedAt), "PP p")}` : ""}
                                    </p>
                                    {c.chiefComplaint && <p className="mt-1 text-sm">{c.chiefComplaint}</p>}
                                </div>
                            </div>

                            {/* Assign bay */}
                            <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                                <div className="w-40">
                                    <label className="mb-1 block text-xs text-muted-foreground">Assign bay</label>
                                    <Input
                                        value={bayInput[c._id] ?? ""}
                                        onChange={(e) => setBayInput((p) => ({ ...p, [c._id]: e.target.value }))}
                                        placeholder="e.g. Bay 2"
                                    />
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => doAssignBay(c._id)} disabled={busyId === c._id}>
                                    <BedDouble className="mr-1 h-4 w-4" /> Assign
                                </Button>
                            </div>

                            {/* Disposition */}
                            <div className="mt-2 flex flex-wrap items-end gap-2">
                                <div className="w-40">
                                    <label className="mb-1 block text-xs text-muted-foreground">Disposition</label>
                                    <Select value={dispo[c._id] || ""} onValueChange={(v) => setDispo((p) => ({ ...p, [c._id]: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                                        <SelectContent>
                                            {DISPOSITIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 min-w-[12rem]">
                                    <label className="mb-1 block text-xs text-muted-foreground">Note (optional)</label>
                                    <Textarea
                                        rows={1}
                                        value={dispoNote[c._id] || ""}
                                        onChange={(e) => setDispoNote((p) => ({ ...p, [c._id]: e.target.value }))}
                                        placeholder="Disposition note"
                                    />
                                </div>
                                <Button size="sm" onClick={() => doDispose(c._id)} disabled={busyId === c._id}>
                                    {busyId === c._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <LogOut className="mr-1 h-4 w-4" />}
                                    Set Disposition
                                </Button>
                                {dispo[c._id] === "admit" && (
                                    <Link href="/dashboard/admission" className="self-center text-xs text-teal-600 underline">
                                        Go to Admissions
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recently disposed */}
            {disposed.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recently Disposed</h3>
                    {disposed.map((c) => (
                        <Card key={c._id}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                <div>
                                    <p className="font-semibold">
                                        {patientName(c.patientId)}
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">{c.caseNumber}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Triage {c.triageLevel} · {c.disposition}
                                        {c.disposedAt ? ` · ${format(new Date(c.disposedAt), "PP p")}` : ""}
                                    </p>
                                    {c.dispositionNote && <p className="mt-1 text-xs text-muted-foreground">{c.dispositionNote}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
