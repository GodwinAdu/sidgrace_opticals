"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Download,
  Printer,
  FileText,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

// Mock data for invoices
const invoices = [
  {
    id: "INV-2025-042",
    patientId: "SGO-P1001",
    patientName: "John Smith",
    date: "2025-04-25",
    dueDate: "2025-05-25",
    service: "Comprehensive Eye Examination",
    amount: 250.0,
    insurancePaid: 200.0,
    patientPaid: 50.0,
    status: "paid",
  },
  {
    id: "INV-2025-041",
    patientId: "SGO-P1002",
    patientName: "Emily Johnson",
    date: "2025-04-22",
    dueDate: "2025-05-22",
    service: "Contact Lens Fitting",
    amount: 175.0,
    insurancePaid: 140.0,
    patientPaid: 35.0,
    status: "paid",
  },
  {
    id: "INV-2025-040",
    patientId: "SGO-P1003",
    patientName: "Michael Brown",
    date: "2025-04-20",
    dueDate: "2025-05-20",
    service: "Follow-up Examination",
    amount: 125.0,
    insurancePaid: 100.0,
    patientPaid: 0.0,
    status: "pending",
  },
  {
    id: "INV-2025-039",
    patientId: "SGO-P1004",
    patientName: "Sarah Williams",
    date: "2025-04-18",
    dueDate: "2025-05-18",
    service: "Eyeglasses Purchase",
    amount: 450.0,
    insurancePaid: 250.0,
    patientPaid: 200.0,
    status: "paid",
  },
  {
    id: "INV-2025-038",
    patientId: "SGO-P1005",
    patientName: "Robert Davis",
    date: "2025-04-15",
    dueDate: "2025-05-15",
    service: "Glaucoma Screening",
    amount: 175.0,
    insurancePaid: 140.0,
    patientPaid: 0.0,
    status: "overdue",
  },
  {
    id: "INV-2025-037",
    patientId: "SGO-P1006",
    patientName: "Jennifer Lee",
    date: "2025-04-12",
    dueDate: "2025-05-12",
    service: "Contact Lens Purchase",
    amount: 220.0,
    insurancePaid: 150.0,
    patientPaid: 70.0,
    status: "paid",
  },
]

// Mock data for payments
const payments = [
  {
    id: "PMT-2025-056",
    invoiceId: "INV-2025-042",
    patientName: "John Smith",
    date: "2025-04-25",
    amount: 50.0,
    method: "Credit Card",
    reference: "VISA-4567",
  },
  {
    id: "PMT-2025-055",
    invoiceId: "INV-2025-041",
    patientName: "Emily Johnson",
    date: "2025-04-22",
    amount: 35.0,
    method: "Credit Card",
    reference: "MC-7890",
  },
  {
    id: "PMT-2025-054",
    invoiceId: "INV-2025-039",
    patientName: "Sarah Williams",
    date: "2025-04-18",
    amount: 200.0,
    method: "Cash",
    reference: "CASH-1234",
  },
  {
    id: "PMT-2025-053",
    invoiceId: "INV-2025-037",
    patientName: "Jennifer Lee",
    date: "2025-04-12",
    amount: 70.0,
    method: "Debit Card",
    reference: "DEBIT-5678",
  },
]

// Mock data for insurance claims
const insuranceClaims = [
  {
    id: "CLM-2025-042",
    invoiceId: "INV-2025-042",
    patientName: "John Smith",
    provider: "Blue Cross Blue Shield",
    submittedDate: "2025-04-25",
    amount: 200.0,
    status: "paid",
    paidDate: "2025-05-02",
  },
  {
    id: "CLM-2025-041",
    invoiceId: "INV-2025-041",
    patientName: "Emily Johnson",
    provider: "Aetna",
    submittedDate: "2025-04-22",
    amount: 140.0,
    status: "paid",
    paidDate: "2025-04-30",
  },
  {
    id: "CLM-2025-040",
    invoiceId: "INV-2025-040",
    patientName: "Michael Brown",
    provider: "UnitedHealthcare",
    submittedDate: "2025-04-20",
    amount: 100.0,
    status: "pending",
    paidDate: null,
  },
  {
    id: "CLM-2025-039",
    invoiceId: "INV-2025-039",
    patientName: "Sarah Williams",
    provider: "Cigna",
    submittedDate: "2025-04-18",
    amount: 250.0,
    status: "paid",
    paidDate: "2025-04-28",
  },
  {
    id: "CLM-2025-038",
    invoiceId: "INV-2025-038",
    patientName: "Robert Davis",
    provider: "Medicare",
    submittedDate: "2025-04-15",
    amount: 140.0,
    status: "denied",
    paidDate: null,
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
    case "overdue":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>
    case "denied":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Denied</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Filter invoices based on search query and status
  const filteredInvoices = invoices.filter((invoice) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesId = invoice.id.toLowerCase().includes(query)
      const matchesPatient = invoice.patientName.toLowerCase().includes(query)
      const matchesService = invoice.service.toLowerCase().includes(query)

      if (!matchesId && !matchesPatient && !matchesService) return false
    }

    // Filter by status
    if (selectedStatus !== "all" && invoice.status !== selectedStatus) return false

    return true
  })

  // Calculate billing statistics
  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.patientPaid + invoice.insurancePaid, 0)
  const totalOutstanding = totalRevenue - totalPaid
  const overdueAmount = invoices
    .filter((invoice) => invoice.status === "overdue")
    .reduce((sum, invoice) => sum + (invoice.amount - invoice.patientPaid - invoice.insurancePaid), 0)

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Billing & Payments</h1>
            <p className="text-gray-500">Manage invoices, payments, and insurance claims</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Billing Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                <div className="ml-2 flex items-center text-green-600 text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  12%
                </div>
              </div>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
              <p className="text-xs text-gray-500">From patients and insurance</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</div>
              <p className="text-xs text-gray-500">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</div>
                <div className="ml-2 flex items-center text-red-600 text-xs">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  5%
                </div>
              </div>
              <p className="text-xs text-gray-500">Past due date</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search invoices by ID, patient, or service..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="insurance">Insurance Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Manage patient and insurance billing</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Invoice #
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Insurance Paid</TableHead>
                      <TableHead>Patient Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/billing/invoices/${invoice.id}`}
                            className="text-blue-700 hover:underline"
                          >
                            {invoice.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/patients/${invoice.patientId}`} className="hover:text-blue-700">
                            {invoice.patientName}
                          </Link>
                        </TableCell>
                        <TableCell>{format(new Date(invoice.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{invoice.service}</TableCell>
                        <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>${invoice.insurancePaid.toFixed(2)}</TableCell>
                        <TableCell>${invoice.patientPaid.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Link
                                  href={`/dashboard/billing/invoices/${invoice.id}`}
                                  className="flex items-center w-full"
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Record Payment
                              </DropdownMenuItem>
                              {invoice.status === "pending" && (
                                <DropdownMenuItem>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Send Reminder
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Track patient payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.id}</TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/billing/invoices/${payment.invoiceId}`}
                            className="text-blue-700 hover:underline"
                          >
                            {payment.invoiceId}
                          </Link>
                        </TableCell>
                        <TableCell>{payment.patientName}</TableCell>
                        <TableCell>{format(new Date(payment.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Claims</CardTitle>
                <CardDescription>Track and manage insurance claims</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Insurance Provider</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insuranceClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.id}</TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/billing/invoices/${claim.invoiceId}`}
                            className="text-blue-700 hover:underline"
                          >
                            {claim.invoiceId}
                          </Link>
                        </TableCell>
                        <TableCell>{claim.patientName}</TableCell>
                        <TableCell>{claim.provider}</TableCell>
                        <TableCell>{format(new Date(claim.submittedDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>${claim.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={claim.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Check Status</DropdownMenuItem>
                              {claim.status === "denied" && <DropdownMenuItem>Resubmit Claim</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
