
import { Separator } from '@/components/ui/separator'
import { StoreModal } from './_components/StoreModal'
import { DataTable } from '@/components/table/data-table'
import { columns } from './_components/column'
import { fetchAllStores } from '@/lib/actions/inventory-store.actions'
import Heading from '@/app/components/Heading'

const page = async () => {

  const data = await fetchAllStores() || [];
  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Stores"
          description=" categories list "
        />
        <StoreModal />
      </div>
      <Separator />
      <DataTable searchKey='name' columns={columns} data={data} />
    </>
  )
}

export default page
