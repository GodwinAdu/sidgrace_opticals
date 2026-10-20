"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { CellAction } from "./cell-action";

/** A row as returned by listChartAccounts (lean IChartAccount). */
export type ChartAccountRow = {
    _id: string
    code: string
    name: string
    type: "asset" | "liability" | "equity" | "revenue" | "expense"
    subtype?: string
    normalBalance?: "debit" | "credit"
    isCashAccount?: boolean
    isActive?: boolean
    isSystem?: boolean
}

const TYPE_LABEL: Record<string, string> = {
    asset: "Asset",
    liability: "Liability",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expense",
}

export const columns: ColumnDef<ChartAccountRow>[] = [
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
        accessorKey: "name",
        header: "Account Name",
        cell: ({ row }) => (
            <span className="font-medium">
                {row.original.name}
                {row.original.isSystem ? (
                    <Badge variant="secondary" className="ml-2 text-[10px]">system</Badge>
                ) : null}
            </span>
        ),
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <span>{TYPE_LABEL[row.original.type] ?? row.original.type}</span>,
    },
    {
        accessorKey: "normalBalance",
        header: "Normal Balance",
        cell: ({ row }) => (
            <span className="capitalize text-muted-foreground">{row.original.normalBalance ?? "-"}</span>
        ),
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
            <Badge variant={row.original.isActive === false ? "outline" : "default"}>
                {row.original.isActive === false ? "Inactive" : "Active"}
            </Badge>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />,
    },
];