"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { cashFlow as fetchCashFlow } from "@/lib/actions/accounting/reports.actions";
import { StatementControls, type Basis } from "../../_components/StatementControls";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CashFlowData {
    operating: number;
    investing: number;
    financing: number;
    netChange: number;
}

export default function CashFlow({
    initial,
    from: initialFrom,
    to: initialTo,
    currency = "",
}: {
    initial: CashFlowData;
    from: string;
    to: string;
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [basis, setBasis] = useState<Basis>("accrual");
    const [data, setData] = useState<CashFlowData>(initial);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(await fetchCashFlow({ from, to }, basis));
            } catch {
                // keep existing
            }
        });
    };

    const { operating, investing, financing, netChange } = data;

    const rows: { label: string; value: number }[] = [
        { label: "Operating Activities", value: operating },
        { label: "Investing Activities", value: investing },
        { label: "Financing Activities", value: financing },
    ];

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Cash Flow Statement", 14, 20);
        doc.setFontSize(10);
        doc.text(`Period: ${from} to ${to}  (${basis})`, 14, 28);

        autoTable(doc, {
            startY: 36,
            head: [["Activity", "Net Cash"]],
            body: [
                ...rows.map((r) => [r.label, money(r.value)]),
                ["Net Change in Cash", money(netChange)],
            ],
            headStyles: { fillColor: [20, 184, 166] },
        });

        doc.save(`cash-flow_${from}_to_${to}.pdf`);
    };

    return (
        <div className="space-y-6">
            <StatementControls
                from={from}
                to={to}
                basis={basis}
                onFromChange={setFrom}
                onToChange={setTo}
                onBasisChange={setBasis}
                onApply={refresh}
                isPending={isPending}
            >
                <Button variant="outline" onClick={exportPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </StatementControls>

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
                {rows.map((r) => (
                    <Card key={r.label}>
                        <CardContent className="pt-6">
                            <span className="text-sm font-medium text-muted-foreground">{r.label}</span>
                            <p className={cn("mt-2 text-2xl font-bold", r.value >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {money(r.value)}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Breakdown */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cash Flow</h3>
                    <div className="space-y-1.5 text-sm">
                        {rows.map((r) => (
                            <div key={r.label} className="flex justify-between py-1.5">
                                <span className="text-muted-foreground">{r.label}</span>
                                <span className={cn("font-mono", r.value < 0 && "text-red-600")}>{money(r.value)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between rounded-lg bg-muted/50 px-4 py-3 text-base font-bold">
                        <span>Net Change in Cash</span>
                        <span className={cn("font-mono", netChange >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {money(netChange)}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
