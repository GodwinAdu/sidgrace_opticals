"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<IProcedure>[] = [
    {
        accessorKey: "code",
        header: "Code",
    },
    {
        accessorKey: "name",
        header: "Procedure",
    },
    {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <Badge variant="secondary">{row.original.category}</Badge>,
    },
    {
        accessorKey: "defaultDuration",
        header: "Duration",
        cell: ({ row }) => <span>{row.original.defaultDuration} min</span>,
    },
    {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => <span>{Number(row.original.price).toFixed(2)}</span>,
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
