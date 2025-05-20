
import { Separator } from '@/components/ui/separator'
import React from 'react'
import { CategoryModal } from './_component/CategoryModal'
import { DataTable } from '@/components/table/data-table'
import { columns } from './_component/column'
import { fetchCategories } from '@/lib/actions/inventory-category.actions'
import { fetchAllStores } from '@/lib/actions/inventory-store.actions'
import Heading from '@/app/components/Heading'

const page = async () => {

  const stores = await fetchAllStores()

  const data = await fetchCategories() || [];

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Category"
          description=" categories list "
        />
        <CategoryModal stores={stores} />
      </div>
      <Separator />
      <DataTable searchKey='name' data={data} columns={columns} />
    </>
  )
}

export default page
