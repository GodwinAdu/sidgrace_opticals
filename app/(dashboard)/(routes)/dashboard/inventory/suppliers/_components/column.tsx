"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";

export const columns: ColumnDef<IInventorySupplier>[] = [
    {
        accessorKey: "name",
        header: "Supplier Name",
    },
    {
        accessorKey: "email",
        header: "Email Address",
    },
    {
        accessorKey: "companyName",
        header: "Company Name",
    },
    {
        accessorKey: "contactNumber",
        header: "Supplier Contact",
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
