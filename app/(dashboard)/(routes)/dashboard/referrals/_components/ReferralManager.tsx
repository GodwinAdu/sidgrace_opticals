"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2,
    Search,
    User2,
    PlusCircle,
    Trash2,
    Share2,
    ArrowDownLeft,
    ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import {
    createReferral,
    updateReferralStatus,
    deleteReferral,
} from "@/lib/actions/referral.actions";
import {
    REFERRAL_DIRECTIONS,
    REFERRAL_STATUSES,
    nextReferralStatuses,
    type ReferralDirection,
    type ReferralStatus,
} from "@/lib/clinical/referral";

interface PatientLite { _id: string; fullName?: string; patientId?: string }
interface ReferralRow {
    _id: string;
    referralNumber?: string;
    direction?: ReferralDirection;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string | null;
    facility?: string;
    provider?: string;
    contact?: string;
    reason?: string;
    specialty?: string;
    status?: ReferralStatus;
    note?: string;
    createdAt?: string;
}

const pName = (p: ReferralRow["patientId"]) =>
    typeof p === "object" && p ? p.fullName || "" : "";

const statusTone = (status?: string) => {
    switch (status) {
        case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "accepted": return "bg-sky-100 text-sky-800 border-sky-200";
        case "declined": return "bg-red-100 text-red-800 border-red-200";
        case "cancelled": return "bg-slate-100 text-slate-600 border-slate-200";
        default: return "bg-amber-100 text-amber-800 border-amber-200";
    }
};

const statusLabel = (value?: string) =>
    REFERRAL_STATUSES.find((s) => s.value === value)?.label ?? value ?? "";

export function ReferralManager({ referrals }: { referrals: ReferralRow[] }) {
    const router = useRouter();
    const path = usePathname();

    // Raise referral form
    const [direction, setDirection] = useState<ReferralDirection>("out");
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [searching, setSearching] = useState(false);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [facility, setFacility] = useState("");
    const [provider, setProvider] = useState("");
    const [contact, setContact] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [creating, setCreating] = useState(false);

    // Board filters
    const [directionFilter, setDirectionFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const [busyId, setBusyId] = useState<string | null>(null);

    const filtered = useMemo(
        () =>
            referrals.filter(
                (r) =>
                    (directionFilter === "all" || r.direction === directionFilter) &&
                    (statusFilter === "all" || r.status === statusFilter),
            ),
        [referrals, directionFilter, statusFilter],
    );

    const pendingCount = useMemo(
        () => referrals.filter((r) => r.status === "pending").length,
        [referrals],
    );

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

    const resetForm = () => {
        setDirection("out"); setPatient(null); setResults([]); setTerm("");
        setFacility(""); setProvider(""); setContact(""); setSpecialty("");
        setReason(""); setNote("");
    };

    const doCreate = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!reason.trim()) return toast.error("A referral reason is required");
        try {
            setCreating(true);
            await createReferral(
                {
                    direction,
                    patientId: patient._id,
                    facility,
                    provider,
                    contact,
                    specialty,
                    reason,
                    note,
                },
                path,
            );
            toast.success("Referral raised");
            resetForm();
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const changeStatus = async (r: ReferralRow, to: ReferralStatus) => {
        try {
            setBusyId(r._id);
            await updateReferralStatus(r._id, to, "", path);
            toast.success(`Referral ${statusLabel(to).toLowerCase()}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const removeReferral = async (id: string) => {
        try {
            setBusyId(id);
            await deleteReferral(id);
            toast.success("Referral removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Raise referral */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Raise Referral</h3>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Share2 className="mr-1 h-3 w-3" /> {pendingCount} pending
                        </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Direction</label>
                            <Select value={direction} onValueChange={(v) => setDirection(v as ReferralDirection)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {REFERRAL_DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-muted-foreground">Patient</label>
                            {!patient ? (
                                <div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={term}
                                            onChange={(e) => setTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
                                            placeholder="Search patient..."
                                        />
                                        <Button type="button" onClick={search} disabled={searching}>
                                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {results.map((p) => (
                                            <button
                                                key={p._id}
                                                onClick={() => { setPatient(p); setResults([]); }}
                                                className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted"
                                            >
                                                <User2 className="h-4 w-4 text-indigo-600" /> {p.fullName}
                                                {p.patientId ? <span className="text-xs text-muted-foreground">({p.patientId})</span> : null}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 rounded-lg border bg-indigo-50/50 px-3 py-2 text-sm">
                                    <User2 className="h-4 w-4 text-indigo-600" /> {patient.fullName}
                                    <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">
                                {direction === "in" ? "Referring facility" : "Receiving facility"}
                            </label>
                            <Input value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="Facility / hospital" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Provider</label>
                            <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Clinician / dept" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Specialty</label>
                            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Contact (optional)</label>
                            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone / email" />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Reason</label>
                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Clinical reason for the referral" rows={2} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Note (optional)</label>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes" rows={2} />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={doCreate} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Raise Referral
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Board */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Referrals</h3>
                    <div className="flex gap-2">
                        <Select value={directionFilter} onValueChange={setDirectionFilter}>
                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All directions</SelectItem>
                                {REFERRAL_DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {REFERRAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {(!filtered || filtered.length === 0) && <p className="text-sm text-muted-foreground">No referrals to show.</p>}

                {filtered.map((r) => {
                    const nexts = nextReferralStatuses((r.status as ReferralStatus) ?? "pending");
                    const Icon = r.direction === "in" ? ArrowDownLeft : ArrowUpRight;
                    return (
                        <Card key={r._id}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            <Icon className={`mr-1 inline h-4 w-4 ${r.direction === "in" ? "text-emerald-600" : "text-indigo-600"}`} />
                                            {pName(r.patientId) || "Patient"}
                                            <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">
                                                {r.direction === "in" ? "inbound" : "outbound"}
                                            </span>
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">{r.referralNumber}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {r.facility ? r.facility : ""}
                                            {r.provider ? ` · ${r.provider}` : ""}
                                            {r.specialty ? ` · ${r.specialty}` : ""}
                                            {r.contact ? ` · ${r.contact}` : ""}
                                            {r.createdAt ? ` · ${format(new Date(r.createdAt), "PP")}` : ""}
                                        </p>
                                        {r.reason && <p className="mt-1 text-sm">{r.reason}</p>}
                                        {r.note && <p className="mt-0.5 text-xs text-muted-foreground">{r.note}</p>}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <Badge variant="outline" className={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                                        {nexts.map((to) => (
                                            <Button
                                                key={to}
                                                size="sm"
                                                variant={to === "cancelled" || to === "declined" ? "ghost" : "outline"}
                                                onClick={() => changeStatus(r, to)}
                                                disabled={busyId === r._id}
                                            >
                                                {busyId === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : statusLabel(to)}
                                            </Button>
                                        ))}
                                        <button onClick={() => removeReferral(r._id)} disabled={busyId === r._id} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
