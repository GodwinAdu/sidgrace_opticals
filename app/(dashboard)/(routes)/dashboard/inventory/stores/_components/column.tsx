"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";
import { BadgeAlert, CheckSquare } from "lucide-react";

export const columns: ColumnDef<IInventoryStore>[] = [
    {
        accessorKey: "name",
        header: "Store Name",
    },
    {
        accessorKey: "address",
        header: "Store Address",
    },
    {
        accessorKey: "contactNumber",
        header: "Store Contact",
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
