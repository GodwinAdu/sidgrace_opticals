
import { Separator } from '@/components/ui/separator'
import SupplierForm from '../_components/SupplierForm'
import { fetchSupplierById } from '@/lib/actions/inventory-supplier.actions'
import Heading from '@/app/components/Heading'

const page = async ({ params }: { params: { supplierId: string } }) => {

    const data = await fetchSupplierById(params.supplierId as string)
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Update Supplier"
                    description=" categories list "
                />

            </div>
            <Separator />
            <div className="py-4">
                {/* ProductForm */}
                <SupplierForm type='update' initialData={data} />
            </div>
        </>
    )
}

export default page
