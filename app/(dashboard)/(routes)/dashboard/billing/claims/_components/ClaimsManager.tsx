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
import { Loader2, Plus, Search, User2, Trash2, CheckCircle2 } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { createClaim, updateClaim, deleteClaim } from "@/lib/actions/insurance.actions";

interface Claim {
    _id: string;
    claimNumber: string;
    patientId?: { fullName?: string } | string;
    amountClaimed: number;
    amountApproved: number;
    status: string;
    notes?: string;
    createdAt?: string;
}
interface PatientLite { _id: string; fullName?: string; patientId?: string; }

const STATUSES = ["draft", "submitted", "pre-authorized", "approved", "partially-approved", "rejected", "paid"];
const STATUS_COLOR: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    submitted: "bg-blue-100 text-blue-700",
    "pre-authorized": "bg-indigo-100 text-indigo-700",
    approved: "bg-green-100 text-green-700",
    "partially-approved": "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-emerald-100 text-emerald-700",
};

export function ClaimsManager({ claims }: { claims: Claim[] }) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();

    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const search = () => {
        startTransition(async () => {
            try {
                setResults((await fetchPatientBySearch(term)) || []);
            } catch {
                setResults([]);
            }
        });
    };

    const create = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!Number(amount)) return toast.error("Enter claimed amount");
        try {
            setSaving(true);
            await createClaim({ patientId: patient._id, amountClaimed: Number(amount) });
            toast.success("Claim created");
            setPatient(null); setAmount(""); setTerm(""); setResults([]);
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (id: string, status: string) => {
        try {
            setBusyId(id);
            await updateClaim(id, { status }, path);
            toast.success("Claim updated");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const approve = async (id: string, amt: string) => {
        try {
            setBusyId(id);
            await updateClaim(id, { amountApproved: Number(amt) || 0 }, path);
            toast.success("Approved amount saved");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    // One-click: approve the full claimed amount and post the insurer's payment
    // to the linked invoice. Handles the common "insurer paid as expected" case.
    const approveInFull = async (id: string, claimed: number) => {
        try {
            setBusyId(id);
            await updateClaim(id, { amountApproved: Number(claimed) || 0, status: "approved" }, path);
            toast.success("Claim approved in full");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteClaim(id);
            toast.success("Claim removed");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New Claim</h3>
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
                            <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 px-3 py-2">
                                <User2 className="h-4 w-4 text-teal-600" /> {patient.fullName}
                                <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Amount claimed</label>
                                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40" />
                            </div>
                            <Button onClick={create} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Create Claim
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">All Claims</h3>
                {(!claims || claims.length === 0) && <p className="text-sm text-muted-foreground">No claims yet.</p>}
                {claims?.map((c) => (
                    <Card key={c._id}>
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{c.claimNumber}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {typeof c.patientId === "object" && c.patientId ? c.patientId.fullName : ""}
                                        {c.createdAt ? ` • ${new Date(c.createdAt).toLocaleDateString()}` : ""}
                                    </p>
                                </div>
                                <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[c.status] || ""}`}>{c.status}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-end gap-4">
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Claimed: </span>
                                    <span className="font-semibold">{Number(c.amountClaimed).toFixed(2)}</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Approved</label>
                                        <Input
                                            type="number"
                                            defaultValue={c.amountApproved}
                                            className="w-32"
                                            onBlur={(e) => e.target.value !== String(c.amountApproved) && approve(c._id, e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                                        <Select value={c.status} onValueChange={(v) => setStatus(c._id, v)}>
                                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {!["approved", "partially-approved", "paid", "rejected"].includes(c.status) && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="mb-1"
                                            onClick={() => approveInFull(c._id, Number(c.amountClaimed) || 0)}
                                            disabled={busyId === c._id}
                                        >
                                            {busyId === c._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            Approve in Full
                                        </Button>
                                    )}
                                    <button onClick={() => remove(c._id)} disabled={busyId === c._id} className="mb-1 text-red-500 hover:text-red-700">
                                        {busyId === c._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
