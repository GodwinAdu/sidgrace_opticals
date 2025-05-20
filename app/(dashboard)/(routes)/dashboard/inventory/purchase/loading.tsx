import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export default function Loading() {
    return (
        <>
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[150px]" /> {/* Placeholder for SessionModal button */}
            </div>
            <Separator className="my-4" />

            {/* Skeleton for DataTable */}
            <div className="space-y-4">
                {/* Table header */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-[250px]" /> {/* Search input */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-[100px]" /> {/* Filter button */}
                        <Skeleton className="h-9 w-[100px]" /> {/* View options */}
                    </div>
                </div>

                {/* Table header row */}
                <div className="rounded-md border">
                    <div className="flex items-center p-4 bg-muted/30">
                        <Skeleton className="h-5 w-5 mr-4" /> {/* Checkbox */}
                        <Skeleton className="h-5 w-[150px] mr-6" /> {/* Session column */}
                        <Skeleton className="h-5 w-[150px] mr-6" /> {/* Current column */}
                        <Skeleton className="h-5 w-[150px] mr-6" /> {/* Created by column */}
                        <Skeleton className="h-5 w-[150px]" /> {/* Actions column */}
                    </div>

                    {/* Table rows */}
                    {Array(5).fill(null).map((_, index) => (
                        <div key={index} className="flex items-center p-4 border-t">
                            <Skeleton className="h-4 w-4 mr-4" /> {/* Checkbox */}
                            <Skeleton className="h-4 w-[150px] mr-6" /> {/* Session data */}
                            <Skeleton className="h-4 w-[150px] mr-6" /> {/* Current data */}
                            <Skeleton className="h-4 w-[150px] mr-6" /> {/* Created by data */}
                            <Skeleton className="h-8 w-[100px]" /> {/* Actions buttons */}
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                    <Skeleton className="h-8 w-[100px]" /> {/* Rows per page */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-[100px]" /> {/* Page navigation */}
                        <Skeleton className="h-8 w-[100px]" /> {/* Page numbers */}
                    </div>
                </div>
            </div>
        </>
    )
}