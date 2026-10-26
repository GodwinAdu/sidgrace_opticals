"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ShieldPlus } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { createClaimFromInvoice } from "@/lib/actions/insurance.actions";

interface Claim {
    _id: string;
    claimNumber: string;
    amountClaimed: number;
    amountApproved: number;
    status: string;
    insurerPaid?: boolean;
    notes?: string;
}

const STATUS_COLOR: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    submitted: "bg-blue-100 text-blue-700",
    "pre-authorized": "bg-indigo-100 text-indigo-700",
    approved: "bg-green-100 text-green-700",
    "partially-approved": "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-emerald-100 text-emerald-700",
};

/**
 * Invoice-detail panel to raise an insurance claim from this invoice and to
 * show any claims already linked to it. Marking a claim approved/paid in the
 * Claims page records the insurer's payment back onto this invoice.
 */
export function InvoiceClaimPanel({
    invoiceId,
    claims,
    currency = "",
}: {
    invoiceId: string;
    claims: Claim[];
    currency?: string;
}) {
    const router = useRouter();
    const path = usePathname();
    const [creating, setCreating] = useState(false);

    const raise = async () => {
        try {
            setCreating(true);
            await createClaimFromInvoice(invoiceId, path);
            toast.success("Insurance claim raised");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Insurance Claims</h3>
                    <Button size="sm" variant="secondary" onClick={raise} disabled={creating}>
                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldPlus className="mr-2 h-4 w-4" />}
                        Raise Claim
                    </Button>
                </div>

                {(!claims || claims.length === 0) ? (
                    <p className="text-sm text-muted-foreground">
                        No claims for this invoice. Raise one to bill the patient&#39;s insurer for their
                        share — the claimed amount is pre-filled from the policy&#39;s coverage percent.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {claims.map((c) => (
                            <div key={c._id} className="rounded border px-3 py-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{c.claimNumber}</span>
                                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[c.status] || ""}`}>{c.status}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                                    <span>Claimed: {formatMoney(Number(c.amountClaimed) || 0, currency)}</span>
                                    <span>Approved: {formatMoney(Number(c.amountApproved) || 0, currency)}</span>
                                    {c.insurerPaid && <span className="text-emerald-600">Posted to invoice</span>}
                                </div>
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                            Approving or paying a claim on the Claims page records the insurer&#39;s payment
                            against this invoice automatically.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
