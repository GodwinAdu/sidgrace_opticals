"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, FlaskConical, ScanLine, CheckCircle2, X } from "lucide-react";
import { updateLabOrderStatus, enterLabResults } from "@/lib/actions/lab-order.actions";

interface Test { name: string; result?: string; unit?: string; referenceRange?: string; flag?: "normal" | "high" | "low" | "abnormal" | "" }
interface Order {
    _id: string;
    orderNumber: string;
    category: "lab" | "radiology";
    status: "ordered" | "collected" | "resulted" | "cancelled";
    tests: Test[];
    note?: string;
    resultNote?: string;
    patientId?: { fullName?: string } | string;
    createdAt?: string;
}

const STATUS_COLOR: Record<string, string> = {
    ordered: "bg-blue-100 text-blue-700",
    collected: "bg-amber-100 text-amber-700",
    resulted: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-600",
};

export function LabWorklist({ orders }: { orders: Order[] }) {
    const router = useRouter();
    const path = usePathname();
    const [busy, setBusy] = useState<string | null>(null);
    const [resultsFor, setResultsFor] = useState<string | null>(null);
    const [draft, setDraft] = useState<Test[]>([]);
    const [resultNote, setResultNote] = useState("");

    const advance = async (id: string, status: "collected" | "resulted" | "cancelled") => {
        try {
            setBusy(id);
            await updateLabOrderStatus(id, status, path);
            toast.success(`Marked ${status}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(null);
        }
    };

    const openResults = (o: Order) => {
        setResultsFor(o._id);
        setDraft(o.tests.map((t) => ({ ...t })));
        setResultNote(o.resultNote || "");
    };

    const saveResults = async (id: string) => {
        try {
            setBusy(id);
            await enterLabResults(id, draft, resultNote, path);
            toast.success("Results saved");
            setResultsFor(null);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(null);
        }
    };

    if (!orders || orders.length === 0) {
        return <p className="text-sm text-muted-foreground">No orders.</p>;
    }

    return (
        <div className="space-y-3">
            {orders.map((o) => {
                const pName = typeof o.patientId === "object" && o.patientId ? o.patientId.fullName : "";
                const editing = resultsFor === o._id;
                return (
                    <Card key={o._id}>
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {o.category === "radiology" ? <ScanLine className="h-4 w-4 text-teal-600" /> : <FlaskConical className="h-4 w-4 text-teal-600" />}
                                    <div>
                                        <p className="font-semibold">{o.orderNumber} <span className="text-xs font-normal text-muted-foreground">· {pName}</span></p>
                                        <p className="text-xs text-muted-foreground">{o.tests.map((t) => t.name).join(", ")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded px-2 py-0.5 text-xs uppercase ${STATUS_COLOR[o.status]}`}>{o.status}</span>
                                    {o.status === "ordered" && (
                                        <Button size="sm" variant="outline" onClick={() => advance(o._id, "collected")} disabled={busy === o._id}>
                                            {busy === o._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Collected"}
                                        </Button>
                                    )}
                                    {o.status !== "resulted" && o.status !== "cancelled" && (
                                        <Button size="sm" onClick={() => openResults(o)} disabled={busy === o._id}>
                                            <CheckCircle2 className="mr-1 h-4 w-4" /> Enter Results
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {editing && (
                                <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-4">
                                    {draft.map((t, i) => (
                                        <div key={i} className="flex flex-wrap items-end gap-2">
                                            <div className="min-w-[140px] flex-1">
                                                <label className="mb-1 block text-xs text-muted-foreground">{t.name}</label>
                                                <Input value={t.result || ""} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, result: e.target.value } : x))} placeholder="Result" />
                                            </div>
                                            <div className="w-24">
                                                <label className="mb-1 block text-xs text-muted-foreground">Unit</label>
                                                <Input value={t.unit || ""} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
                                            </div>
                                            <div className="w-28">
                                                <label className="mb-1 block text-xs text-muted-foreground">Ref. range</label>
                                                <Input value={t.referenceRange || ""} onChange={(e) => setDraft((d) => d.map((x, j) => j === i ? { ...x, referenceRange: e.target.value } : x))} />
                                            </div>
                                        </div>
                                    ))}
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Result note</label>
                                        <Input value={resultNote} onChange={(e) => setResultNote(e.target.value)} placeholder="Overall interpretation (optional)" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setResultsFor(null)}><X className="mr-1 h-4 w-4" /> Cancel</Button>
                                        <Button size="sm" onClick={() => saveResults(o._id)} disabled={busy === o._id}>
                                            {busy === o._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                                            Save Results
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {o.status === "resulted" && !editing && (
                                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                                    {o.tests.map((t, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-muted-foreground">{t.name}</span>
                                            <span className="font-medium">{t.result || "—"} {t.unit}</span>
                                        </div>
                                    ))}
                                    {o.resultNote && <p className="text-xs text-muted-foreground">{o.resultNote}</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
