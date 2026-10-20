
import { Separator } from '@/components/ui/separator'
import { fetchCategories } from '@/lib/actions/inventory-category.actions'
import ProductForm from '../_components/ProductForm'
import { fetchProductById } from '@/lib/actions/inventory-product.actions'
import Heading from '@/app/components/Heading'
import { listChartAccounts } from '@/lib/actions/accounting/chart-account.actions'

const page = async ({ params }: { params: { productId: string } }) => {

    const categories = await fetchCategories() || [];
    const data = await fetchProductById(params.productId as string)

    // Account linking is gated by `accountingManagement`. Attempt the fetch;
    // if the user lacks permission (or it throws), fall back to an empty list
    // so the form renders the account selects disabled but still saves.
    let chartAccounts: { _id: string; code: string; name: string; type: string }[] = [];
    try {
        chartAccounts = (await listChartAccounts(true)) || [];
    } catch {
        chartAccounts = [];
    }

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
                <ProductForm type='update' categories={categories} initialData={data} chartAccounts={chartAccounts} />
            </div>
        </>
    )
}

export default page
