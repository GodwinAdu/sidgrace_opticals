
import { Separator } from '@/components/ui/separator'
import { fetchCategories } from '@/lib/actions/inventory-category.actions'
import ProductForm from '../_components/ProductForm'
import { fetchProductById } from '@/lib/actions/inventory-product.actions'
import Heading from '@/app/components/Heading'

const page = async ({ params }: { params: { productId: string } }) => {

    const categories = await fetchCategories() || [];
    const data = await fetchProductById(params.productId as string)
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Update Products"
                    description=" categories list "
                />

            </div>
            <Separator />
            <div className="py-4">
                {/* ProductForm */}
                <ProductForm type='update' categories={categories} initialData={data} />
            </div>
        </>
    )
}

export default page
