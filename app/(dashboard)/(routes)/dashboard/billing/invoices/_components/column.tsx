"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

interface InvoiceRow {
    _id: string;
    invoiceNumber: string;
    patientId?: { fullName?: string; patientId?: string } | string;
    total: number;
    amountPaid: number;
    balance: number;
    status: string;
    createdAt?: string;
}

const STATUS: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-gray-200 text-gray-600",
};

export const columns: ColumnDef<InvoiceRow>[] = [
    {
        accessorKey: "invoiceNumber",
        header: "Invoice #",
    },
    {
        id: "patient",
        header: "Patient",
        cell: ({ row }) => {
            const p = row.original.patientId;
            return <span>{typeof p === "object" && p ? p.fullName || "—" : "—"}</span>;
        },
    },
    {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => <span>{Number(row.original.total).toFixed(2)}</span>,
    },
    {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => <span>{Number(row.original.balance).toFixed(2)}</span>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <span className={`rounded px-2 py-0.5 text-xs ${STATUS[row.original.status] || ""}`}>
                {row.original.status}
            </span>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />,
    },
];
