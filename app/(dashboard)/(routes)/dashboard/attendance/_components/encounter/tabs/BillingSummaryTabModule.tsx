"use client";

/**
 * Read-only Billing summary tab. Reuses the monolith's summary card layout,
 * driven by the pure `rollUpBilling` roll-up (Task 1). Placeholder adapter;
 * Task 8 verifies optimistic/reconciled billing from Visit Procedures and
 * Dental Plan flows through here. All money management lives on the Billing
 * page / invoice detail — this tab is a read-only snapshot with an
 * "Open invoice" link.
 */
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { rollUpBilling, type BillingSlice } from "@/lib/clinical/encounter";
import type { EncounterTabProps } from "./types";

interface Billing extends BillingSlice {
    invoiceId?: string | null;
    invoiceNumber?: string;
}

export default function BillingSummaryTabModule({ attendance }: EncounterTabProps) {
    const billing = (attendance?.billing as Billing | undefined) || {};
    const roll = rollUpBilling(billing);

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Visit Billing Summary
                    </h3>
                    {billing.invoiceId ? (
                        <Link
                            href={`/dashboard/billing/invoices/${billing.invoiceId}`}
                            className="text-sm font-medium text-teal-700 hover:underline"
                        >
                            Open invoice{billing.invoiceNumber ? ` ${billing.invoiceNumber}` : ""} →
                        </Link>
                    ) : (
                        <span className="text-xs text-muted-foreground">No invoice yet</span>
                    )}
                </div>
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Consultation</span>
                        <span>{formatMoney(roll.consultationFee)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Procedures</span>
                        <span>{formatMoney(roll.proceduresTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Products / Drugs</span>
                        <span>{formatMoney(roll.productsTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Other charges</span>
                        <span>{formatMoney(roll.otherChargesTotal)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 font-semibold">
                        <span>Total charged</span>
                        <span>{formatMoney(roll.totalCharged)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                        <span>Paid</span>
                        <span>{formatMoney(roll.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 font-bold">
                        <span>Balance</span>
                        <span className={roll.balance > 0 ? "text-red-600" : "text-green-600"}>
                            {formatMoney(roll.balance)}
                        </span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    This is a read-only summary. Payments, custom charges and settling previous
                    outstanding are handled on the Billing page by accounts.
                </p>
            </CardContent>
        </Card>
    );
}
