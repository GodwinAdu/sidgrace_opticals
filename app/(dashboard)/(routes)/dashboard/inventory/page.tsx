"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  AlertCircle,
  BarChart3,
  Package,
  Glasses,
  Pill,
  Droplets,
  ShoppingBag,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Mock data for inventory items
const inventoryItems = [
  {
    id: "INV-001",
    name: "Ray-Ban Aviator Classic",
    category: "frames",
    subcategory: "Sunglasses",
    brand: "Ray-Ban",
    sku: "RB3025-L0205-58",
    price: 154.99,
    cost: 89.99,
    quantity: 15,
    reorderLevel: 5,
    location: "Display Cabinet A",
    lastRestocked: "2025-04-15",
    status: "in-stock",
  },
  {
    id: "INV-002",
    name: "Acuvue Oasys (24 Pack)",
    category: "contact-lenses",
    subcategory: "Bi-weekly",
    brand: "Acuvue",
    sku: "AO-24PK-SPH",
    price: 120.99,
    cost: 65.5,
    quantity: 8,
    reorderLevel: 10,
    location: "Storage Room B",
    lastRestocked: "2025-04-10",
    status: "low-stock",
  },
  {
    id: "INV-003",
    name: "Opti-Free PureMoist Solution",
    category: "solutions",
    subcategory: "Multipurpose",
    brand: "Alcon",
    sku: "OFPM-300ML",
    price: 12.99,
    cost: 6.75,
    quantity: 32,
    reorderLevel: 15,
    location: "Shelf C2",
    lastRestocked: "2025-04-22",
    status: "in-stock",
  },
  {
    id: "INV-004",
    name: "Oakley Holbrook",
    category: "frames",
    subcategory: "Sunglasses",
    brand: "Oakley",
    sku: "OO9102-01",
    price: 179.99,
    cost: 95.0,
    quantity: 3,
    reorderLevel: 5,
    location: "Display Cabinet B",
    lastRestocked: "2025-03-28",
    status: "low-stock",
  },
  {
    id: "INV-005",
    name: "Varilux X Series Progressive Lenses",
    category: "lenses",
    subcategory: "Progressive",
    brand: "Essilor",
    sku: "VXS-CR39-CL",
    price: 299.99,
    cost: 150.0,
    quantity: 12,
    reorderLevel: 8,
    location: "Lab Storage",
    lastRestocked: "2025-04-05",
    status: "in-stock",
  },
  {
    id: "INV-006",
    name: "Crizal Anti-Reflective Coating",
    category: "lens-treatments",
    subcategory: "Anti-Reflective",
    brand: "Essilor",
    sku: "CRZ-AR-STD",
    price: 89.99,
    cost: 45.0,
    quantity: 0,
    reorderLevel: 5,
    location: "Lab Storage",
    lastRestocked: "2025-03-15",
    status: "out-of-stock",
  },
  {
    id: "INV-007",
    name: "Systane Ultra Lubricant Eye Drops",
    category: "medications",
    subcategory: "Eye Drops",
    brand: "Alcon",
    sku: "SYS-ULT-10ML",
    price: 14.99,
    cost: 7.25,
    quantity: 25,
    reorderLevel: 10,
    location: "Medicine Cabinet",
    lastRestocked: "2025-04-18",
    status: "in-stock",
  },
  {
    id: "INV-008",
    name: "Gucci GG0036S",
    category: "frames",
    subcategory: "Designer",
    brand: "Gucci",
    sku: "GG0036S-001",
    price: 375.0,
    cost: 195.0,
    quantity: 2,
    reorderLevel: 2,
    location: "Luxury Display",
    lastRestocked: "2025-04-01",
    status: "in-stock",
  },
  {
    id: "INV-009",
    name: "Dailies Total1 (90 Pack)",
    category: "contact-lenses",
    subcategory: "Daily",
    brand: "Alcon",
    sku: "DT1-90PK-SPH",
    price: 89.99,
    cost: 45.0,
    quantity: 0,
    reorderLevel: 5,
    location: "Storage Room B",
    lastRestocked: "2025-03-20",
    status: "out-of-stock",
  },
  {
    id: "INV-010",
    name: "Transitions Signature GEN 8",
    category: "lens-treatments",
    subcategory: "Photochromic",
    brand: "Transitions",
    sku: "TRS-SIG-G8",
    price: 129.99,
    cost: 65.0,
    quantity: 18,
    reorderLevel: 8,
    location: "Lab Storage",
    lastRestocked: "2025-04-12",
    status: "in-stock",
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "in-stock":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>
    case "low-stock":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low Stock</Badge>
    case "out-of-stock":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Out of Stock</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

// Category icon component
const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case "frames":
      return <Glasses className="h-5 w-5 text-blue-500" />
    case "lenses":
      return <Package className="h-5 w-5 text-purple-500" />
    case "contact-lenses":
      return <Droplets className="h-5 w-5 text-cyan-500" />
    case "solutions":
      return <Droplets className="h-5 w-5 text-teal-500" />
    case "medications":
      return <Pill className="h-5 w-5 text-red-500" />
    case "lens-treatments":
      return <Package className="h-5 w-5 text-indigo-500" />
    default:
      return <ShoppingBag className="h-5 w-5 text-gray-500" />
  }
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showLowStock, setShowLowStock] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)

  // Filter inventory items based on search query, category, and low stock filter
  const filteredItems = inventoryItems.filter((item) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = item.name.toLowerCase().includes(query)
      const matchesBrand = item.brand.toLowerCase().includes(query)
      const matchesSku = item.sku.toLowerCase().includes(query)

      if (!matchesName && !matchesBrand && !matchesSku) return false
    }

    // Filter by category
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false

    // Filter by low stock
    if (showLowStock && item.quantity > item.reorderLevel) return false

    return true
  })

  // Calculate inventory statistics
  const totalItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.reorderLevel).length
  const outOfStockItems = inventoryItems.filter((item) => item.quantity === 0).length
  const inventoryValue = inventoryItems.reduce((sum, item) => sum + item.cost * item.quantity, 0)

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Inventory Management</h1>
            <p className="text-gray-500">Manage products, stock levels, and orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-700 hover:bg-blue-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Inventory Item</DialogTitle>
                  <DialogDescription>Enter the details for the new inventory item.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input id="name" placeholder="Enter item name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input id="brand" placeholder="Enter brand name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frames">Frames</SelectItem>
                          <SelectItem value="lenses">Lenses</SelectItem>
                          <SelectItem value="contact-lenses">Contact Lenses</SelectItem>
                          <SelectItem value="solutions">Solutions</SelectItem>
                          <SelectItem value="medications">Medications</SelectItem>
                          <SelectItem value="lens-treatments">Lens Treatments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                      <Input id="subcategory" placeholder="Enter subcategory" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input id="sku" placeholder="Enter SKU" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Storage Location</Label>
                      <Input id="location" placeholder="Enter storage location" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Retail Price ($)</Label>
                      <Input id="price" type="number" step="0.01" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost">Cost Price ($)</Label>
                      <Input id="cost" type="number" step="0.01" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Initial Quantity</Label>
                      <Input id="quantity" type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input id="reorderLevel" type="number" placeholder="Enter reorder threshold" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => setIsAddItemDialogOpen(false)}>
                    Add Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-gray-500">{inventoryItems.length} unique products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems}</div>
              <p className="text-xs text-gray-500">Need to reorder soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockItems}</div>
              <p className="text-xs text-gray-500">Items to reorder immediately</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
              <p className="text-xs text-gray-500">Based on cost price</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search by name, brand, or SKU..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="frames">Frames</SelectItem>
                <SelectItem value="lenses">Lenses</SelectItem>
                <SelectItem value="contact-lenses">Contact Lenses</SelectItem>
                <SelectItem value="solutions">Solutions</SelectItem>
                <SelectItem value="medications">Medications</SelectItem>
                <SelectItem value="lens-treatments">Lens Treatments</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className={showLowStock ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Low Stock Only
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
                setShowLowStock(false)
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>Manage your inventory stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Item
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={item.category} />
                            <div>
                              <div>{item.name}</div>
                              <div className="text-xs text-gray-500">{item.brand}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.subcategory}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>${item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between">
                              <span>{item.quantity}</span>
                              <span className="text-xs text-gray-500">Min: {item.reorderLevel}</span>
                            </div>
                            <Progress
                              value={(item.quantity / Math.max(item.reorderLevel * 3, 1)) * 100}
                              className={`h-2 ${
                                item.quantity === 0
                                  ? "bg-red-200"
                                  : item.quantity <= item.reorderLevel
                                    ? "bg-amber-200"
                                    : "bg-green-200"
                              }`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
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
                              <DropdownMenuItem>Edit Item</DropdownMenuItem>
                              <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                              <DropdownMenuItem>Create Purchase Order</DropdownMenuItem>
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

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>Track and manage purchase orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button className="bg-blue-700 hover:bg-blue-800">
                    <Plus className="mr-2 h-4 w-4" />
                    New Purchase Order
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">PO-2025-042</TableCell>
                      <TableCell>Luxottica Group</TableCell>
                      <TableCell>Apr 25, 2025</TableCell>
                      <TableCell>12 items</TableCell>
                      <TableCell>$2,450.00</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">PO-2025-041</TableCell>
                      <TableCell>Alcon</TableCell>
                      <TableCell>Apr 18, 2025</TableCell>
                      <TableCell>8 items</TableCell>
                      <TableCell>$1,875.50</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Shipped</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">PO-2025-040</TableCell>
                      <TableCell>Essilor</TableCell>
                      <TableCell>Apr 10, 2025</TableCell>
                      <TableCell>15 items</TableCell>
                      <TableCell>$3,250.75</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Analytics</CardTitle>
                <CardDescription>Insights and trends for your inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <BarChart3 className="h-16 w-16 text-gray-400" />
                    <h3 className="text-lg font-medium">Analytics Dashboard</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      Detailed inventory analytics with sales trends, stock turnover rates, and profitability metrics
                      will be displayed here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
