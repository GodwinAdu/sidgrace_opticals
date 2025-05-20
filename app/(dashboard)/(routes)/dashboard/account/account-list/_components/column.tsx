"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";

export const columns: ColumnDef<IAccount>[] = [
    {
        accessorKey: "accountName",
        header: "Account Name",
    },
    {
        accessorKey: "balance",
        header: "Total Balance",
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
