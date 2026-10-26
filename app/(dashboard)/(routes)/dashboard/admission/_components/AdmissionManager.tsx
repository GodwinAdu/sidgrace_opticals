"use client";

import { useState, useTransition } from "react";
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
import { Loader2, Search, User2, BedDouble, ArrowRightLeft, LogOut, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { getPreviousVisitsByPatientId } from "@/lib/actions/attendance.actions";
import { getVacantBeds } from "@/lib/actions/bed.actions";
import { admitPatient, transferBed, requestBedTransfer, dischargePatient } from "@/lib/actions/admission.actions";

interface WardLite { _id: string; name: string }
interface BedLite { _id: string; label: string; wardId: string }
interface PatientLite { _id: string; fullName?: string; patientId?: string }
interface VisitLite { _id: string; status?: string; visitType?: string; date?: string }
interface AdmissionRow {
    _id: string;
    patientId?: { _id?: string; fullName?: string } | string;
    attendanceId?: string;
    wardId?: { name?: string } | string;
    bedId?: { label?: string } | string;
    admittedAt?: string;
    reason?: string;
    admittingStaff?: { fullName?: string } | string;
}

const dayCount = (from?: string) => {
    if (!from) return 1;
    const ms = Date.now() - new Date(from).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

interface AwaitingRow {
    _id: string;
    patientId?: { fullName?: string; patientId?: string } | string;
    date?: string;
}

export function AdmissionManager({
    wards,
    admissions,
    awaiting = [],
}: {
    wards: WardLite[];
    admissions: AdmissionRow[];
    awaiting?: AwaitingRow[];
}) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();

    // Admit flow state
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [visits, setVisits] = useState<VisitLite[]>([]);
    const [visitId, setVisitId] = useState("");
    const [wardId, setWardId] = useState("");
    const [vacantBeds, setVacantBeds] = useState<BedLite[]>([]);
    const [bedId, setBedId] = useState("");
    const [reason, setReason] = useState("");
    const [admitting, setAdmitting] = useState(false);

    // Row action state
    const [busyId, setBusyId] = useState<string | null>(null);
    const [transferTo, setTransferTo] = useState<Record<string, string>>({});

    const search = () =>
        startTransition(async () => {
            try {
                setResults((await fetchPatientBySearch(term)) || []);
            } catch {
                setResults([]);
            }
        });

    const pickPatient = async (p: PatientLite) => {
        setPatient(p);
        setResults([]);
        try {
            const v = await getPreviousVisitsByPatientId(p._id);
            setVisits(v || []);
        } catch {
            setVisits([]);
        }
    };

    const pickWard = async (id: string) => {
        setWardId(id);
        setBedId("");
        try {
            setVacantBeds((await getVacantBeds(id)) || []);
        } catch {
            setVacantBeds([]);
        }
    };

    const admit = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!visitId) return toast.error("Select the patient's visit");
        if (!wardId || !bedId) return toast.error("Select ward and bed");
        try {
            setAdmitting(true);
            await admitPatient({ patientId: patient._id, attendanceId: visitId, wardId, bedId, reason }, path);
            toast.success("Patient admitted");
            setPatient(null); setVisits([]); setVisitId(""); setWardId(""); setBedId(""); setReason(""); setTerm("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setAdmitting(false);
        }
    };

    const doTransfer = async (admissionId: string) => {
        const newBedId = transferTo[admissionId];
        if (!newBedId) return toast.error("Pick a target bed");
        try {
            setBusyId(admissionId);
            await transferBed(admissionId, newBedId, path);
            toast.success("Patient transferred");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doRequestTransfer = async (admissionId: string) => {
        const newBedId = transferTo[admissionId];
        if (!newBedId) return toast.error("Pick a target bed");
        try {
            setBusyId(admissionId);
            await requestBedTransfer(admissionId, newBedId, "", path);
            toast.success("Transfer requested — awaiting approval on the Queue screen");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doDischarge = async (admissionId: string) => {
        try {
            setBusyId(admissionId);
            await dischargePatient(admissionId, "", path);
            toast.success("Patient discharged");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Admit */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Admit Patient</h3>

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
                                    <button key={p._id} onClick={() => pickPatient(p)} className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted">
                                        <User2 className="h-4 w-4 text-teal-600" /> {p.fullName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 px-3 py-2 text-sm">
                                <User2 className="h-4 w-4 text-teal-600" /> {patient.fullName}
                                <Button size="sm" variant="ghost" onClick={() => { setPatient(null); setVisits([]); }}>Change</Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Visit</label>
                                    <Select value={visitId} onValueChange={setVisitId}>
                                        <SelectTrigger><SelectValue placeholder="Select visit" /></SelectTrigger>
                                        <SelectContent>
                                            {visits.length === 0 ? (
                                                <SelectItem value="none" disabled>No visits — check the patient into OPD first</SelectItem>
                                            ) : visits.map((v) => (
                                                <SelectItem key={v._id} value={v._id}>
                                                    {v.date ? format(new Date(v.date), "PP") : v._id.slice(-5)} · {v.status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Ward</label>
                                    <Select value={wardId} onValueChange={pickWard}>
                                        <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                                        <SelectContent>
                                            {wards.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Bed</label>
                                    <Select value={bedId} onValueChange={setBedId} disabled={!wardId}>
                                        <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                                        <SelectContent>
                                            {vacantBeds.length === 0 ? (
                                                <SelectItem value="none" disabled>No vacant beds in this ward</SelectItem>
                                            ) : vacantBeds.map((b) => <SelectItem key={b._id} value={b._id}>{b.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <label className="mb-1 block text-xs text-muted-foreground">Reason</label>
                                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Admission reason" />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={admit} disabled={admitting}>
                                    {admitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BedDouble className="mr-2 h-4 w-4" />}
                                    Admit
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Awaiting bed assignment — checked in as inpatient (planned) at OPD */}
            {awaiting.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-600">Awaiting Bed Assignment</h3>
                    {awaiting.map((v) => {
                        const pName = typeof v.patientId === "object" && v.patientId ? v.patientId.fullName : "";
                        return (
                            <Card key={v._id} className="border-amber-200">
                                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                    <div>
                                        <p className="font-semibold">{pName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Checked in as inpatient{v.date ? ` · ${format(new Date(v.date), "PP")}` : ""} · no bed yet
                                        </p>
                                    </div>
                                    <Link href={`/dashboard/attendance/${v._id}`}>
                                        <Button size="sm" variant="outline">
                                            <BedDouble className="mr-1 h-4 w-4" /> Place in Bed
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Active admissions */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Current Inpatients</h3>
                {(!admissions || admissions.length === 0) && <p className="text-sm text-muted-foreground">No active admissions.</p>}
                {admissions?.map((a) => {
                    const pName = typeof a.patientId === "object" && a.patientId ? a.patientId.fullName : "";
                    const ward = typeof a.wardId === "object" && a.wardId ? a.wardId.name : "";
                    const bed = typeof a.bedId === "object" && a.bedId ? a.bedId.label : "";
                    const bedOptions = wards; // ward select for transfer handled below via vacant lookup is simplified
                    void bedOptions;
                    return (
                        <Card key={a._id}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{pName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {ward} · Bed {bed} · Day {dayCount(a.admittedAt)}
                                            {a.admittedAt ? ` · since ${format(new Date(a.admittedAt), "PP")}` : ""}
                                        </p>
                                        {a.reason && <p className="mt-1 text-xs text-muted-foreground">Reason: {a.reason}</p>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {a.attendanceId && (
                                            <Link href={`/dashboard/attendance/${a.attendanceId}`}>
                                                <Button size="sm" variant="outline"><Stethoscope className="mr-1 h-4 w-4" /> Visit</Button>
                                            </Link>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => doDischarge(a._id)} disabled={busyId === a._id}>
                                            {busyId === a._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <LogOut className="mr-1 h-4 w-4" />}
                                            Discharge
                                        </Button>
                                    </div>
                                </div>

                                {/* Transfer */}
                                <TransferControl
                                    admissionId={a._id}
                                    wards={wards}
                                    value={transferTo[a._id] || ""}
                                    onPick={(bedId) => setTransferTo((p) => ({ ...p, [a._id]: bedId }))}
                                    onTransfer={() => doTransfer(a._id)}
                                    onRequest={() => doRequestTransfer(a._id)}
                                    busy={busyId === a._id}
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

/** Inline transfer picker: choose a ward, load its vacant beds, pick one, transfer. */
function TransferControl({
    admissionId,
    wards,
    value,
    onPick,
    onTransfer,
    onRequest,
    busy,
}: {
    admissionId: string;
    wards: WardLite[];
    value: string;
    onPick: (bedId: string) => void;
    onTransfer: () => void;
    onRequest: () => void;
    busy: boolean;
}) {
    const [wardId, setWardId] = useState("");
    const [beds, setBeds] = useState<BedLite[]>([]);
    void admissionId;

    const loadBeds = async (id: string) => {
        setWardId(id);
        onPick("");
        try {
            setBeds((await getVacantBeds(id)) || []);
        } catch {
            setBeds([]);
        }
    };

    return (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="w-40">
                <label className="mb-1 block text-xs text-muted-foreground">Transfer to ward</label>
                <Select value={wardId} onValueChange={loadBeds}>
                    <SelectTrigger><SelectValue placeholder="Ward" /></SelectTrigger>
                    <SelectContent>
                        {wards.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="w-32">
                <label className="mb-1 block text-xs text-muted-foreground">Bed</label>
                <Select value={value} onValueChange={onPick} disabled={!wardId}>
                    <SelectTrigger><SelectValue placeholder="Bed" /></SelectTrigger>
                    <SelectContent>
                        {beds.length === 0 ? (
                            <SelectItem value="none" disabled>No vacant beds</SelectItem>
                        ) : beds.map((b) => <SelectItem key={b._id} value={b._id}>{b.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button size="sm" variant="secondary" onClick={onTransfer} disabled={busy || !value}>
                <ArrowRightLeft className="mr-1 h-4 w-4" /> Transfer
            </Button>
            <Button size="sm" variant="outline" onClick={onRequest} disabled={busy || !value}>
                <ArrowRightLeft className="mr-1 h-4 w-4" /> Request (approval)
            </Button>
        </div>
    );
}
