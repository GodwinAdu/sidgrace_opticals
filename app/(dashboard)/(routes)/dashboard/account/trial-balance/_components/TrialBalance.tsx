"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { trialBalance as fetchTrialBalance } from "@/lib/actions/accounting/reports.actions";
import { StatementControls, type Basis } from "../../_components/StatementControls";

interface TrialBalanceAccount {
    code: string;
    name: string;
    debit: number;
    credit: number;
}

export interface TrialBalanceData {
    accounts: TrialBalanceAccount[];
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
}

export default function TrialBalance({
    initial,
    from: initialFrom,
    to: initialTo,
    currency = "",
}: {
    initial: TrialBalanceData;
    from: string;
    to: string;
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [basis, setBasis] = useState<Basis>("accrual");
    const [data, setData] = useState<TrialBalanceData>(initial);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(await fetchTrialBalance({ from, to }, basis));
            } catch {
                // keep existing
            }
        });
    };

    const { accounts, totalDebit, totalCredit, balanced } = data;

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
            </StatementControls>

            <Card>
                <CardContent className="pt-6">
                    {accounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No posted journal activity in this period. Post journal entries to populate the trial balance.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((a) => (
                                    <TableRow key={a.code}>
                                        <TableCell className="font-mono text-xs">{a.code}</TableCell>
                                        <TableCell className="font-medium">{a.name}</TableCell>
                                        <TableCell className="text-right font-mono">{a.debit ? money(a.debit) : "—"}</TableCell>
                                        <TableCell className="text-right font-mono">{a.credit ? money(a.credit) : "—"}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="border-t-2 font-semibold">
                                    <TableCell colSpan={2}>Totals</TableCell>
                                    <TableCell className="text-right font-mono">{money(totalDebit)}</TableCell>
                                    <TableCell className="text-right font-mono">{money(totalCredit)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
