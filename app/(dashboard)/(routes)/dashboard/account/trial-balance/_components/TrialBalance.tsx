'use client'

import { useState } from 'react'
import { DateRange } from "react-day-picker"
import { DownloadIcon, PrinterIcon, RefreshCcw, ArrowUpDown } from 'lucide-react'
import { type ColumnDef } from "@tanstack/react-table"
import { addDays } from "date-fns"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { DataTable } from '@/components/table/data-table'
import { DateRangePicker } from '@/components/ui/date-range-picker'

interface TrialBalanceData {
    id: string
    account: string
    type: string
    credit: number | null
    debit: number | null
}

const data: TrialBalanceData[] = [
    {
        id: "1",
        account: "Supplier Due",
        type: "liability",
        credit: null,
        debit: 3148099.25,
    },
    {
        id: "2",
        account: "Customer Due",
        type: "asset",
        credit: 54262.37,
        debit: null,
    },
    {
        id: "3",
        account: "Shop Account",
        type: "asset",
        credit: 34893.00,
        debit: null,
    },
    {
        id: "4",
        account: "Purchase Account",
        type: "expense",
        credit: -31042.00,
        debit: null,
    },
    {
        id: "5",
        account: "Goods Receivable Account",
        type: "asset",
        credit: 40481.81,
        debit: null,
    },
    {
        id: "6",
        account: "Sales Account",
        type: "revenue",
        credit: 187796.89,
        debit: null,
    },
    {
        id: "7",
        account: "Accounts Receivable",
        type: "asset",
        credit: 1662.50,
        debit: null,
    },
    {
        id: "8",
        account: "Customer",
        type: "asset",
        credit: 317.28,
        debit: null,
    },
]

export default function TrialBalance() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 20),
    })

    const columns: ColumnDef<TrialBalanceData>[] = [
        {
            accessorKey: "account",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Account
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => {
                const type = row.getValue("type") as string
                return (
                    <div className="flex items-center">
                        <span className={cn(
                            "rounded-full w-2 h-2 mr-2",
                            type === "asset" && "bg-green-500",
                            type === "liability" && "bg-red-500",
                            type === "revenue" && "bg-blue-500",
                            type === "expense" && "bg-yellow-500",
                        )} />
                        <span className="capitalize">{type}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "credit",
            header: "Credit",
            cell: ({ row }) => {
                const amount = row.getValue("credit") as number | null
                return amount ? (
                    <span className="font-mono">
                        {new Intl.NumberFormat('en-GH', {
                            style: 'currency',
                            currency: 'GHS'
                        }).format(amount)}
                    </span>
                ) : null
            },
        },
        {
            accessorKey: "debit",
            header: "Debit",
            cell: ({ row }) => {
                const amount = row.getValue("debit") as number | null
                return amount ? (
                    <span className="font-mono">
                        {new Intl.NumberFormat('en-GH', {
                            style: 'currency',
                            currency: 'GHS'
                        }).format(amount)}
                    </span>
                ) : null
            },
        },
    ]

    const totals = data.reduce((acc, curr) => ({
        credit: (acc.credit || 0) + (curr.credit || 0),
        debit: (acc.debit || 0) + (curr.debit || 0),
    }), { credit: 0, debit: 0 })

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trial Balance</h1>
                    <p className="text-muted-foreground">
                        View and analyze your account balances
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <DateRangePicker date={date} onDateChange={setDate} />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Refresh data</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-GH', {
                                style: 'currency',
                                currency: 'GHS'
                            }).format(totals.credit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total credit balance across all accounts
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-GH', {
                                style: 'currency',
                                currency: 'GHS'
                            }).format(totals.debit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total debit balance across all accounts
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-GH', {
                                style: 'currency',
                                currency: 'GHS'
                            }).format(totals.credit - totals.debit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Difference between credits and debits
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Account Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(data.map(item => item.type)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Different types of accounts in the system
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Account Balances</CardTitle>
                    <CardDescription>
                        A detailed view of all account balances and their current status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns} data={data} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" className="gap-2">
                    <DownloadIcon className="h-4 w-4" />
                    Export
                </Button>
                <Button className="gap-2">
                    <PrinterIcon className="h-4 w-4" />
                    Print
                </Button>
            </div>
        </div>
    )
}

