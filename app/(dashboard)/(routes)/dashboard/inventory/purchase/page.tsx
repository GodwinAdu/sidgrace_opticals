
import { DataTable } from '@/components/table/data-table'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { columns } from './_components/column'
import { fetchAllPurchases } from '@/lib/actions/inventory-purchase.actions'
import Heading from '@/app/components/Heading'

const page = async () => {
  const data = await fetchAllPurchases() || []
  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Purchase"
          description=" categories list "
        />
        <Link href={`purchase/create`} className={cn(buttonVariants())}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add
        </Link>
      </div>
      <Separator />

      <DataTable searchKey='purchaseDate' data={data} columns={columns} />
    </>
  )
}

export default page
