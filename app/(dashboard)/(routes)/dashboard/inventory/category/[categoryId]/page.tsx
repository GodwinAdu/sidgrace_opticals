
import { Separator } from '@/components/ui/separator'
import React from 'react'
import { fetchCategoryById } from '@/lib/actions/inventory-category.actions'
import { EditCategory } from '../_component/EditCategory'
import { fetchAllStores } from '@/lib/actions/inventory-store.actions'
import Heading from '@/app/components/Heading'

const page = async ({ params }: { params:Promise<{categoryId:string}> }) => {
    const {categoryId} = await params;

    const data = await fetchCategoryById(categoryId);
    const stores = await fetchAllStores() || []

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Update Category"
                    description=" categories list "
                />

            </div>
            <Separator />
            <div className="py-4">
                <EditCategory stores={stores} initialData={data} />
            </div>
        </>
    )
}

export default page
