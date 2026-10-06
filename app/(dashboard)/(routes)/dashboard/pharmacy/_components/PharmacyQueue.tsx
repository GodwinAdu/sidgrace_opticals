"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill, ArrowUpRight, User2 } from "lucide-react";

interface Rx {
    _id: string;
    status: string;
    createdAt?: string;
    appointmentId?: string | null;
    patientId?: { fullName?: string; patientId?: string } | null;
    prescribedBy?: { fullName?: string } | null;
    items?: { drugName?: string; productId?: string | null; quantity?: number }[];
}

const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    "partially-dispensed": "bg-blue-100 text-blue-700",
};

export function PharmacyQueue({ prescriptions }: { prescriptions: Rx[] }) {
    if (!prescriptions || prescriptions.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    <Pill className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    No prescriptions awaiting dispensing.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {prescriptions.map((rx) => {
                const dispensable = (rx.items || []).filter((i) => i.productId).length;
                return (
                    <Card key={rx._id}>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"><User2 className="h-5 w-5" /></span>
                                <div>
                                    <p className="font-semibold">{rx.patientId?.fullName || "Patient"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {rx.patientId?.patientId ? `${rx.patientId.patientId} • ` : ""}
                                        {rx.createdAt ? new Date(rx.createdAt).toLocaleString() : ""}
                                        {rx.prescribedBy?.fullName ? ` • ${rx.prescribedBy.fullName}` : ""}
                                    </p>
                                    <p className="mt-1 text-sm">
                                        {(rx.items || []).map((i) => i.drugName).filter(Boolean).join(", ")}
                                        <span className="text-muted-foreground"> ({dispensable} dispensable)</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className={STATUS_COLOR[rx.status] || ""}>{rx.status}</Badge>
                                <Link href={`/dashboard/pharmacy/${rx._id}`} className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
                                    Dispense <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
