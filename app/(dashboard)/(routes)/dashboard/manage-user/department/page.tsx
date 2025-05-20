import Heading from '@/app/components/Heading'
import React from 'react'
import { DepartmentModal } from './_components/DepartmentModal'
import { Separator } from '@/components/ui/separator'
import { DataTable } from '@/components/table/data-table'
import { columns } from './_components/column'
import { getAllDepartments } from '@/lib/actions/department.actions'

const page = async () => {
  const data = await getAllDepartments()
  return (
    <>
      <div className="flex justify-between items-center">
        <Heading title="Manage Department" description="Manage,create and edit school department" />
        <DepartmentModal />
      </div>
      <Separator />
      <div className="">
        <DataTable searchKey="name" columns={columns} data={data} />
      </div>
    </>
  )
}

export default page