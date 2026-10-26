import { Separator } from '@/components/ui/separator'
import React from 'react'
import { ChartAccountModal } from './_components/AccountModal'
import { columns } from './_components/column'

import { DataTable } from '@/components/table/data-table'
import { listChartAccounts } from '@/lib/actions/accounting/chart-account.actions'
import Heading from '@/app/components/Heading'

const page = async () => {
    const accounts = (await listChartAccounts()) || []
    const isEmpty = accounts.length === 0

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Chart of Accounts"
                    description="Define the asset, liability, equity, revenue and expense accounts your reports are built from."
                />
                <ChartAccountModal isEmpty={isEmpty} />
            </div>
            <Separator />

            <DataTable searchKey="name" columns={columns} data={accounts} />
        </>
    )
}

export default page