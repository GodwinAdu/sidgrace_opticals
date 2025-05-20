
import { Separator } from '@/components/ui/separator'
import SupplierForm from '../_components/SupplierForm'
import Heading from '@/app/components/Heading'


const page = () => {


    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Create Supplier"
                    description=" categories list "
                />

            </div>
            <Separator />
            <div className="py-4">
                {/* SupplierForm */}
                <SupplierForm type='create' />
            </div>
        </>
    )
}

export default page
