"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn, formatMoney } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { getLedger } from "@/lib/actions/accounting/ledger.actions";

type AccountOption = { _id: string; code: string; name: string; type: string };

type LedgerLine = {
    entryId: string;
    entryNo: string;
    date: string;
    memo: string;
    debit: number;
    credit: number;
    signedAmount: number;
    balance: number;
};

type LedgerResult = {
    account: { _id: string; code: string; name: string; type: string; normalBalance: "debit" | "credit" };
    openingBalance: number;
    closingBalance: number;
    lines: LedgerLine[];
    from: string | null;
    to: string | null;
};

export function GeneralLedger({
    accounts,
    currency = "",
}: {
    accounts: AccountOption[];
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);
    const [isPending, startTransition] = useTransition();

    const [accountId, setAccountId] = useState<string>(accounts[0] ? String(accounts[0]._id) : "");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [data, setData] = useState<LedgerResult | null>(null);

    function run() {
        if (!accountId) {
            toast.error("Pick an account first");
            return;
        }
        startTransition(async () => {
            try {
                const res = await getLedger(accountId, from || undefined, to || undefined);
                setData(res);
            } catch (error) {
                toast.error("Could not load ledger", {
                    description: error instanceof Error ? error.message : "Please try again.",
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[260px]">
                    <label className="mb-1 block text-xs text-muted-foreground">Account</label>
                    <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map((a) => (
                                <SelectItem key={a._id} value={String(a._id)}>
                                    {a.code} - {a.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">From</label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">To</label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
                </div>
                <Button onClick={run} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    View ledger
                </Button>
            </div>

            {data && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="font-medium">
                                    <span className="font-mono text-xs">{data.account.code}</span> {data.account.name}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                    {data.account.type} - {data.account.normalBalance}-normal
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Opening</div>
                                    <div className="font-mono">{money(data.openingBalance)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Closing</div>
                                    <div className="font-mono font-semibold">{money(data.closingBalance)}</div>
                                </div>
                            </div>
                        </div>

                        {data.lines.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No posted activity for this account in the selected range.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Entry No</TableHead>
                                        <TableHead>Memo</TableHead>
                                        <TableHead className="text-right">Debit</TableHead>
                                        <TableHead className="text-right">Credit</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="text-muted-foreground">
                                        <TableCell colSpan={5} className="italic">Opening balance</TableCell>
                                        <TableCell className="text-right font-mono">{money(data.openingBalance)}</TableCell>
                                    </TableRow>
                                    {data.lines.map((l) => (
                                        <TableRow key={l.entryId + l.date + l.balance}>
                                            <TableCell>{new Date(l.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-mono text-xs">{l.entryNo}</TableCell>
                                            <TableCell className="max-w-[260px] truncate">{l.memo || "-"}</TableCell>
                                            <TableCell className="text-right font-mono">{l.debit ? money(l.debit) : "-"}</TableCell>
                                            <TableCell className="text-right font-mono">{l.credit ? money(l.credit) : "-"}</TableCell>
                                            <TableCell className="text-right font-mono">{money(l.balance)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="border-t-2 font-semibold">
                                        <TableCell colSpan={5}>Closing balance</TableCell>
                                        <TableCell className="text-right font-mono">{money(data.closingBalance)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {!data && (
                <p className="text-sm text-muted-foreground">
                    Pick an account and an optional date range, then choose <span className="font-medium">View ledger</span>.
                </p>
            )}
        </div>
    );
}