
import { Separator } from '@/components/ui/separator'
import { fetchAllTrashes } from '@/lib/actions/trash.actions';

import React from 'react'
import { TrashList } from './_components/trash-list';

const page = async () => {
    const trashes = await fetchAllTrashes() || [];
    return (
        <div className="container mx-auto">
            <h1 className="text-2xl font-bold">Trash</h1>
            <Separator className='my-4' />
            <TrashList trashes={trashes} />
        </div>
    )
}

export default page
