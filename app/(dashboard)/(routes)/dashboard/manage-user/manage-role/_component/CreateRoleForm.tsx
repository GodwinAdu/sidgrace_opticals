"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createRole, updateRole } from "@/lib/actions/role.actions"
import { zodResolver } from "@hookform/resolvers/zod"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Add this function before the CreateRoleForm component
const rolePresets = {
  doctor: {
    name: "Doctor",
    displayName: "doctor",
    description: "Medical professional who diagnoses and treats patients",
    // Management permissions
    dashboard: true,
    opdManagement: true,
    patientManagement: true,
    appointmentManagement: true,
    // OPD permissions
    addOpd: true,
    manageOpd: true,
    viewOpd: true,
    editOpd: true,
    // Patient permissions
    addPatient: true,
    viewPatient: true,
    editPatient: true,
    // Appointment permissions
    addAppointment: true,
    manageAppointment: true,
    viewAppointment: true,
    editAppointment: true,
  },
  nurse: {
    name: "Nurse",
    displayName: "nurse",
    description: "Healthcare professional who assists doctors and cares for patients",
    // Management permissions
    dashboard: true,
    opdManagement: true,
    patientManagement: true,
    // OPD permissions
    viewOpd: true,
    // Patient permissions
    viewPatient: true,
    // Appointment permissions
    viewAppointment: true,
    // Inventory permissions
    viewInventory: true,
  },
  receptionist: {
    name: "receptionist",
    displayName: "Receptionist",
    description: "Front desk staff who manages appointments and patient registration",
    // Management permissions
    dashboard: true,
    appointmentManagement: true,
    patientManagement: true,
    // Patient permissions
    addPatient: true,
    viewPatient: true,
    editPatient: true,
    // Appointment permissions
    addAppointment: true,
    manageAppointment: true,
    viewAppointment: true,
    editAppointment: true,
  },
  admin: {
    name: "Admin",
    displayName: "admin",
    description: "Manage the hospital",
    dashboard: true,
    opdManagement: true,
    attendantManagement: true,
    patientManagement: true,
    staffManagement: true,
    appointmentManagement: true,
    accountManagement: true,
    salesManagement: true,
    messaging: true,
    inventoryManagement: true,
    report: true,
    trash: true,
    history: true,
    addOpd: true,
    manageOpd: true,
    viewOpd: true,
    editOpd: true,
    deleteOpd: true,
    addAttendance: true,
    manageAttendance: true,
    viewAttendance: true,
    editAttendance: true,
    deleteAttendance: true,
    addStaff: true,
    manageStaff: true,
    viewStaff: true,
    editStaff: true,
    deleteStaff: true,
    addPatient: true,
    managePatient: true,
    viewPatient: true,
    editPatient: true,
    deletePatient: true,
    addAppointment: true,
    manageAppointment: true,
    viewAppointment: true,
    editAppointment: true,
    deleteAppointment: true,
    addAccount: true,
    manageAccount: true,
    viewAccount: true,
    editAccount: true,
    deleteAccount: true,
    addSales: true,
    manageSales: true,
    viewSales: true,
    editSales: true,
    deleteSales: true,
    addInventory: true,
    manageInventory: true,
    viewInventory: true,
    editInventory: true,
    deleteInventory: true,
    AccountReport: true,
    inventoryReport: true,
    attendanceReport: true,
  }
}

interface IRole {
  name: string
  displayName: string
  description?: string
  dashboard: boolean
  opdManagement: boolean
  attendantManagement: boolean
  patientManagement: boolean
  staffManagement: boolean
  appointmentManagement: boolean
  accountManagement: boolean
  salesManagement: boolean
  messaging: boolean
  inventoryManagement: boolean
  report: boolean
  trash: boolean
  history: boolean
  addOpd: boolean
  manageOpd: boolean
  viewOpd: boolean
  editOpd: boolean
  deleteOpd: boolean
  addAttendance: boolean
  manageAttendance: boolean
  viewAttendance: boolean
  editAttendance: boolean
  deleteAttendance: boolean
  addStaff: boolean
  manageStaff: boolean
  viewStaff: boolean
  editStaff: boolean
  deleteStaff: boolean
  addPatient: boolean
  managePatient: boolean
  viewPatient: boolean
  editPatient: boolean
  deletePatient: boolean
  addAppointment: boolean
  manageAppointment: boolean
  viewAppointment: boolean
  editAppointment: boolean
  deleteAppointment: boolean
  addAccount: boolean
  manageAccount: boolean
  viewAccount: boolean
  editAccount: boolean
  deleteAccount: boolean
  addSales: boolean
  manageSales: boolean
  viewSales: boolean
  editSales: boolean
  deleteSales: boolean
  addInventory: boolean
  manageInventory: boolean
  viewInventory: boolean
  editInventory: boolean
  deleteInventory: boolean
  AccountReport: boolean
  inventoryReport: boolean
  attendanceReport: boolean
}

const CreateRoleForm = ({ type, initialData }: { type: "create" | "update"; initialData?: IRole }) => {
  const path = usePathname()
  const router = useRouter()
  const params = useParams()

  const roleId = params.manageRoleId as string

  const CreateRoleSchema = z.object({
    name: z.string().min(1, "Role name is required"),
    displayName: z.string().min(1, "Display name is required"),
    description: z.string().optional(),
    // Dashboard permissions
    dashboard: z.boolean(),
    // Management permissions
    opdManagement: z.boolean(),
    attendantManagement: z.boolean(),
    patientManagement: z.boolean(),
    staffManagement: z.boolean(),
    appointmentManagement: z.boolean(),
    accountManagement: z.boolean(),
    salesManagement: z.boolean(),
    messaging: z.boolean(),
    inventoryManagement: z.boolean(),
    report: z.boolean(),
    trash: z.boolean(),
    history: z.boolean(),
    // OPD permissions
    addOpd: z.boolean(),
    manageOpd: z.boolean(),
    viewOpd: z.boolean(),
    editOpd: z.boolean(),
    deleteOpd: z.boolean(),
    // Attendance permissions
    addAttendance: z.boolean(),
    manageAttendance: z.boolean(),
    viewAttendance: z.boolean(),
    editAttendance: z.boolean(),
    deleteAttendance: z.boolean(),
    // Staff permissions
    addStaff: z.boolean(),
    manageStaff: z.boolean(),
    viewStaff: z.boolean(),
    editStaff: z.boolean(),
    deleteStaff: z.boolean(),
    // Patient permissions
    addPatient: z.boolean(),
    managePatient: z.boolean(),
    viewPatient: z.boolean(),
    editPatient: z.boolean(),
    deletePatient: z.boolean(),
    // Appointment permissions
    addAppointment: z.boolean(),
    manageAppointment: z.boolean(),
    viewAppointment: z.boolean(),
    editAppointment: z.boolean(),
    deleteAppointment: z.boolean(),
    // Account permissions
    addAccount: z.boolean(),
    manageAccount: z.boolean(),
    viewAccount: z.boolean(),
    editAccount: z.boolean(),
    deleteAccount: z.boolean(),
    // Sales permissions
    addSales: z.boolean(),
    manageSales: z.boolean(),
    viewSales: z.boolean(),
    editSales: z.boolean(),
    deleteSales: z.boolean(),
    // Inventory permissions
    addInventory: z.boolean(),
    manageInventory: z.boolean(),
    viewInventory: z.boolean(),
    editInventory: z.boolean(),
    deleteInventory: z.boolean(),
    // Report permissions
    AccountReport: z.boolean(),
    inventoryReport: z.boolean(),
    attendanceReport: z.boolean(),
  })

  const defaultValues: Record<string, string | boolean> = Object.fromEntries(
    Object.keys(CreateRoleSchema.shape).map((key) => {
      // Check if the key should have a default value of ""
      if (key === "name" || key === "displayName" || key === "description") {
        return [key, ""]
      }
      // Otherwise, default value is false
      return [key, false]
    }),
  )
  // 1. Define your form.
  const form = useForm<z.infer<typeof CreateRoleSchema>>({
    resolver: zodResolver(CreateRoleSchema),
    defaultValues: initialData || defaultValues,
  })

  // get functions to build form with useForm() hook

  const { isSubmitting } = form.formState

  const submit = initialData ? "Update" : "Create"
  const submitting = initialData ? "Updating..." : "Creating..."

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof CreateRoleSchema>) {
    try {
      if (type === "create") {
        await createRole(values, path)
      }
      if (type === "update") {
        await updateRole(roleId, values, path)
      }
      form.reset()

      toast.success(`Role ${type === "create" ? "Created" : "Updated"} successfully`, {
        description: `A role was  ${type === "create" ? "created" : "updated"}  successfully...`,
      })
      router.push(`/dashboard/manage-user/manage-role`)
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again later...",
      })
    }
  }

  // Inside the CreateRoleForm component, add this function after the onSubmit function
  function applyRolePreset(preset: "doctor" | "nurse" | "receptionist") {
    // Create a new object with all permissions set to false
    const baseValues = Object.keys(CreateRoleSchema.shape).reduce((acc, key) => {
      if (key === "name" || key === "displayName" || key === "description") {
        return { ...acc, [key]: "" }
      }
      return { ...acc, [key]: false }
    }, {})

    // Apply the preset values
    const presetValues = { ...baseValues, ...rolePresets[preset] }

    // Reset the form with the new values
    form.reset(presetValues)

    toast.success(`Applied ${preset} preset`, {
      description: `The form has been updated with ${preset} permissions.`,
    })
  }

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
                            <Input placeholder="Enter Role Name ..." {...field} />
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
                            <Input placeholder="Enter Display Name ..." {...field} />
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
                            <Input placeholder="Write a short description ..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="py-5">
                    <h1 className="font-semibold text-lg capitalize">Add Permission</h1>
                  </div>

                  <div className="mb-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Role Presets</AlertTitle>
                      <AlertDescription>
                        Select a preset to automatically configure permissions for common roles.
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-wrap gap-4 mt-4">
                      <Button type="button" variant="outline" onClick={() => applyRolePreset("doctor")}>
                        Doctor Preset
                      </Button>
                      <Button type="button" variant="outline" onClick={() => applyRolePreset("nurse")}>
                        Nurse Preset
                      </Button>
                      <Button type="button" variant="outline" onClick={() => applyRolePreset("receptionist")}>
                        Receptionist Preset
                      </Button>
                      <Button type="button" variant="outline" onClick={() => applyRolePreset("admin")}>
                        Admin Preset
                      </Button>
                    </div>
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">MANAGEMENT ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="dashboard"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Dashboard</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="opdManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>OPD Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="attendantManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Attendant Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="patientManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Patient Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="staffManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Staff Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="appointmentManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Appointment Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Account Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salesManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Sales Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="messaging"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Messaging</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inventoryManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Inventory Management</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="report"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Reports</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="trash"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Trash</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="history"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>History</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">OPD ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addOpd"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add OPD</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageOpd"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage OPD</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewOpd"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View OPD</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editOpd"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit OPD</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteOpd"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete OPD</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">ATTENDANCE ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addAttendance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Attendance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageAttendance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Attendance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewAttendance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Attendance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editAttendance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Attendance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteAttendance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Attendance</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">STAFF ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addStaff"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Staff</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageStaff"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Staff</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewStaff"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Staff</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editStaff"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Staff</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteStaff"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Staff</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">PATIENT ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addPatient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Patient</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="managePatient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Patient</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewPatient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Patient</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editPatient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Patient</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deletePatient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Patient</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">APPOINTMENT ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addAppointment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Appointment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageAppointment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Appointment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewAppointment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Appointment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editAppointment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Appointment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteAppointment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Appointment</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">ACCOUNT ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteAccount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Account</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">SALES ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addSales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageSales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewSales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editSales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteSales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Sales</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">INVENTORY ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="addInventory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add Inventory</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manageInventory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Manage Inventory</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="viewInventory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>View Inventory</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="editInventory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Edit Inventory</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deleteInventory"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Delete Inventory</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <h1 className="text-white text-xs bg-black/80 p-0.5">REPORT ACCESS</h1>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3">
                    <FormField
                      control={form.control}
                      name="AccountReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Account Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inventoryReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Inventory Report</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="attendanceReport"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Attendance Report</FormLabel>
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
  )
}

export default CreateRoleForm
