"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, RefreshCw } from "lucide-react";

export type Basis = "accrual" | "cash";

/**
 * Shared period (from/to) + basis (accrual/cash) controls for the financial
 * statements. Pure presentational: the parent owns the state and the apply
 * handler so each statement can refresh its own server action.
 */
export function StatementControls({
    from,
    to,
    basis,
    onFromChange,
    onToChange,
    onBasisChange,
    onApply,
    isPending,
    children,
}: {
    from: string;
    to: string;
    basis: Basis;
    onFromChange: (v: string) => void;
    onToChange: (v: string) => void;
    onBasisChange: (v: Basis) => void;
    onApply: () => void;
    isPending?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <div>
                <label className="mb-1 block text-xs text-muted-foreground">From</label>
                <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="w-44" />
            </div>
            <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="w-44" />
            </div>
            <div>
                <label className="mb-1 block text-xs text-muted-foreground">Basis</label>
                <ToggleGroup
                    type="single"
                    variant="outline"
                    value={basis}
                    onValueChange={(v) => {
                        if (v === "accrual" || v === "cash") onBasisChange(v);
                    }}
                >
                    <ToggleGroupItem value="accrual" className="px-4">Accrual</ToggleGroupItem>
                    <ToggleGroupItem value="cash" className="px-4">Cash</ToggleGroupItem>
                </ToggleGroup>
            </div>
            <Button onClick={onApply} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Apply
            </Button>
            {children}
        </div>
    );
}
