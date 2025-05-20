"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";


export const columns: ColumnDef<IRole>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "displayName",
    header: "Display Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  },
];
