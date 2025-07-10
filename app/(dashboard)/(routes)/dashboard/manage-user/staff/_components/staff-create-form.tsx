"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Save, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createStaff } from "@/lib/actions/staff.actions"

// TypeScript interfaces
interface IDepartment {
    _id: string
    name: string
}

interface IRole {
    _id: string
    name: string
    displayName?: string
}

interface IUser {
    _id?: string
    fullName: string
    email: string
    phone: string
    dateOfBirth: Date
    gender: "male" | "female" | "other" | "prefer-not-to-say"
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    role: string
    department?: string
    specialization?: string
    licenseNumber?: string
    startDate: Date
    bio?: string
    username: string
    isActive: boolean
    requirePasswordChange: boolean
    sendWelcomeEmail: boolean
}



// Mock components - replace with your actual implementations
const PasswordStrength = ({ password }: { password: string }) => (
    <div className="text-xs text-muted-foreground mt-1">Password strength: {password.length > 8 ? "Strong" : "Weak"}</div>
)

const MultiStepForm = ({
    steps,
    currentStep,
    onStepChange,
    className,
}: {
    steps: any[]
    currentStep: number
    onStepChange: (step: number) => void
    className?: string
}) => (
    <div className={cn("flex space-x-2", className)}>
        {steps.map((step, index) => (
            <div key={step.id} className={cn("flex-1 h-2 rounded-full", index <= currentStep ? "bg-primary" : "bg-muted")} />
        ))}
    </div>
)

// Create dynamic schema based on mode
const createUserFormSchema = (isUpdate = false) => {
    const baseSchema = {
        // Personal Information
        fullName: z.string().min(2, "Full name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email address"),
        phone: z.string().min(10, "Phone number must be at least 10 characters"),
        dateOfBirth: z.date({
            required_error: "Date of birth is required",
        }),
        gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
            required_error: "Please select a gender",
        }),
        address: z.string().min(1, "Address is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zipCode: z.string().min(1, "ZIP code is required"),
        country: z.string().min(1, "Country is required"),
        // Professional Information
        role: z.string({
            required_error: "Please select a role",
        }),
        department: z.string().optional(),
        specialization: z.string().optional(),
        licenseNumber: z.string().optional(),
        startDate: z.date({
            required_error: "Start date is required",
        }),
        bio: z.string().optional(),
        // Account Settings
        username: z.string().min(4, "Username must be at least 4 characters"),
        isActive: z.boolean().default(true),
        requirePasswordChange: z.boolean().default(true),
        sendWelcomeEmail: z.boolean().default(true),
    }

    // Password fields - required for create, optional for update
    const passwordSchema = isUpdate
        ? {
            password: z.string().optional(),
            confirmPassword: z.string().optional(),
        }
        : {
            password: z
                .string()
                .min(8, "Password must be at least 8 characters")
                .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
                .regex(/[a-z]/, "Password must contain at least one lowercase letter")
                .regex(/[0-9]/, "Password must contain at least one number")
                .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
            confirmPassword: z.string(),
        }

    const schema = z.object({
        ...baseSchema,
        ...passwordSchema,
    })

    // Add password confirmation validation only if passwords are provided
    if (isUpdate) {
        return schema.refine(
            (data) => {
                if (data.password && data.confirmPassword) {
                    return data.password === data.confirmPassword
                }
                return true
            },
            {
                message: "Passwords do not match",
                path: ["confirmPassword"],
            },
        )
    } else {
        return schema.refine((data) => data.password === data.confirmPassword, {
            message: "Passwords do not match",
            path: ["confirmPassword"],
        })
    }
}

type UserFormValues = z.infer<ReturnType<typeof createUserFormSchema>>

// Define the steps for the multi-step form
const steps = [
    {
        id: "personal",
        title: "Personal",
        description: "Enter personal information",
    },
    {
        id: "professional",
        title: "Professional",
        description: "Enter professional information",
    },
    {
        id: "account",
        title: "Account",
        description: "Set up account credentials",
    },
    {
        id: "permissions",
        title: "Permissions",
        description: "Configure user permissions",
    },
    {
        id: "review",
        title: "Review",
        description: "Review and confirm user details",
    },
]

interface CreateUserProps {
    departments: IDepartment[]
    roles: IRole[]
    type: "create" | "update"
    initialData?: IUser
}

export default function CreateUser({ departments, roles, type, initialData }: CreateUserProps) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = React.useState(0)
    const isUpdate = type === "update"

    // Get the appropriate schema
    const userFormSchema = React.useMemo(() => createUserFormSchema(isUpdate), [isUpdate])

    // Initialize form with default values or existing data
    const getDefaultValues = (): Partial<UserFormValues> => {
        if (isUpdate && initialData) {
            return {
                fullName: initialData.fullName,
                email: initialData.email,
                phone: initialData.phone,
                dateOfBirth: new Date(initialData.dateOfBirth),
                gender: initialData.gender,
                address: initialData.address,
                city: initialData.city,
                state: initialData.state,
                zipCode: initialData.zipCode,
                country: initialData.country,
                role: initialData.role,
                department: initialData.department,
                specialization: initialData.specialization,
                licenseNumber: initialData.licenseNumber,
                startDate: new Date(initialData.startDate),
                bio: initialData.bio,
                username: initialData.username,
                isActive: initialData.isActive,
                requirePasswordChange: initialData.requirePasswordChange,
                sendWelcomeEmail: initialData.sendWelcomeEmail,
                password: "",
                confirmPassword: "",
            }
        }

        return {
            fullName: "",
            email: "",
            phone: "",
            dateOfBirth: new Date(),
            gender: undefined,
            address: "",
            city: "",
            state: "",
            zipCode: "",
            country: "Ghana",
            role: "",
            department: undefined,
            specialization: undefined,
            licenseNumber: undefined,
            startDate: new Date(),
            bio: undefined,
            username: "",
            password: "",
            confirmPassword: "",
            isActive: true,
            requirePasswordChange: true,
            sendWelcomeEmail: true,
        }
    }

    const form = useForm({
        resolver: zodResolver(userFormSchema),
        defaultValues: initialData ??  {
            fullName: "",
            email: "",
            phone: "",
            dateOfBirth: new Date(),
            gender: undefined,
            address: "",
            city: "",
            state: "",
            zipCode: "",
            country: "Ghana",
            role: "",
            department: undefined,
            specialization: undefined,
            licenseNumber: undefined,
            startDate: new Date(),
            bio: undefined,
            username: "",
            password: "",
            confirmPassword: "",
            isActive: true,
            requirePasswordChange: true,
            sendWelcomeEmail: true,
        }
    })

    // Watch for role changes to update department options
    const role = form.watch("role")
    const { isSubmitting } = form.formState

    // Handle form submission
    const onSubmit = async (data: UserFormValues) => {
        try {
            if (isUpdate && initialData?._id) {
                // Remove empty password fields for update
                const updateData = { ...data }
                if (!updateData.password) {
                    delete updateData.password
                    delete updateData.confirmPassword
                }
                // await updateStaff(initialData._id, updateData)
                toast.success("User Updated Successfully", {
                    description: `${data.fullName}'s information has been updated.`,
                })
            } else {
                await createStaff(data)
                toast.success("User Created Successfully", {
                    description: `${data.fullName} has been added as a ${data.role}.`,
                })
            }

            // Redirect to staff page
            router.push("/dashboard/staff")
        } catch (error) {
            console.error(`Error ${isUpdate ? "updating" : "creating"} user:`, error)
            toast.error(`Error ${isUpdate ? "Updating" : "Creating"} User`, {
                description: `There was an error ${isUpdate ? "updating" : "creating"} the user. Please try again.`,
            })
        }
    }

    // Handle next step
    const handleNext = async () => {
        // Validate current step fields
        let fieldsToValidate: (keyof UserFormValues)[] = []

        switch (currentStep) {
            case 0: // Personal Information
                fieldsToValidate = [
                    "fullName",
                    "email",
                    "phone",
                    "dateOfBirth",
                    "gender",
                    "address",
                    "city",
                    "state",
                    "zipCode",
                    "country",
                ]
                break
            case 1: // Professional Information
                fieldsToValidate = ["role", "startDate"]
                break
            case 2: // Account Settings
                fieldsToValidate = ["username"]
                // Only validate password for create mode or if password is provided in update mode
                if (!isUpdate || form.getValues().password) {
                    fieldsToValidate.push("password", "confirmPassword")
                }
                break
            case 3: // Permissions
                fieldsToValidate = ["isActive"]
                break
            default:
                break
        }

        const result = await form.trigger(fieldsToValidate as Parameters<typeof form.trigger>[0])

        if (result) {
            if (currentStep < steps.length - 1) {
                setCurrentStep((prev) => prev + 1)
            } else {
                // Submit the form
                const formValues = form.getValues()
                onSubmit({
                    ...formValues,
                    isActive: formValues.isActive ?? true,
                    requirePasswordChange: formValues.requirePasswordChange ?? true,
                    sendWelcomeEmail: formValues.sendWelcomeEmail ?? true,
                })
            }
        }
    }

    // Handle previous step
    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1)
        }
    }

    // Render form step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email *</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="john.doe@hospital.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(555) 123-4567" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="dateOfBirth"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date of Birth *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                    defaultMonth={field.value || new Date(1990, 0)}
                                                    captionLayout="dropdown"
                                                    startMonth={new Date(1950, 0)}
                                                    endMonth={new Date(new Date().getFullYear(), 0)}
                                                    autoFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gender *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>City *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="New York" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>State *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="NY" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="zipCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>ZIP Code *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="10001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="United States" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )

            case 1:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem key={role._id} value={role.displayName ?? role.name}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Department</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select department" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept._id} value={dept._id}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Start Date *</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                >
                                                   {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date("1900-01-01")}
                                                defaultMonth={field.value || new Date()}
                                                autoFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(role === "doctor" || role === "nurse") && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="specialization"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Specialization</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cardiology, Pediatrics, etc." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="licenseNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>License Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="License or certification number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Brief professional biography" className="resize-none" {...field} />
                                    </FormControl>
                                    <FormDescription>A short professional biography for the user profile.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="johndoe" {...field} />
                                    </FormControl>
                                    <FormDescription>This will be used for login. Must be unique.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password {!isUpdate && "*"}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder={isUpdate ? "Leave blank to keep current" : "••••••••"}
                                                {...field}
                                            />
                                        </FormControl>
                                        {field.value && <PasswordStrength password={field.value} />}
                                        {isUpdate && <FormDescription>Leave blank to keep the current password.</FormDescription>}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password {!isUpdate && "*"}</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder={isUpdate ? "Confirm new password" : "••••••••"} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="requirePasswordChange"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Require Password Change</FormLabel>
                                            <FormDescription>
                                                User will be required to change password on {isUpdate ? "next" : "first"} login.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sendWelcomeEmail"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Send {isUpdate ? "Notification" : "Welcome"} Email</FormLabel>
                                            <FormDescription>
                                                Send an email with {isUpdate ? "update notification" : "login instructions"}.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active Status</FormLabel>
                                        <FormDescription>Inactive users cannot log in to the system.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                )

            case 4:
                const formValues = form.getValues()
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback>
                                    {formValues.fullName?.charAt(0)?.toUpperCase()}
                                    {formValues.fullName?.split(" ")[1]?.charAt(0)?.toUpperCase() || ""}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h3 className="text-lg font-medium">{formValues.fullName}</h3>
                                <p className="text-sm text-muted-foreground">{formValues.email}</p>
                            </div>
                            <Badge className="capitalize">{formValues.role}</Badge>
                        </div>

                        <div className="rounded-lg border">
                            <div className="p-4">
                                <h4 className="font-medium">Personal Information</h4>
                            </div>
                            <Separator />
                            <dl className="divide-y">
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                                    <dd className="col-span-2 text-sm">{formValues.fullName}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                                    <dd className="col-span-2 text-sm">{formValues.email}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                                    <dd className="col-span-2 text-sm">{formValues.phone}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Date of Birth</dt>
                                    <dd className="col-span-2 text-sm">
                                        {formValues.dateOfBirth ? format(formValues.dateOfBirth, "PPP") : "Not provided"}
                                    </dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Gender</dt>
                                    <dd className="col-span-2 text-sm capitalize">
                                        {formValues.gender === "prefer-not-to-say" ? "Prefer not to say" : formValues.gender}
                                    </dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                                    <dd className="col-span-2 text-sm">
                                        {formValues.address}, {formValues.city}, {formValues.state} {formValues.zipCode},{" "}
                                        {formValues.country}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-lg border">
                            <div className="p-4">
                                <h4 className="font-medium">Professional Information</h4>
                            </div>
                            <Separator />
                            <dl className="divide-y">
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                                    <dd className="col-span-2 text-sm capitalize">{formValues.role}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Department</dt>
                                    <dd className="col-span-2 text-sm">
                                        {departments.find((d) => d._id === formValues.department)?.name || "Not assigned"}
                                    </dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                                    <dd className="col-span-2 text-sm">
                                        {formValues.startDate ? format(formValues.startDate, "PPP") : "Not provided"}
                                    </dd>
                                </div>
                                {(formValues.role === "doctor" || formValues.role === "nurse") && (
                                    <>
                                        <div className="grid grid-cols-3 p-4">
                                            <dt className="text-sm font-medium text-muted-foreground">Specialization</dt>
                                            <dd className="col-span-2 text-sm">{formValues.specialization || "Not specified"}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 p-4">
                                            <dt className="text-sm font-medium text-muted-foreground">License Number</dt>
                                            <dd className="col-span-2 text-sm">{formValues.licenseNumber || "Not provided"}</dd>
                                        </div>
                                    </>
                                )}
                                {formValues.bio && (
                                    <div className="grid grid-cols-3 p-4">
                                        <dt className="text-sm font-medium text-muted-foreground">Bio</dt>
                                        <dd className="col-span-2 text-sm">{formValues.bio}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="rounded-lg border">
                            <div className="p-4">
                                <h4 className="font-medium">Account & Permissions</h4>
                            </div>
                            <Separator />
                            <dl className="divide-y">
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Username</dt>
                                    <dd className="col-span-2 text-sm">{formValues.username}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                                    <dd className="col-span-2 text-sm">
                                        {formValues.isActive ? (
                                            <Badge variant="default">Active</Badge>
                                        ) : (
                                            <Badge variant="destructive">Inactive</Badge>
                                        )}
                                    </dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Password Change Required</dt>
                                    <dd className="col-span-2 text-sm">{formValues.requirePasswordChange ? "Yes" : "No"}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">
                                        {isUpdate ? "Notification" : "Welcome"} Email
                                    </dt>
                                    <dd className="col-span-2 text-sm">
                                        {formValues.sendWelcomeEmail ? "Will be sent" : "Will not be sent"}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="container mx-auto px-4">
            <div className="mb-6 flex items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2 rounded-full"
                    onClick={() => router.push("/dashboard/manage-user/staff")}
                >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isUpdate ? "Update User" : "Create New User"}</h1>
                    <p className="text-muted-foreground">
                        {isUpdate ? `Update ${initialData?.fullName || "user"} information` : "Add a new user to the system"}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Information</CardTitle>
                    <CardDescription>
                        {isUpdate
                            ? "Update the user details. Fields marked with an asterisk (*) are required."
                            : "Enter the details for the new user. All fields marked with an asterisk (*) are required."}
                    </CardDescription>
                    <MultiStepForm steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} className="mt-4" />
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                            {renderStepContent()}
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                    </Button>
                    <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {currentStep === steps.length - 1 ? (isUpdate ? "Updating..." : "Creating...") : "Next..."}
                            </>
                        ) : (
                            <>
                                {currentStep === steps.length - 1 ? (
                                    <>
                                        {isUpdate ? (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Update User
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Create User
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
