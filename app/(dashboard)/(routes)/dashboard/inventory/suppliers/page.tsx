
import { DataTable } from '@/components/table/data-table'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { columns } from './_components/column'
import { fetchAllSuppliers } from '@/lib/actions/inventory-supplier.actions'
import Heading from '@/app/components/Heading'


const page = async () => {
  const data = await fetchAllSuppliers() || []
  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Supplier Information"
          description=" categories list "
        />
        <Link href={`suppliers/create`} className={cn(buttonVariants())}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add
        </Link>
      </div>
      <Separator />
      <DataTable searchKey='name' columns={columns} data={data} />
    </>
  )
}

export default page
