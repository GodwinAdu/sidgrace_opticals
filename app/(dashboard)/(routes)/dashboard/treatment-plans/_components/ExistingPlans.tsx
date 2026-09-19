"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { updateTreatmentPlan, deleteTreatmentPlan } from "@/lib/actions/treatment-plan.actions";

interface PlanItem {
    procedureName: string;
    tooth?: number | null;
    phase: number;
    cost: number;
    status: string;
}
interface Plan {
    _id: string;
    title: string;
    items: PlanItem[];
    totalCost: number;
    status: string;
    acceptedByPatient: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    proposed: "bg-slate-100 text-slate-700",
    accepted: "bg-blue-100 text-blue-700",
    "in-progress": "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

export function ExistingPlans({ plans }: { plans: Plan[] }) {
    const router = useRouter();
    const path = usePathname();
    const [busyId, setBusyId] = useState<string | null>(null);

    if (!plans || plans.length === 0) {
        return <p className="text-sm text-muted-foreground">No treatment plans yet. Create one above.</p>;
    }

    const accept = async (id: string) => {
        try {
            setBusyId(id);
            await updateTreatmentPlan(id, { acceptedByPatient: true, status: "accepted" }, path);
            toast.success("Plan accepted by patient");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteTreatmentPlan(id);
            toast.success("Plan moved to trash");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            {plans.map((plan) => (
                <Card key={plan._id}>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{plan.title}</h3>
                                <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[plan.status] || ""}`}>
                                    {plan.status}
                                </span>
                                {plan.acceptedByPatient && (
                                    <Badge className="bg-green-600">Accepted</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!plan.acceptedByPatient && (
                                    <Button size="sm" variant="outline" onClick={() => accept(plan._id)} disabled={busyId === plan._id}>
                                        {busyId === plan._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                                        Mark Accepted
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(plan._id)} disabled={busyId === plan._id}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {plan.items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <span>
                                        <Badge variant="outline" className="mr-2">Phase {it.phase}</Badge>
                                        {it.procedureName} {it.tooth ? `(Tooth ${it.tooth})` : ""}
                                    </span>
                                    <span className="font-medium">{Number(it.cost).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex justify-end text-sm">
                            <span className="text-muted-foreground">Total:&nbsp;</span>
                            <span className="font-bold">{Number(plan.totalCost).toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
