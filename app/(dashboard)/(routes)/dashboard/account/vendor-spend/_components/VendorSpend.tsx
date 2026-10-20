"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Building2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import { vendorSpendReport as fetchVendorSpend } from "@/lib/actions/accounting/vendor.actions";

interface VendorSpendRow {
    vendorId: string;
    vendorName: string;
    total: number;
}

export default function VendorSpend({
    initial,
    from: initialFrom,
    to: initialTo,
    currency = "",
}: {
    initial: VendorSpendRow[];
    from: string;
    to: string;
    currency?: string;
}) {
    const money = (n: number) => formatMoney(n, currency);

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [data, setData] = useState<VendorSpendRow[]>(initial || []);
    const [isPending, startTransition] = useTransition();

    const refresh = () => {
        startTransition(async () => {
            try {
                setData(await fetchVendorSpend({ from, to }));
            } catch {
                // keep existing
            }
        });
    };

    const total = (data || []).reduce((sum, r) => sum + (r.total || 0), 0);

    return (
        <div className="space-y-6">
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
                    {!data || data.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                            <Building2 className="h-8 w-8" />
                            <p className="text-sm">
                                No vendor-attributed posted spend in this period.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead className="text-right">Total Spend</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((r) => (
                                    <TableRow key={r.vendorId}>
                                        <TableCell className="font-medium">{r.vendorName}</TableCell>
                                        <TableCell className="text-right font-mono">{money(r.total)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="border-t-2 font-semibold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right font-mono">{money(total)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
