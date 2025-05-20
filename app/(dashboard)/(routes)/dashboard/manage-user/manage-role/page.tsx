
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'
import { columns } from './_component/column'
import { currentUser } from '@/lib/helpers/current-user'
import { DataTable } from '@/components/table/data-table'
import Heading from '@/app/components/Heading'
import { currentUserRole } from '@/lib/helpers/current-role'
import { getAllRoles } from '@/lib/actions/role.actions'


const page = async () => {
  // Fetch the current user's profile
  const user = await currentUser();

  // Redirect to the homepage if no user is found
  if (!user) {
    redirect("/");
  }

  // Fetch the current user's role
  const role = await currentUserRole();


  // Destructure the 'addRole' permission from the user's role
  const { addRole } = role;

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