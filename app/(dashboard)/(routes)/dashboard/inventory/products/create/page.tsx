
import { Separator } from '@/components/ui/separator'
import { fetchCategories } from '@/lib/actions/inventory-category.actions'
import React from 'react'
import ProductForm from '../_components/ProductForm'
import Heading from '@/app/components/Heading'
import { listChartAccounts } from '@/lib/actions/accounting/chart-account.actions'

const page = async () => {

    const categories = await fetchCategories() || [];

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
                    title="Create Products"
                    description=" categories list "
                />

            </div>
            <Separator />
            <div className="py-4">
                {/* ProductForm */}
                <ProductForm type='create' categories={categories} chartAccounts={chartAccounts} />
            </div>
        </>
    )
}

export default page
