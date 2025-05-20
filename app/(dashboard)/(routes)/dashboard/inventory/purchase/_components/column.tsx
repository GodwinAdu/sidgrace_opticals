"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";
import { format } from "date-fns";

export const columns: ColumnDef<IInventoryPurchase>[] = [
    {
        accessorKey: "storeId",
        header: "Store Name",
        cell: ({ row }) => (
            <div>{row.original?.storeId?.name}</div>
        )
    },
    {
        accessorKey: "supplierId",
        header: "Supplier Name",
        cell: ({ row }) => (
            <div>{row.original?.supplierId?.name}</div>
        )
    },
    {
        accessorKey: "status",
        header: "Status",
    },
    {
        accessorKey: "purchaseDate",
        header: "Purchase Date",
        cell: ({ row }) => (
            <div>{format(row.getValue("purchaseDate"),"PPP")}</div>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
