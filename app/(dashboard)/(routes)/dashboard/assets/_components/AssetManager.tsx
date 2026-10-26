"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2,
    PlusCircle,
    Trash2,
    Wrench,
    HardDrive,
    AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
    createAsset,
    updateAssetStatus,
    logMaintenance,
    deleteAsset,
} from "@/lib/actions/asset.actions";
import {
    ASSET_STATUSES,
    nextAssetStatuses,
    maintenanceState,
    computeNextDue,
    daysUntilDue,
    type AssetStatus,
    type MaintenanceState,
} from "@/lib/clinical/assets";

/* ─────────────────────────────── Types (lite) ───────────────────────────── */

interface MaintenanceRow {
    _id?: string;
    type?: string;
    description?: string;
    servicedAt?: string;
    cost?: number;
    note?: string;
}

interface AssetRow {
    _id: string;
    assetTag?: string;
    name?: string;
    category?: string;
    serialNumber?: string;
    location?: string;
    status?: AssetStatus;
    scheduleIntervalDays?: number;
    lastServicedAt?: string | null;
    maintenanceRecords?: MaintenanceRow[];
    note?: string;
    createdAt?: string;
}

interface Props {
    assets: AssetRow[];
}

/* ─────────────────────────────── Helpers ────────────────────────────────── */

const statusTone = (status?: string) => {
    switch (status) {
        case "active":
            return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "maintenance":
            return "bg-amber-100 text-amber-800 border-amber-200";
        case "retired":
            return "bg-slate-100 text-slate-700 border-slate-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
};

const maintTone = (state: MaintenanceState) => {
    switch (state) {
        case "overdue":
            return "bg-red-100 text-red-800 border-red-200";
        case "due":
            return "bg-amber-100 text-amber-800 border-amber-200";
        case "ok":
            return "bg-emerald-100 text-emerald-800 border-emerald-200";
        default:
            return "bg-slate-100 text-slate-600 border-slate-200";
    }
};

const maintLabel = (state: MaintenanceState, days: number | null) => {
    switch (state) {
        case "overdue":
            return days === null ? "Overdue" : `Overdue ${Math.abs(days)}d`;
        case "due":
            return days === 0 ? "Due today" : `Due in ${days}d`;
        case "ok":
            return days === null ? "Scheduled" : `OK · ${days}d`;
        default:
            return "No schedule";
    }
};

const statusLabel = (v?: string) => ASSET_STATUSES.find((s) => s.value === v)?.label ?? v ?? "";

/* ────────────────────────────── Component ───────────────────────────────── */

export function AssetManager({ assets }: Props) {
    const router = useRouter();
    const path = usePathname();

    const [busyId, setBusyId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | AssetStatus>("all");

    // ── Register form ──
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [interval, setInterval] = useState<number>(0);
    const [creating, setCreating] = useState(false);

    // ── Per-asset maintenance form ──
    const [serviceOpen, setServiceOpen] = useState<string | null>(null);
    const [serviceDesc, setServiceDesc] = useState("");

    const resetForm = () => {
        setName(""); setCategory(""); setLocation(""); setSerialNumber(""); setInterval(0);
    };

    const visibleAssets = useMemo(
        () => (filter === "all" ? assets : assets.filter((a) => a.status === filter)),
        [assets, filter],
    );

    const dueCount = useMemo(
        () =>
            assets.filter((a) => {
                const s = maintenanceState(a.scheduleIntervalDays, a.lastServicedAt, new Date(), 7, a.createdAt);
                return s === "due" || s === "overdue";
            }).length,
        [assets],
    );

    const doCreate = async () => {
        if (!name.trim()) return toast.error("Enter an asset name");
        try {
            setCreating(true);
            await createAsset(
                { name, category, location, serialNumber, scheduleIntervalDays: Number(interval) || 0 },
                path,
            );
            toast.success("Asset registered");
            resetForm();
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const changeStatus = async (a: AssetRow, to: AssetStatus) => {
        try {
            setBusyId(a._id);
            await updateAssetStatus(a._id, to, path);
            toast.success(`Asset marked ${statusLabel(to).toLowerCase()}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doLogMaintenance = async (a: AssetRow) => {
        try {
            setBusyId(a._id);
            await logMaintenance(
                a._id,
                { description: serviceDesc, returnToActive: a.status === "maintenance" },
                path,
            );
            toast.success("Service recorded");
            setServiceOpen(null);
            setServiceDesc("");
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
            await deleteAsset(id);
            toast.success("Asset removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Register form */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Register Asset
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Autoclave" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Sterilizer" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Location / Ward</label>
                            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Theatre 1" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Serial number</label>
                            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Optional" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Maintenance interval (days)</label>
                            <Input
                                type="number"
                                min={0}
                                value={interval}
                                onChange={(e) => setInterval(Number(e.target.value))}
                                placeholder="0 = unscheduled"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={doCreate} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Register Asset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Filter bar + due summary */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
                        All
                    </Button>
                    {ASSET_STATUSES.map((s) => (
                        <Button
                            key={s.value}
                            variant={filter === s.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter(s.value)}
                        >
                            {s.label}
                        </Button>
                    ))}
                </div>
                {dueCount > 0 && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                        {dueCount} due / overdue
                    </Badge>
                )}
            </div>

            {/* Asset list */}
            <div className="space-y-3">
                {(!visibleAssets || visibleAssets.length === 0) && (
                    <p className="text-sm text-muted-foreground">No assets registered.</p>
                )}
                {visibleAssets.map((a) => {
                    const state = maintenanceState(a.scheduleIntervalDays, a.lastServicedAt, new Date(), 7, a.createdAt);
                    const days = daysUntilDue(a.scheduleIntervalDays, a.lastServicedAt, new Date(), a.createdAt);
                    const nextDue = computeNextDue(a.scheduleIntervalDays, a.lastServicedAt, a.createdAt);
                    const nexts = nextAssetStatuses((a.status as AssetStatus) ?? "active");
                    return (
                        <Card key={a._id}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="flex items-center gap-2 font-semibold">
                                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                                            {a.name || "Asset"}
                                            <span className="text-xs font-normal text-muted-foreground">{a.assetTag}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {a.category ? `${a.category} · ` : ""}
                                            {a.location ? `${a.location}` : "No location"}
                                            {a.serialNumber ? ` · SN ${a.serialNumber}` : ""}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className={maintTone(state)}>
                                                <Wrench className="mr-1 h-3 w-3" />
                                                {maintLabel(state, days)}
                                            </Badge>
                                            {nextDue && <span>Next due {format(nextDue, "PP")}</span>}
                                            {a.lastServicedAt && <span>· Last serviced {format(new Date(a.lastServicedAt), "PP")}</span>}
                                        </div>
                                        {a.maintenanceRecords && a.maintenanceRecords.length > 0 && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {a.maintenanceRecords.length} service record{a.maintenanceRecords.length === 1 ? "" : "s"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <Badge variant="outline" className={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
                                        {nexts.map((to) => (
                                            <Button
                                                key={to}
                                                size="sm"
                                                variant={to === "retired" ? "ghost" : "outline"}
                                                onClick={() => changeStatus(a, to)}
                                                disabled={busyId === a._id}
                                            >
                                                {busyId === a._id ? <Loader2 className="h-4 w-4 animate-spin" /> : statusLabel(to)}
                                            </Button>
                                        ))}
                                        {a.status !== "retired" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setServiceOpen(serviceOpen === a._id ? null : a._id)}
                                                disabled={busyId === a._id}
                                            >
                                                <Wrench className="mr-1 h-4 w-4" /> Log service
                                            </Button>
                                        )}
                                        <button onClick={() => remove(a._id)} disabled={busyId === a._id} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Inline service form */}
                                {serviceOpen === a._id && (
                                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="mb-1 block text-xs text-muted-foreground">What was done?</label>
                                            <Input
                                                value={serviceDesc}
                                                onChange={(e) => setServiceDesc(e.target.value)}
                                                placeholder="e.g. Calibrated and replaced filter"
                                            />
                                        </div>
                                        <Button size="sm" onClick={() => doLogMaintenance(a)} disabled={busyId === a._id}>
                                            {busyId === a._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record service"}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
