"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Row {
    id: string;
    account: string;
    balance: number;
    debit: number;
    credit: number;
}

interface TrialBalanceData {
    rows: Row[];
    totalDebit: number;
    totalCredit: number;
}

export default function TrialBalance({ data, currency = "" }: { data: TrialBalanceData; currency?: string }) {
    const { rows, totalDebit, totalCredit } = data;
    const money = (n: number) => formatMoney(n, currency);

    return (
        <Card>
            <CardContent className="pt-6">
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No accounts or transactions yet. Record payments or expenses to populate the trial balance.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.account}</TableCell>
                                    <TableCell className="text-right font-mono">{money(r.balance)}</TableCell>
                                    <TableCell className="text-right font-mono">{r.debit ? money(r.debit) : "—"}</TableCell>
                                    <TableCell className="text-right font-mono">{r.credit ? money(r.credit) : "—"}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="border-t-2 font-semibold">
                                <TableCell>Totals</TableCell>
                                <TableCell />
                                <TableCell className="text-right font-mono">{money(totalDebit)}</TableCell>
                                <TableCell className="text-right font-mono">{money(totalCredit)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
