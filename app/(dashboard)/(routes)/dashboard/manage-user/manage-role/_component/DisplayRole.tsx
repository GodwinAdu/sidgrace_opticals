"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { CreateRoleSchema } from "@/lib/validators/create-role-schema";

import { zodResolver } from "@hookform/resolvers/zod";

import { useForm } from "react-hook-form";
import * as z from "zod";


type DisplayRoleProps = {
  initialData:IRole
}

const DisplayRole = ({ initialData }: DisplayRoleProps) => {

  const form = useForm<z.infer<typeof CreateRoleSchema>>({
    resolver: zodResolver(CreateRoleSchema),
    defaultValues: initialData
  });



  return (
    <>
      <div className="">
      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="w-full h-full">
              <CardContent>
                <div className="flex justify-between items-center gap-4 py-2">
                  <div className="">
                    <div className="font-bold text-md">NEW ROLE</div>
                  </div>
                  <Button disabled={isSubmitting} type="submit">
                    {isSubmitting ? submitting : submit}
                  </Button>
                </div>
                <div className="px-2 md:px-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter Role Name ..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter Display Name ..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Write a short description ..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="py-5">
                    <h1 className="font-semibold text-lg capitalize">
                      Add Permission
                    </h1>
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    GLOBAL ACCESS
                  </h1>
                  <div className="flex gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="manageOnlyPos"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Only POS</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Access</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs  bg-black/80 p-0.5">
                    MANAGEMENT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="dashboard"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Dashboard</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="user"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access User</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="product"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Product</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Stock Transfer</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Payment Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="report"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Reports</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs  bg-black/80 p-0.5">
                    DASHBOARD ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="dashboard"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Dashboard</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewChart"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View chart on dashboard</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewMemberTab"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View members tab on dashboard</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewEnquiries"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              View enquiries tab on dashboard
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              View expenses tab on dashboard
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>



                  {/* // System config */}
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    ROLES ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addRole"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add roles</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewRole"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Role details</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editRole"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit role details</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteRole"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete roles</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageRole"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage roles</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    USER ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addUser"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Add User</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editUser"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit User details</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteUser"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete User </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageUser"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage User</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    PRODUCT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addProduct"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Add Product</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editProduct"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Product</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteProduct"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Product</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageProduct"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Session</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listProduct"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View List Products</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    PRODUCT UNIT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addUnit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Unit</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editUnit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Unit</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteUnit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Unit</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageUnit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Unit</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* CLASS MANAGEMENT */}

                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    PRODUCT BRAND ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addBrand"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Brand</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editBrand"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Brand details</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteBrand"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Brand</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageBrand"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Brand</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    PRODUCT CATEGORY ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Able Delete Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    PRINT LABEL ALLOCATIONS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addPrintLabel"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Creating Print Label</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editPrintLabel"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Print Label</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deletePrintLabel"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Print Label</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managePrintLabel"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Print Label</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    VARIATIONS ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addVariation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Creating Variations</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editVariation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Variations</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteVariation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Variations</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageVariation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Variations</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    SELL GROUP PRICE ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addSellGroupPrice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Creating Sell Group Price </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editSellGroupPrice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Sell Group Price</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteSellGroupPrice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Sell Group Price </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageSellGroupPrice"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Sell Group Price</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Manage users */}

                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    WARRANT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addWarrant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Warrant</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editWarrant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Warrant</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteWarrant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Warrant</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageWarrant"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Warrant</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    SALES ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addSales" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editSales" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteSales" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageSales" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageAllSales" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage All Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listSellReturn" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>List Sell Return</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="importSales" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Import Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    ORDER ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addOrder"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Order</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editOrder"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Order</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteOrder"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Order</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageOrder"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Order</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listOrder"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage List Order</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                 
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    PURCHASE ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addPurchase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editPurchase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deletePurchase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managePurchase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listPurchaseReturn"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>List Purchase Return</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="importPurchase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Import Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    STOCK TRANSFER ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addStockTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Stock Transfer</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editStockTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Edit Stock Transfer</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteStockTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Delete Stock Transfer</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageStockTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Manage Stock Transfer</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listStockTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> List Stock Transfer</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    STOCK ADJUSTMENT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addStockAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editStockAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Edit Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteStockAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Delete Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageStockAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Manage Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listStockAdjustment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> List Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    EXPENSES CATEGORIES ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addExpensesCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Expenses Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="editExpensesCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Edit Expenses Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteExpensesCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Delete Expenses Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageExpensesCategory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel> Manage Expenses Category</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    EXPENSES ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">

                    <FormField
                      control={form.control}
                      name="addExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listExpenses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>List Expenses</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    LIST ACCOUNT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">

                    <FormField
                      control={form.control}
                      name="addListAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewListAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editListAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Edit Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteListAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Delete Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageListAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Manage Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    OTHERS ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="balanceSheet"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Balance Sheet</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="trialBalance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Trial Balance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cashFlow"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Cash Flow</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentAccountReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Payment Accounts</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                  </div>
                  <h1 className="text-white text-xs bg-black/80 p-0.5">
                    REPORT ACCESS
                  </h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="profitLostReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Profit/ Loss</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="itemsReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Items Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registerReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Register Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expensesReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Expenses Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="productSellReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Product Sell</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="productPurchaseReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Product Purchase</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sellReturnReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Sell Return</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchaseReturnReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Purchase Return</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockTransferReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Stock Transfer Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockAdjustmentReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Stock Adjustment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salesReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Sales Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchaseReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Purchase Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="trendingProductReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Trending Product</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockExpiryReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Stock Expiry</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stockReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Stock Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Tax Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="saleRepresentativeReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Sale Representative</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerSupplierReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0  p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Access Customer/Supplier</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </>
  );
};

export default DisplayRole;
