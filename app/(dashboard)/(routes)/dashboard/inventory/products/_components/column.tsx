"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";

export const columns: ColumnDef<IInventoryProduct>[] = [
    {
        accessorKey: "name",
        header: "Product Name",
    },
    {
        accessorKey: "purchasePrice",
        header: "Purchase Price",
    },
    {
        accessorKey: "salePrice",
        header: "Sales Price",
    },
    {
        accessorKey: "quantity",
        header: "Available Product",
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
