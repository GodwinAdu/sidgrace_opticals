"use client"

import React, { useState } from "react"
import { Edit, Loader2, MoreHorizontal, Power, PowerOff } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import Link from "next/link"
import useClientRole from "@/hooks/use-client-role"
import { toast } from "sonner"
import { DeleteDialog } from "@/app/components/delete-dialog"
import {
    deleteChartAccount,
    setChartAccountActive,
} from "@/lib/actions/accounting/chart-account.actions"
import type { ChartAccountRow } from "./column"

interface CellActionProps {
    data: ChartAccountRow
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const { isLoading, role } = useClientRole()

    const canManage = role?.accountingSettings || role?.accountManagement

    const handleDelete = async (id: string) => {
        try {
            setLoading(true)
            await deleteChartAccount(id)
            router.refresh()
            toast.success("Account deleted", {
                description: "The account was removed from the chart.",
            })
        } catch (error) {
            console.error("Delete error:", error)
            toast.error("Could not delete account", {
                description:
                    error instanceof Error
                        ? error.message
                        : "System accounts and accounts with ledger activity cannot be deleted - deactivate instead.",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleToggleActive = async () => {
        try {
            setLoading(true)
            await setChartAccountActive(data._id, data.isActive === false)
            router.refresh()
            toast.success(data.isActive === false ? "Account activated" : "Account deactivated")
        } catch (error) {
            console.error("Toggle active error:", error)
            toast.error("Could not update account", {
                description: error instanceof Error ? error.message : "Please try again later.",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {isLoading ? (
                    <DropdownMenuItem className="text-center items-center flex justify-center">
                        <Loader2 className="animate-spin h-4 w-4" />
                    </DropdownMenuItem>
                ) : (
                    <>
                        {canManage && (
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/account/account-list/${data?._id}`}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canManage && (
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={handleToggleActive}>
                                {data.isActive === false ? (
                                    <><Power className="mr-2 h-4 w-4" /> Activate</>
                                ) : (
                                    <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</>
                                )}
                            </DropdownMenuItem>
                        )}
                        {canManage && !data.isSystem && (
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="bg-red-500 hover:bg-red-800">
                                <DeleteDialog
                                    id={data?._id as string}
                                    onContinue={handleDelete}
                                    isLoading={loading}
                                />
                            </DropdownMenuItem>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}