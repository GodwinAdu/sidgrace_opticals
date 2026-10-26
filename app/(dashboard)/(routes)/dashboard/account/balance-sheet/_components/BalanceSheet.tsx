"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { balanceSheet as fetchBalanceSheet } from "@/lib/actions/accounting/reports.actions";
import { StatementControls, type Basis } from "../../_components/StatementControls";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface BalanceSheetData {
    assets: number;
    liabilities: number;
    equity: number;
    retainedEarnings: number;
    balanced: boolean;
}

export default function BalanceSheet({
    initial,
    from: initialFrom,
    to: initialTo,
    currency = "",
}: {
    initial: BalanceSheetData;
    from: string;
    to: string;
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [basis, setBasis] = useState<Basis>("accrual");
    const [data, setData] = useState<BalanceSheetData>(initial);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(await fetchBalanceSheet({ from, to }, basis));
            } catch {
                // keep existing
            }
        });
    };

    const { assets, liabilities, equity, retainedEarnings, balanced } = data;
    const bookedEquity = equity - retainedEarnings;
    const totalLiabEquity = liabilities + equity;

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Balance Sheet", 14, 20);
        doc.setFontSize(10);
        doc.text(`As of ${to}  (${basis})`, 14, 28);

        autoTable(doc, {
            startY: 36,
            head: [["", "Amount"]],
            body: [
                ["Total Assets", money(assets)],
                ["Total Liabilities", money(liabilities)],
                ["Retained Earnings", money(retainedEarnings)],
                ["Total Equity", money(equity)],
                ["Liabilities + Equity", money(totalLiabEquity)],
            ],
            headStyles: { fillColor: [16, 185, 129] },
        });

        doc.save(`balance-sheet_${to}.pdf`);
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
                <Badge variant={balanced ? "default" : "destructive"} className="mb-1">
                    {balanced ? "Balanced" : "Out of balance"}
                </Badge>
                <Button variant="outline" onClick={exportPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </StatementControls>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Assets */}
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Assets</h3>
                        <div className="flex justify-between rounded-lg bg-muted/50 px-4 py-3 font-bold">
                            <span>Total Assets</span>
                            <span className="font-mono">{money(assets)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Liabilities + Equity */}
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wide text-red-700">Liabilities</h3>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Liabilities</span>
                            <span className="font-mono">{money(liabilities)}</span>
                        </div>

                        <h3 className="mb-4 mt-6 border-b pb-2 text-sm font-semibold uppercase tracking-wide text-teal-700">Equity</h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Booked Equity</span>
                                <span className="font-mono">{money(bookedEquity)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Retained Earnings</span>
                                <span className="font-mono">{money(retainedEarnings)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-semibold">
                                <span>Total Equity</span>
                                <span className="font-mono">{money(equity)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between rounded-lg bg-muted/50 px-4 py-3 font-bold">
                            <span>Liabilities + Equity</span>
                            <span className="font-mono">{money(totalLiabEquity)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
