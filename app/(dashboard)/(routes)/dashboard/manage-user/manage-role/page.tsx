
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { columns } from './_component/column'
import { DataTable } from '@/components/table/data-table'
import Heading from '@/app/components/Heading'
import { getAllRoles } from '@/lib/actions/role.actions'


const page = async () => {
 
  // Fetch all roles, defaulting to an empty array if none are found
  const values = await getAllRoles() ?? [];

  // Render the Role List page ??
  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Role List"
        />
        {/* {addRole && ( */}
        <Link
          href={`manage-role/create-role`}
          className={cn(buttonVariants())}
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create role
        </Link>
        {/* )} */}
      </div>
      <Separator />
      <DataTable
        searchKey="displayName"
        columns={columns}
        data={values}

      />
    </>
  )
}

export default page