'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Printer, ChevronDown, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface BalanceSheetData {
  liabilities: { [key: string]: number }
  assets: { [key: string]: number }
  accountBalances: { [key: string]: number }
}

export default function BalanceSheet() {
  const [date, setDate] = useState<Date>(new Date())
  const [isAssetsOpen, setIsAssetsOpen] = useState(true)
  const [isLiabilitiesOpen, setIsLiabilitiesOpen] = useState(true)
  
  const data: BalanceSheetData = {
    liabilities: {
      "Supplier Due": 3148099.25,
    },
    assets: {
      "Customer Due": 52698.62,
      "Closing stock": 60165946.27,
    },
    accountBalances: {
      "Shop Account": 34893.00,
      "PURCHASE ACCOUNT": -31042.00,
      "GOODS RECIEVABLE ACCOUNT": 40481.81,
      "SALES ACCOUNT": 187796.89,
      "Accounts Receivable": 1662.50,
      "customer": 317.28,
    }
  }

  const totalLiabilities = Object.values(data.liabilities).reduce((sum, val) => sum + val, 0)
  const totalAssets = Object.values(data.assets).reduce((sum, val) => sum + val, 0) +
    Object.values(data.accountBalances).reduce((sum, val) => sum + val, 0)
  const netPosition = totalAssets - totalLiabilities

  const handlePrint = () => {
    window.print()
  }

  const MotionCard = motion(Card)

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6 print:bg-white print:bg-none">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-teal-600">
            Balance Sheet
          </h1>
          <div className="flex items-center gap-4">
            {/* <DatePicker date={date} setDate={setDate} /> */}
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:flex justify-between items-center">
          <h1 className="text-2xl font-bold">Balance Sheet</h1>
          <div>{format(date, 'dd/MM/yyyy')}</div>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS {totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </MotionCard>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS {totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">
                -5.4% from last month
              </p>
            </CardContent>
          </MotionCard>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              {netPosition >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                GHS {Math.abs(netPosition).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {netPosition >= 0 ? 'Positive' : 'Negative'} balance
              </p>
            </CardContent>
          </MotionCard>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Assets */}
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Collapsible open={isAssetsOpen} onOpenChange={setIsAssetsOpen}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Assets</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAssetsOpen ? 'transform rotate-180' : ''}`} />
                    <span className="sr-only">Toggle Assets</span>
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(data.assets).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{key}</span>
                        <span className="font-medium">GHS {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-2">Account Balances</h3>
                      <div className="space-y-2">
                        {Object.entries(data.accountBalances).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{key}</span>
                            <span className={`font-medium ${value < 0 ? 'text-red-600' : ''}`}>
                              GHS {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-4 border-t flex justify-between items-center">
                      <span className="font-semibold">Total Assets</span>
                      <span className="font-bold text-lg">
                        GHS {totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </MotionCard>

          {/* Liabilities */}
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Collapsible open={isLiabilitiesOpen} onOpenChange={setIsLiabilitiesOpen}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Liabilities</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isLiabilitiesOpen ? 'transform rotate-180' : ''}`} />
                    <span className="sr-only">Toggle Liabilities</span>
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(data.liabilities).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{key}</span>
                        <span className="font-medium">GHS {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t flex justify-between items-center">
                      <span className="font-semibold">Total Liabilities</span>
                      <span className="font-bold text-lg">
                        GHS {totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </MotionCard>
        </div>
      </div>
    </div>
  )
}

