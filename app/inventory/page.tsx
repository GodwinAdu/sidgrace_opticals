import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Eye,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react"

export default function InventoryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Eye className="h-6 w-6 text-blue-700" />
              <span className="sr-only">Sid Grace Opticals</span>
            </Link>
            <span className="text-xl font-bold text-blue-900">Inventory Management</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">Spectacles Inventory</h1>
              <p className="text-gray-500">Manage your eyewear stock and track availability</p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-blue-700 hover:bg-blue-800">
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">856</div>
                <p className="text-xs text-gray-500">
                  <span className="text-green-500">+24 items</span> added this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-gray-500">Items that need reordering soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">In Stock</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">844</div>
                <p className="text-xs text-gray-500">
                  <span className="text-green-500">98.6%</span> of inventory available
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input type="search" placeholder="Search by frame name, brand, or SKU..." className="w-full pl-8" />
            </div>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="frames">Frames</SelectItem>
                  <SelectItem value="sunglasses">Sunglasses</SelectItem>
                  <SelectItem value="lenses">Lenses</SelectItem>
                  <SelectItem value="contacts">Contact Lenses</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Manage your spectacles and eyewear inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Product Name
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      id: 1,
                      name: "Classic Round Frame",
                      brand: "Vision Pro",
                      category: "Frames",
                      price: 129.99,
                      stock: 24,
                      image: "/classic-round-specs.png",
                    },
                    {
                      id: 2,
                      name: "Aviator Sunglasses",
                      brand: "SunVision",
                      category: "Sunglasses",
                      price: 149.99,
                      stock: 18,
                      image: "/placeholder.svg?height=50&width=80&query=aviator sunglasses",
                    },
                    {
                      id: 3,
                      name: "Blue Light Blocking Lenses",
                      brand: "ClearView",
                      category: "Lenses",
                      price: 89.99,
                      stock: 32,
                      image: "/placeholder.svg?height=50&width=80&query=blue light glasses lenses",
                    },
                    {
                      id: 4,
                      name: "Cat Eye Frames",
                      brand: "StyleVision",
                      category: "Frames",
                      price: 119.99,
                      stock: 15,
                      image: "/placeholder.svg?height=50&width=80&query=cat eye glasses frames",
                    },
                    {
                      id: 5,
                      name: "Monthly Contact Lenses",
                      brand: "ContactClear",
                      category: "Contacts",
                      price: 45.99,
                      stock: 50,
                      image: "/placeholder.svg?height=50&width=80&query=contact lenses box",
                    },
                    {
                      id: 6,
                      name: "Rectangle Frames",
                      brand: "Vision Pro",
                      category: "Frames",
                      price: 109.99,
                      stock: 8,
                      image: "/placeholder.svg?height=50&width=80&query=rectangle eyeglasses frames",
                    },
                  ].map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="w-[60px] h-[40px] relative rounded overflow-hidden">
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.stock > 10
                              ? "bg-green-100 text-green-800"
                              : item.stock > 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Showing 6 of 856 items</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Featured Categories */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-blue-900">Inventory Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  title: "Frames",
                  count: 342,
                  image: "/placeholder.svg?height=200&width=300&query=eyeglasses frames collection",
                },
                {
                  title: "Sunglasses",
                  count: 156,
                  image: "/placeholder.svg?height=200&width=300&query=sunglasses collection",
                },
                {
                  title: "Lenses",
                  count: 208,
                  image: "/placeholder.svg?height=200&width=300&query=eyeglasses lenses",
                },
                {
                  title: "Contact Lenses",
                  count: 150,
                  image: "/placeholder.svg?height=200&width=300&query=contact lenses boxes",
                },
              ].map((category, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="relative h-40 w-full">
                    <Image
                      src={category.image || "/placeholder.svg"}
                      alt={category.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg text-blue-900">{category.title}</h3>
                    <p className="text-sm text-gray-500">{category.count} items</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button variant="outline" className="w-full">
                      View All
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sid Grace Opticals. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">Inventory Management System v1.0</p>
        </div>
      </footer>
    </div>
  )
}
