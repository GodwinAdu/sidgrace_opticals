"use client";

import { useMemo, useState } from "react";
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
import {
    Loader2,
    PlusCircle,
    Trash2,
    Ticket,
    MonitorPlay,
    BedDouble,
    Check,
    X,
    ArrowRightLeft,
} from "lucide-react";
import {
    issueTicket,
    updateTicketStatus,
    deleteTicket,
} from "@/lib/actions/queue.actions";
import {
    approveBedTransfer,
    rejectBedTransfer,
} from "@/lib/actions/admission.actions";
import {
    QUEUE_SERVICES,
    QUEUE_STATUSES,
    nextTicketStatuses,
    isActiveTicket,
    type QueueService,
    type QueueStatus,
} from "@/lib/clinical/queue";

interface TicketRow {
    _id: string;
    service: QueueService;
    number: number;
    label?: string;
    status: QueueStatus;
    note?: string;
    patientId?: { fullName?: string } | string | null;
}

interface TransferRow {
    _id: string;
    reason?: string;
    status?: string;
    patientId?: { fullName?: string } | string | null;
    fromWardId?: { name?: string } | string | null;
    fromBedId?: { label?: string } | string | null;
    toWardId?: { name?: string } | string | null;
    toBedId?: { label?: string } | string | null;
}

const name = (v: TransferRow["patientId"]) =>
    typeof v === "object" && v ? v.fullName || "" : "";
const wardName = (v: TransferRow["fromWardId"]) =>
    typeof v === "object" && v ? v.name || "" : "";
const bedLabel = (v: TransferRow["fromBedId"]) =>
    typeof v === "object" && v ? v.label || "" : "";

const serviceLabel = (value?: string) =>
    QUEUE_SERVICES.find((s) => s.value === value)?.label ?? value ?? "";
const statusLabel = (value?: string) =>
    QUEUE_STATUSES.find((s) => s.value === value)?.label ?? value ?? "";

const statusTone = (status?: string) => {
    switch (status) {
        case "serving": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "called": return "bg-sky-100 text-sky-800 border-sky-200 animate-pulse";
        case "done": return "bg-slate-100 text-slate-600 border-slate-200";
        case "skipped": return "bg-red-100 text-red-700 border-red-200";
        default: return "bg-amber-100 text-amber-800 border-amber-200";
    }
};

const serviceTone = (service?: string) => {
    switch (service) {
        case "pharmacy": return "border-l-4 border-l-fuchsia-500";
        case "lab": return "border-l-4 border-l-cyan-500";
        default: return "border-l-4 border-l-teal-500";
    }
};

export function QueueManager({
    tickets,
    transfers,
}: {
    tickets: TicketRow[];
    transfers: TransferRow[];
}) {
    const router = useRouter();
    const path = usePathname();

    // Issue token form
    const [service, setService] = useState<QueueService>("opd");
    const [label, setLabel] = useState("");
    const [issuing, setIssuing] = useState(false);

    // Board filters
    const [serviceFilter, setServiceFilter] = useState<string>("all");
    const [busyId, setBusyId] = useState<string | null>(null);

    const filtered = useMemo(
        () =>
            tickets.filter(
                (t) => serviceFilter === "all" || t.service === serviceFilter,
            ),
        [tickets, serviceFilter],
    );

    const nowServing = useMemo(
        () => tickets.filter((t) => t.status === "serving" || t.status === "called"),
        [tickets],
    );
    const waitingCount = useMemo(
        () => tickets.filter((t) => t.status === "waiting").length,
        [tickets],
    );

    const doIssue = async () => {
        try {
            setIssuing(true);
            await issueTicket({ service, label }, path);
            toast.success("Token issued");
            setLabel("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setIssuing(false);
        }
    };

    const changeStatus = async (t: TicketRow, to: QueueStatus) => {
        try {
            setBusyId(t._id);
            await updateTicketStatus(t._id, to, path);
            toast.success(`Token ${statusLabel(to).toLowerCase()}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const removeTicket = async (id: string) => {
        try {
            setBusyId(id);
            await deleteTicket(id);
            toast.success("Token removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const decideTransfer = async (id: string, approve: boolean) => {
        try {
            setBusyId(id);
            if (approve) await approveBedTransfer(id, "", path);
            else await rejectBedTransfer(id, "", path);
            toast.success(approve ? "Transfer approved — patient moved" : "Transfer rejected");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Display screen — now serving */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <CardContent className="pt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-300">
                            <MonitorPlay className="h-4 w-4" /> Now Serving
                        </h3>
                        <span className="text-xs text-slate-400">{waitingCount} waiting</span>
                    </div>
                    {nowServing.length === 0 ? (
                        <p className="py-6 text-center text-slate-400">No tokens are being called right now.</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {nowServing.map((t) => (
                                <div key={t._id} className="rounded-xl bg-white/10 p-4 text-center">
                                    <p className="text-xs uppercase tracking-wide text-slate-300">{serviceLabel(t.service)}</p>
                                    <p className="my-1 text-4xl font-bold tabular-nums">#{t.number}</p>
                                    <Badge variant="outline" className={statusTone(t.status) + " border"}>
                                        {statusLabel(t.status)}
                                    </Badge>
                                    {t.label ? <p className="mt-1 truncate text-xs text-slate-300">{t.label}</p> : null}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Issue token */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Issue Token</h3>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-56">
                            <label className="mb-1 block text-xs text-muted-foreground">Service</label>
                            <Select value={service} onValueChange={(v) => setService(v as QueueService)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {QUEUE_SERVICES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-64">
                            <label className="mb-1 block text-xs text-muted-foreground">Label (optional)</label>
                            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Walk-in name / note" />
                        </div>
                        <Button onClick={doIssue} disabled={issuing}>
                            {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Issue Token
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Queue board */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <Ticket className="h-4 w-4" /> Today&apos;s Queue
                    </h3>
                    <Select value={serviceFilter} onValueChange={setServiceFilter}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All services</SelectItem>
                            {QUEUE_SERVICES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {(!filtered || filtered.length === 0) && <p className="text-sm text-muted-foreground">No tokens issued today.</p>}

                {filtered.map((t) => {
                    const nexts = nextTicketStatuses(t.status);
                    return (
                        <Card key={t._id} className={serviceTone(t.service)}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-bold tabular-nums">#{t.number}</span>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{serviceLabel(t.service)}</p>
                                            {t.label ? <p className="text-sm">{t.label}</p> : null}
                                            {name(t.patientId) ? <p className="text-xs text-muted-foreground">{name(t.patientId)}</p> : null}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <Badge variant="outline" className={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
                                        {isActiveTicket(t.status) && nexts.map((to) => (
                                            <Button
                                                key={to}
                                                size="sm"
                                                variant={to === "skipped" || to === "waiting" ? "ghost" : "outline"}
                                                onClick={() => changeStatus(t, to)}
                                                disabled={busyId === t._id}
                                            >
                                                {busyId === t._id ? <Loader2 className="h-4 w-4 animate-spin" /> : statusLabel(to)}
                                            </Button>
                                        ))}
                                        <button onClick={() => removeTicket(t._id)} disabled={busyId === t._id} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Pending bed transfers */}
            <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <BedDouble className="h-4 w-4" /> Pending Bed Transfers
                </h3>
                {(!transfers || transfers.length === 0) && <p className="text-sm text-muted-foreground">No transfers awaiting approval.</p>}
                {transfers.map((r) => (
                    <Card key={r._id} className="border-amber-200">
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{name(r.patientId) || "Patient"}</p>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                        {wardName(r.fromWardId)} · Bed {bedLabel(r.fromBedId)}
                                        <ArrowRightLeft className="mx-1 inline h-3 w-3" />
                                        {wardName(r.toWardId)} · Bed {bedLabel(r.toBedId)}
                                    </p>
                                    {r.reason ? <p className="mt-1 text-sm">{r.reason}</p> : null}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => decideTransfer(r._id, true)} disabled={busyId === r._id}>
                                        {busyId === r._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => decideTransfer(r._id, false)} disabled={busyId === r._id}>
                                        <X className="mr-1 h-4 w-4" /> Reject
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
