"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, TrendingDown, RefreshCw, FileDown } from "lucide-react";
import { getIncomeStatement } from "@/lib/actions/accounting-reports.actions";
import { cn, formatMoney } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Line { category: string; amount: number; }
interface Statement {
    revenue: Line[];
    expenses: Line[];
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    margin: number;
}

export function IncomeStatement({ initial, currency = "" }: { initial: Statement; currency?: string }) {
    const money = (n: number) => formatMoney(n, currency);
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const [from, setFrom] = useState(yearStart);
    const [to, setTo] = useState(today);
    const [data, setData] = useState<Statement>(initial);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(await getIncomeStatement(from, to));
            } catch {
                // keep existing
            }
        });
    };

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("SidGrace Dental", 14, 20);
        doc.setFontSize(13);
        doc.text("Income Statement", 14, 29);
        doc.setFontSize(10);
        doc.text(`Period: ${from} to ${to}`, 14, 36);

        autoTable(doc, {
            startY: 44,
            head: [["Revenue", "Amount"]],
            body: [
                ...data.revenue.map((r) => [r.category, money(r.amount)]),
                ["Total Revenue", money(data.totalRevenue)],
            ],
            foot: [],
            headStyles: { fillColor: [20, 184, 166] },
        });

        // @ts-expect-error lastAutoTable added by plugin at runtime
        let y = (doc.lastAutoTable?.finalY || 60) + 8;
        autoTable(doc, {
            startY: y,
            head: [["Expenses", "Amount"]],
            body: [
                ...data.expenses.map((e) => [e.category, `(${money(e.amount)})`]),
                ["Total Expenses", `(${money(data.totalExpenses)})`],
            ],
            headStyles: { fillColor: [239, 68, 68] },
        });

        // @ts-expect-error lastAutoTable added by plugin at runtime
        y = (doc.lastAutoTable?.finalY || 100) + 12;
        doc.setFontSize(13);
        doc.text(`Net Profit: ${money(data.netProfit)}   (${data.margin}% margin)`, 14, y);

        doc.save(`income-statement_${from}_to_${to}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Range controls */}
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">From</label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">To</label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
                </div>
                <Button onClick={refresh} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Apply
                </Button>
                <Button variant="outline" onClick={exportPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </div>

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-emerald-600"><TrendingUp className="h-4 w-4" /><span className="text-sm font-medium">Total Revenue</span></div>
                        <p className="mt-2 text-2xl font-bold">{money(data.totalRevenue)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-600"><TrendingDown className="h-4 w-4" /><span className="text-sm font-medium">Total Expenses</span></div>
                        <p className="mt-2 text-2xl font-bold">{money(data.totalExpenses)}</p>
                    </CardContent>
                </Card>
                <Card className={cn(data.netProfit >= 0 ? "border-emerald-200" : "border-red-200")}>
                    <CardContent className="pt-6">
                        <span className="text-sm font-medium text-muted-foreground">Net Profit</span>
                        <p className={cn("mt-2 text-2xl font-bold", data.netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>{money(data.netProfit)}</p>
                        <p className="text-xs text-muted-foreground">{data.margin}% margin</p>
                    </CardContent>
                </Card>
            </div>

            {/* P&L breakdown */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Profit &amp; Loss</h3>

                    <div className="space-y-1">
                        <p className="border-b pb-1 text-sm font-semibold text-emerald-700">Revenue</p>
                        {data.revenue.length === 0 && <p className="py-2 text-sm text-muted-foreground">No revenue in this period.</p>}
                        {data.revenue.map((r) => (
                            <div key={r.category} className="flex justify-between py-1.5 text-sm">
                                <span className="text-muted-foreground">{r.category}</span>
                                <span className="font-medium">{money(r.amount)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t py-1.5 text-sm font-semibold">
                            <span>Total Revenue</span><span>{money(data.totalRevenue)}</span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-1">
                        <p className="border-b pb-1 text-sm font-semibold text-red-700">Expenses</p>
                        {data.expenses.length === 0 && <p className="py-2 text-sm text-muted-foreground">No expenses in this period.</p>}
                        {data.expenses.map((e) => (
                            <div key={e.category} className="flex justify-between py-1.5 text-sm">
                                <span className="text-muted-foreground">{e.category}</span>
                                <span className="font-medium">({money(e.amount)})</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t py-1.5 text-sm font-semibold">
                            <span>Total Expenses</span><span>({money(data.totalExpenses)})</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between rounded-lg bg-muted/50 px-4 py-3 text-base font-bold">
                        <span>Net Profit</span>
                        <span className={data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}>{money(data.netProfit)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
