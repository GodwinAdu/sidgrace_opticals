"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BalanceSheetData {
    assets: {
        accounts: { name: string; value: number }[];
        cashAndBank: number;
        receivable: number;
        total: number;
    };
    liabilities: { total: number; items: { name: string; value: number }[] };
    equity: { retainedEarnings: number; total: number };
}

export default function BalanceSheet({ data, currency = "" }: { data: BalanceSheetData; currency?: string }) {
    const { assets, liabilities, equity } = data;
    const money = (n: number) => formatMoney(n, currency);
    const totalLiabEquity = liabilities.total + equity.total;

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Medira", 14, 20);
        doc.setFontSize(13);
        doc.text("Balance Sheet", 14, 29);
        doc.setFontSize(10);
        doc.text(`As of ${new Date().toLocaleDateString()}`, 14, 36);

        autoTable(doc, {
            startY: 44,
            head: [["Assets", "Amount"]],
            body: [
                ...assets.accounts.map((a) => [a.name, money(a.value)]),
                ["Accounts Receivable", money(assets.receivable)],
                ["Total Assets", money(assets.total)],
            ],
            headStyles: { fillColor: [16, 185, 129] },
        });

        // @ts-expect-error lastAutoTable added by plugin at runtime
        let y = (doc.lastAutoTable?.finalY || 60) + 8;
        autoTable(doc, {
            startY: y,
            head: [["Liabilities", "Amount"]],
            body: [
                ...(liabilities.items.length ? liabilities.items.map((l) => [l.name, money(l.value)]) : [["None", money(0)]]),
                ["Total Liabilities", money(liabilities.total)],
            ],
            headStyles: { fillColor: [239, 68, 68] },
        });

        // @ts-expect-error lastAutoTable added by plugin at runtime
        y = (doc.lastAutoTable?.finalY || 90) + 8;
        autoTable(doc, {
            startY: y,
            head: [["Equity", "Amount"]],
            body: [
                ["Retained Earnings", money(equity.retainedEarnings)],
                ["Total Equity", money(equity.total)],
                ["Liabilities + Equity", money(totalLiabEquity)],
            ],
            headStyles: { fillColor: [20, 184, 166] },
        });

        doc.save(`balance-sheet_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" onClick={exportPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
            {/* Assets */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Assets</h3>
                    <div className="space-y-1.5 text-sm">
                        {assets.accounts.map((a) => (
                            <div key={a.name} className="flex justify-between">
                                <span className="text-muted-foreground">{a.name}</span>
                                <span className="font-mono">{money(a.value)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Accounts Receivable</span>
                            <span className="font-mono">{money(assets.receivable)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                            <span>Total Assets</span>
                            <span className="font-mono">{money(assets.total)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Liabilities + Equity */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wide text-red-700">Liabilities</h3>
                    <div className="space-y-1.5 text-sm">
                        {liabilities.items.length === 0 && (
                            <p className="text-muted-foreground">No liabilities recorded.</p>
                        )}
                        {liabilities.items.map((l) => (
                            <div key={l.name} className="flex justify-between">
                                <span className="text-muted-foreground">{l.name}</span>
                                <span className="font-mono">{money(l.value)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t pt-2 font-semibold">
                            <span>Total Liabilities</span>
                            <span className="font-mono">{money(liabilities.total)}</span>
                        </div>
                    </div>

                    <h3 className="mb-4 mt-6 border-b pb-2 text-sm font-semibold uppercase tracking-wide text-teal-700">Equity</h3>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Retained Earnings</span>
                            <span className="font-mono">{money(equity.retainedEarnings)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-semibold">
                            <span>Total Equity</span>
                            <span className="font-mono">{money(equity.total)}</span>
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
