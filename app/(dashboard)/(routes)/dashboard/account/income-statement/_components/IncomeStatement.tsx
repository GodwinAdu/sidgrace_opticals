"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { incomeStatement as fetchIncomeStatement } from "@/lib/actions/accounting/reports.actions";
import { cn, formatMoney } from "@/lib/utils";
import { StatementControls, type Basis } from "../../_components/StatementControls";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface IncomeStatementData {
    revenue: number;
    expenses: number;
    netIncome: number;
    groups: {
        revenue: Record<string, number>;
        expenses: Record<string, number>;
    };
}

function toEntries(group: Record<string, number>): { category: string; amount: number }[] {
    return Object.entries(group || {})
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
}

export function IncomeStatement({
    initial,
    from: initialFrom,
    to: initialTo,
    currency = "",
}: {
    initial: IncomeStatementData;
    from: string;
    to: string;
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [basis, setBasis] = useState<Basis>("accrual");
    const [data, setData] = useState<IncomeStatementData>(initial);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(await fetchIncomeStatement({ from, to }, basis));
            } catch {
                // keep existing
            }
        });
    };

    const revenueRows = toEntries(data.groups?.revenue);
    const expenseRows = toEntries(data.groups?.expenses);
    const margin = data.revenue > 0 ? Math.round((data.netIncome / data.revenue) * 1000) / 10 : 0;

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Income Statement", 14, 20);
        doc.setFontSize(10);
        doc.text(`Period: ${from} to ${to}  (${basis})`, 14, 28);

        autoTable(doc, {
            startY: 36,
            head: [["Revenue", "Amount"]],
            body: [
                ...revenueRows.map((r) => [r.category, money(r.amount)]),
                ["Total Revenue", money(data.revenue)],
            ],
            headStyles: { fillColor: [20, 184, 166] },
        });

        // @ts-expect-error lastAutoTable added by plugin at runtime
        let y = (doc.lastAutoTable?.finalY || 60) + 8;
        autoTable(doc, {
            startY: y,
            head: [["Expenses", "Amount"]],
            body: [
                ...expenseRows.map((e) => [e.category, `(${money(e.amount)})`]),
                ["Total Expenses", `(${money(data.expenses)})`],
            ],
            headStyles: { fillColor: [239, 68, 68] },
        });

        // @ts-expect-error lastAutoTable added by plugin at runtime
        y = (doc.lastAutoTable?.finalY || 100) + 12;
        doc.setFontSize(13);
        doc.text(`Net Income: ${money(data.netIncome)}   (${margin}% margin)`, 14, y);

        doc.save(`income-statement_${from}_to_${to}.pdf`);
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
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-emerald-600"><TrendingUp className="h-4 w-4" /><span className="text-sm font-medium">Total Revenue</span></div>
                        <p className="mt-2 text-2xl font-bold">{money(data.revenue)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-600"><TrendingDown className="h-4 w-4" /><span className="text-sm font-medium">Total Expenses</span></div>
                        <p className="mt-2 text-2xl font-bold">{money(data.expenses)}</p>
                    </CardContent>
                </Card>
                <Card className={cn(data.netIncome >= 0 ? "border-emerald-200" : "border-red-200")}>
                    <CardContent className="pt-6">
                        <span className="text-sm font-medium text-muted-foreground">Net Income</span>
                        <p className={cn("mt-2 text-2xl font-bold", data.netIncome >= 0 ? "text-emerald-600" : "text-red-600")}>{money(data.netIncome)}</p>
                        <p className="text-xs text-muted-foreground">{margin}% margin</p>
                    </CardContent>
                </Card>
            </div>

            {/* P&L breakdown */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Profit &amp; Loss</h3>

                    <div className="space-y-1">
                        <p className="border-b pb-1 text-sm font-semibold text-emerald-700">Revenue</p>
                        {revenueRows.length === 0 && <p className="py-2 text-sm text-muted-foreground">No revenue in this period.</p>}
                        {revenueRows.map((r) => (
                            <div key={r.category} className="flex justify-between py-1.5 text-sm">
                                <span className="text-muted-foreground">{r.category}</span>
                                <span className="font-medium">{money(r.amount)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t py-1.5 text-sm font-semibold">
                            <span>Total Revenue</span><span>{money(data.revenue)}</span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-1">
                        <p className="border-b pb-1 text-sm font-semibold text-red-700">Expenses</p>
                        {expenseRows.length === 0 && <p className="py-2 text-sm text-muted-foreground">No expenses in this period.</p>}
                        {expenseRows.map((e) => (
                            <div key={e.category} className="flex justify-between py-1.5 text-sm">
                                <span className="text-muted-foreground">{e.category}</span>
                                <span className="font-medium">({money(e.amount)})</span>
                            </div>
                        ))}
                        <div className="flex justify-between border-t py-1.5 text-sm font-semibold">
                            <span>Total Expenses</span><span>({money(data.expenses)})</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between rounded-lg bg-muted/50 px-4 py-3 text-base font-bold">
                        <span>Net Income</span>
                        <span className={data.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}>{money(data.netIncome)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
