"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatMoney } from "@/lib/utils";
import { budgetVsActual as fetchBudgetVsActual } from "@/lib/actions/accounting/budget.actions";
import type { Basis } from "../../_components/StatementControls";

interface BvaRow {
    accountId: string;
    code: string;
    name: string;
    budget: number;
    actual: number;
    variance: number;
    variancePct: number;
}

export interface BudgetVsActualData {
    fiscalYear: number;
    periodNo?: number | null;
    rows: BvaRow[];
}

const WHOLE_YEAR = "__year__";

const PERIOD_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function BudgetVsActual({
    initial,
    fiscalYear: initialYear,
    currency = "",
}: {
    initial: BudgetVsActualData;
    fiscalYear: number;
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);

    const [fiscalYear, setFiscalYear] = useState(initialYear);
    const [periodNo, setPeriodNo] = useState<string>(WHOLE_YEAR);
    const [basis, setBasis] = useState<Basis>("accrual");
    const [data, setData] = useState<BudgetVsActualData>(initial);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(
                    await fetchBudgetVsActual(
                        Number(fiscalYear),
                        periodNo === WHOLE_YEAR ? null : Number(periodNo),
                        basis,
                    ),
                );
            } catch {
                // keep existing
            }
        });
    };

    const rows = data?.rows || [];
    const totals = rows.reduce(
        (acc, r) => {
            acc.budget += r.budget;
            acc.actual += r.actual;
            acc.variance += r.variance;
            return acc;
        },
        { budget: 0, actual: 0, variance: 0 },
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Fiscal year</label>
                    <Input
                        type="number"
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(Number(e.target.value))}
                        className="w-32"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Period</label>
                    <Select value={periodNo} onValueChange={setPeriodNo}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Whole year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={WHOLE_YEAR}>Whole year</SelectItem>
                            {PERIOD_LABELS.map((label, idx) => (
                                <SelectItem key={label} value={String(idx + 1)}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Basis</label>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={basis}
                        onValueChange={(v) => {
                            if (v === "accrual" || v === "cash") setBasis(v);
                        }}
                    >
                        <ToggleGroupItem value="accrual" className="px-4">Accrual</ToggleGroupItem>
                        <ToggleGroupItem value="cash" className="px-4">Cash</ToggleGroupItem>
                    </ToggleGroup>
                </div>
                <Button onClick={refresh} disabled={isPending}>
                    {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Apply
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No budgets or posted activity for this period. Add budgets and post entries to populate the comparison.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Budget</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                    <TableHead className="text-right">Variance %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => {
                                    const over = r.variance < 0;
                                    return (
                                        <TableRow key={r.accountId}>
                                            <TableCell className="font-mono text-xs">{r.code || "—"}</TableCell>
                                            <TableCell className="font-medium">{r.name || "—"}</TableCell>
                                            <TableCell className="text-right font-mono">{money(r.budget)}</TableCell>
                                            <TableCell className="text-right font-mono">{money(r.actual)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={over ? "text-red-600" : "text-emerald-600"}>
                                                    {money(r.variance)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={over ? "destructive" : "secondary"}>
                                                    {r.variancePct.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow className="border-t-2 font-semibold">
                                    <TableCell colSpan={2}>Totals</TableCell>
                                    <TableCell className="text-right font-mono">{money(totals.budget)}</TableCell>
                                    <TableCell className="text-right font-mono">{money(totals.actual)}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        <span className={totals.variance < 0 ? "text-red-600" : "text-emerald-600"}>
                                            {money(totals.variance)}
                                        </span>
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
