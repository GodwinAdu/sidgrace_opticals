"use client"

import React, { useState } from "react"
import { Edit, Eye, Loader2, MoreHorizontal } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

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


interface CellActionProps {
  data: IProduct
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const { isLoading, role } = useClientRole()
  console.log(role,"testing role")

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      // await deleteRole(id)
      router.refresh()

      toast.success("Deleted successfully",{
        description: "You've deleted the product successfully",
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast.error( "Something Went Wrong",{
        description: "Please try again later",
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
            {/* {role?.viewRole && ( */}
              <DropdownMenuItem asChild>
                <Link href={`/${params.storeId}/dashboard/${params.branchId}/users/manage-role/${data?._id}`}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Link>
              </DropdownMenuItem>
            {/* )} */}
            {/* {role?.editRole && ( */}
              <DropdownMenuItem asChild>
                <Link href={`/${params.storeId}/dashboard/${params.branchId}/users/manage-role/${data?._id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Update
                </Link>
              </DropdownMenuItem>
            {/* // )} */}
            {/* {role?.deleteRole && ( */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="bg-red-500 hover:bg-red-800">
                <DeleteDialog
                  id={data?._id}
                  onContinue={handleDelete}
                  isLoading={loading}
                />
              </DropdownMenuItem>
            {/* )} */}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

