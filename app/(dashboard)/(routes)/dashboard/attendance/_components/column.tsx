"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

const StatusBadge = ({ status }: { status: boolean }) => {
    switch (status) {
        case true:
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
        case false:
            return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
        default:
            return <Badge>{status}</Badge>
    }
}
export const columns: ColumnDef<IRole>[] = [
    {
        accessorKey: "patient",
        header: "Patient Name",
    },
    {
        accessorKey: "visitDate",
        header: "Visit Date",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue() as boolean} />
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />
    },
];
