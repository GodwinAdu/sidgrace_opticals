"use client";

import { useState } from "react";
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
import { Loader2, Plus, BedDouble, Trash2, Wrench, Undo2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { createWard, deleteWard } from "@/lib/actions/ward.actions";
import { createBed, updateBedStatus, deleteBed } from "@/lib/actions/bed.actions";

interface BedRow {
    _id: string;
    label: string;
    status: "vacant" | "occupied" | "maintenance";
    patientName?: string;
}
interface WardRow {
    _id: string;
    name: string;
    type: string;
    dailyRate?: number;
    isActive?: boolean;
    beds: BedRow[];
}

const WARD_TYPES = ["general", "private", "semi-private", "icu", "maternity", "pediatric", "other"];
const BED_STATUS_COLOR: Record<string, string> = {
    vacant: "bg-green-100 text-green-700",
    occupied: "bg-red-100 text-red-700",
    maintenance: "bg-amber-100 text-amber-700",
};

export function WardBedBoard({ board, currency = "" }: { board: WardRow[]; currency?: string }) {
    const router = useRouter();
    const path = usePathname();

    const [wardName, setWardName] = useState("");
    const [wardType, setWardType] = useState("general");
    const [wardRate, setWardRate] = useState("0");
    const [savingWard, setSavingWard] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [bedLabel, setBedLabel] = useState<Record<string, string>>({});

    const addWard = async () => {
        if (!wardName.trim()) return toast.error("Enter a ward name");
        try {
            setSavingWard(true);
            await createWard({ name: wardName.trim(), type: wardType, dailyRate: Number(wardRate) || 0 }, path);
            toast.success("Ward created");
            setWardName(""); setWardType("general"); setWardRate("0");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSavingWard(false);
        }
    };

    const removeWard = async (id: string) => {
        try {
            setBusy(id);
            await deleteWard(id);
            toast.success("Ward deleted");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(null);
        }
    };

    const addBed = async (wardId: string) => {
        const label = (bedLabel[wardId] || "").trim();
        if (!label) return toast.error("Enter a bed label");
        try {
            setBusy(wardId);
            await createBed({ label, wardId }, path);
            toast.success("Bed added");
            setBedLabel((p) => ({ ...p, [wardId]: "" }));
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(null);
        }
    };

    const setStatus = async (bedId: string, status: "vacant" | "maintenance") => {
        try {
            setBusy(bedId);
            await updateBedStatus(bedId, status, path);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(null);
        }
    };

    const removeBed = async (bedId: string) => {
        try {
            setBusy(bedId);
            await deleteBed(bedId);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Create ward */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add Ward</h3>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[200px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Ward name</label>
                            <Input value={wardName} onChange={(e) => setWardName(e.target.value)} placeholder="e.g. General Ward A" />
                        </div>
                        <div className="w-40">
                            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                            <Select value={wardType} onValueChange={setWardType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {WARD_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-36">
                            <label className="mb-1 block text-xs text-muted-foreground">Daily rate</label>
                            <Input type="number" value={wardRate} onChange={(e) => setWardRate(e.target.value)} />
                        </div>
                        <Button onClick={addWard} disabled={savingWard}>
                            {savingWard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add Ward
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Bed board */}
            {(!board || board.length === 0) ? (
                <p className="text-sm text-muted-foreground">No wards yet. Create one above.</p>
            ) : (
                board.map((w) => {
                    const occupied = w.beds.filter((b) => b.status === "occupied").length;
                    return (
                        <Card key={w._id}>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="font-semibold">
                                            {w.name} <span className="text-xs font-normal capitalize text-muted-foreground">· {w.type}</span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {occupied}/{w.beds.length} occupied
                                            {Number(w.dailyRate) > 0 ? ` · ${formatMoney(Number(w.dailyRate), currency)}/day` : " · no bed charge"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeWard(w._id)}
                                        disabled={busy === w._id}
                                        className="text-red-500 hover:text-red-700"
                                        title="Delete ward"
                                    >
                                        {busy === w._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                    {w.beds.map((b) => (
                                        <div key={b._id} className="rounded-lg border p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <BedDouble className="h-4 w-4" /> {b.label}
                                                </span>
                                                <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${BED_STATUS_COLOR[b.status]}`}>
                                                    {b.status}
                                                </span>
                                            </div>
                                            {b.status === "occupied" && b.patientName && (
                                                <p className="mt-1 truncate text-xs text-muted-foreground">{b.patientName}</p>
                                            )}
                                            {b.status !== "occupied" && (
                                                <div className="mt-2 flex gap-2">
                                                    {b.status === "vacant" ? (
                                                        <button onClick={() => setStatus(b._id, "maintenance")} disabled={busy === b._id} className="text-xs text-amber-600 hover:underline" title="Mark maintenance">
                                                            <Wrench className="inline h-3 w-3" /> Maint.
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setStatus(b._id, "vacant")} disabled={busy === b._id} className="text-xs text-green-600 hover:underline" title="Mark vacant">
                                                            <Undo2 className="inline h-3 w-3" /> Free
                                                        </button>
                                                    )}
                                                    <button onClick={() => removeBed(b._id)} disabled={busy === b._id} className="text-xs text-red-500 hover:underline">
                                                        <Trash2 className="inline h-3 w-3" /> Del
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-end gap-2">
                                    <div className="w-40">
                                        <label className="mb-1 block text-xs text-muted-foreground">New bed label</label>
                                        <Input
                                            value={bedLabel[w._id] || ""}
                                            onChange={(e) => setBedLabel((p) => ({ ...p, [w._id]: e.target.value }))}
                                            placeholder="e.g. B1"
                                        />
                                    </div>
                                    <Button variant="secondary" onClick={() => addBed(w._id)} disabled={busy === w._id}>
                                        <Plus className="mr-1 h-4 w-4" /> Add Bed
                                    </Button>
                                    {w.isActive === false && <Badge variant="outline">Inactive</Badge>}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
}
