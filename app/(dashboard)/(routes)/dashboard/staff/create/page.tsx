"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Save, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PasswordStrength } from "@/components/password-strength"
import { MultiStepForm } from "@/components/multi-form-step"
import { FileUpload } from "@/components/file-upload"
import { createStaff } from "@/lib/actions/staff.actions"

// Define form schema with Zod
const userFormSchema = z
    .object({
        // Personal Information
        fullName: z.string().min(2, "First name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email address"),
        phone: z.string().min(10, "Phone number must be at least 10 characters"),
        dateOfBirth: z.date({
            required_error: "Date of birth is required",
        }),
        gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
            required_error: "Please select a gender",
        }),
        address: z.string().min(5, "Address must be at least 5 characters"),
        city: z.string().min(2, "City must be at least 2 characters"),
        state: z.string().min(2, "State must be at least 2 characters"),
        zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
        country: z.string().min(2, "Country must be at least 2 characters"),

        // Professional Information
        role: z.enum(["admin", "doctor", "nurse", "receptionist", "technician", "other"], {
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
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
        confirmPassword: z.string(),
        profileImage: z.any().optional(),

        // Permissions
        accessLevel: z.enum(["full", "limited", "basic"], {
            required_error: "Please select an access level",
        }),
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
        requirePasswordChange: z.boolean().default(true),
        sendWelcomeEmail: z.boolean().default(true),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })

type UserFormValues = z.infer<typeof userFormSchema>

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

// Define departments based on role
const departmentsByRole = {
    admin: ["Administration", "IT", "Finance", "HR"],
    doctor: ["Cardiology", "Neurology", "Pediatrics", "Orthopedics", "Oncology", "Emergency", "Surgery"],
    nurse: ["Cardiology", "Neurology", "Pediatrics", "Orthopedics", "Oncology", "Emergency", "Surgery"],
    receptionist: ["Front Desk", "Admissions", "Outpatient"],
    technician: ["Radiology", "Laboratory", "Pharmacy"],
    other: ["Maintenance", "Security", "Cafeteria", "Housekeeping"],
}

// Define permissions
const permissionOptions = [
    { id: "view_patients", label: "View Patients" },
    { id: "edit_patients", label: "Edit Patients" },
    { id: "view_appointments", label: "View Appointments" },
    { id: "edit_appointments", label: "Edit Appointments" },
    { id: "view_medical_records", label: "View Medical Records" },
    { id: "edit_medical_records", label: "Edit Medical Records" },
    { id: "view_reports", label: "View Reports" },
    { id: "edit_reports", label: "Edit Reports" },
    { id: "manage_users", label: "Manage Users" },
    { id: "manage_departments", label: "Manage Departments" },
    { id: "billing_access", label: "Billing Access" },
    { id: "pharmacy_access", label: "Pharmacy Access" },
]

// After the permissionOptions array, add this new mapping of access levels to permissions
const accessLevelPermissions = {
    basic: ["view_patients", "view_appointments", "view_reports"],
    limited: [
        "view_patients",
        "edit_patients",
        "view_appointments",
        "edit_appointments",
        "view_medical_records",
        "view_reports",
    ],
    full: permissionOptions.map((p) => p.id),
}

export default function CreateUserPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = React.useState(0)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [profileImageFile, setProfileImageFile] = React.useState<File | null>(null)
    const [profileImagePreview, setProfileImagePreview] = React.useState<string | null>(null)

    // Initialize form with default values
    const form = useForm({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            dateOfBirth: new Date(),
            gender: "prefer-not-to-say",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
            role: "doctor",
            department: undefined,
            specialization: undefined,
            licenseNumber: undefined,
            bio: undefined,
            username: "",
            password: "",
            confirmPassword: "",
            profileImage: undefined,
            accessLevel: "limited",
            permissions: [],
            isActive: true,
            requirePasswordChange: true,
            sendWelcomeEmail: true,
        },
    })

    // Watch for role changes to update department options
    const role = form.watch("role")
    const departments = departmentsByRole[role as keyof typeof departmentsByRole] || []

    // Add this useEffect after the role and departments variables
    // Watch for access level changes to update permissions
    React.useEffect(() => {
        const accessLevel = form.watch("accessLevel")
        if (accessLevel) {
            form.setValue("permissions", accessLevelPermissions[accessLevel as keyof typeof accessLevelPermissions])
        }
    }, [form.watch("accessLevel")])

    // Handle file upload
    const handleFileChange = (file: File | null) => {
        setProfileImageFile(file)
        form.setValue("profileImage", file)

        if (file) {
            const reader = new FileReader()
            reader.onload = () => {
                setProfileImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } else {
            setProfileImagePreview(null)
        }
    }

    // Handle file upload errors
    const handleFileError = (error: string) => {
        toast({
            title: "File Upload Error",
            description: error,
            variant: "destructive",
        })
    }

    // Handle form submission
    const onSubmit = async (data: UserFormValues) => {
        setIsSubmitting(true)

        try {
            await createStaff(data)
            console.log("Form data:", data)

            toast({
                title: "User Created Successfully",
                description: `${data.fullName} has been added as a ${data.role}.`,
            })

            // Redirect to staff page
            router.push("/dashboard/staff")
        } catch (error) {
            console.error("Error creating user:", error)
            toast({
                title: "Error Creating User",
                description: "There was an error creating the user. Please try again.",
            })
        } finally {
            setIsSubmitting(false)
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
                fieldsToValidate = ["role", "department"]
                break
            case 2: // Account Settings
                fieldsToValidate = ["username", "password", "confirmPassword"]
                break
            case 3: // Permissions
                fieldsToValidate = ["accessLevel"]
                break
            default:
                break
        }

        const result = await form.trigger(fieldsToValidate as any)

        if (result) {
            if (currentStep < steps.length - 1) {
                setCurrentStep((prev) => prev + 1)
            } else {
                // Directly call onSubmit with the form values instead of using form.handleSubmit
                onSubmit(form.getValues())
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
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
                                        <FormLabel>Phone Number</FormLabel>
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
                                        <FormLabel>Date of Birth</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                                                    initialFocus
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
                                        <FormLabel>Gender</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <FormLabel>Address</FormLabel>
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
                                        <FormLabel>City</FormLabel>
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
                                        <FormLabel>State</FormLabel>
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
                                        <FormLabel>ZIP Code</FormLabel>
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
                                    <FormLabel>Country</FormLabel>
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
                                        <FormLabel>Role</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                // Reset department when role changes
                                                form.setValue("department", "")
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="admin">Administrator</SelectItem>
                                                <SelectItem value="doctor">Doctor</SelectItem>
                                                <SelectItem value="nurse">Nurse</SelectItem>
                                                <SelectItem value="receptionist">Receptionist</SelectItem>
                                                <SelectItem value="technician">Technician</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
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
                                                    <SelectItem key={dept} value={dept}>
                                                        {dept}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {(role === "doctor" || role === "nurse") && (
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
                        )}

                        {(role === "doctor" || role === "nurse") && (
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
                                    <FormLabel>Username</FormLabel>
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
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <PasswordStrength password={field.value} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="profileImage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Profile Image</FormLabel>
                                    <FormControl>
                                        <FileUpload
                                            {...field}
                                            value={profileImageFile}
                                            onChange={handleFileChange}
                                            onError={handleFileError}
                                        />
                                    </FormControl>
                                    <FormDescription>Upload a profile picture for the user.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="requirePasswordChange"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Require Password Change</FormLabel>
                                            <FormDescription>User will be required to change password on first login.</FormDescription>
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
                                            <FormLabel>Send Welcome Email</FormLabel>
                                            <FormDescription>Send an email with login instructions.</FormDescription>
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
                            name="accessLevel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Access Level</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="grid grid-cols-3 gap-4"
                                        >
                                            <FormItem className="flex flex-col items-center space-x-0 space-y-2 rounded-lg border p-4 [&:has([data-state=checked])]:border-primary">
                                                <FormControl>
                                                    <RadioGroupItem value="basic" className="sr-only" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer text-center">
                                                    <div className="mb-2 rounded-full bg-primary/10 p-2 text-primary">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    Basic
                                                    <span className="block text-xs text-muted-foreground">Limited access</span>
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex flex-col items-center space-x-0 space-y-2 rounded-lg border p-4 [&:has([data-state=checked])]:border-primary">
                                                <FormControl>
                                                    <RadioGroupItem value="limited" className="sr-only" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer text-center">
                                                    <div className="mb-2 rounded-full bg-primary/10 p-2 text-primary">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    Limited
                                                    <span className="block text-xs text-muted-foreground">Standard access</span>
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex flex-col items-center space-x-0 space-y-2 rounded-lg border p-4 [&:has([data-state=checked])]:border-primary">
                                                <FormControl>
                                                    <RadioGroupItem value="full" className="sr-only" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer text-center">
                                                    <div className="mb-2 rounded-full bg-primary/10 p-2 text-primary">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    Full
                                                    <span className="block text-xs text-muted-foreground">Complete access</span>
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormDescription>Select the appropriate access level for this user.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="permissions"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel>Permissions</FormLabel>
                                        <FormDescription>Select the specific permissions for this user.</FormDescription>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                        {permissionOptions.map((permission) => (
                                            <FormField
                                                key={permission.id}
                                                control={form.control}
                                                name="permissions"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem key={permission.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(permission.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), permission.id])
                                                                            : field.onChange(field.value?.filter((value) => value !== permission.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{permission.label}</FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                {profileImagePreview ? (
                                    <AvatarImage src={profileImagePreview || "/placeholder.svg"} alt="Profile" />
                                ) : (
                                    <AvatarFallback>
                                        {formValues.fullName.charAt(0)}
                                        {formValues.fullName.charAt(1)}
                                    </AvatarFallback>
                                )}
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
                                    <dd className="col-span-2 text-sm">{formValues.department || "Not assigned"}</dd>
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
                                    <dt className="text-sm font-medium text-muted-foreground">Access Level</dt>
                                    <dd className="col-span-2 text-sm capitalize">{formValues.accessLevel}</dd>
                                </div>
                                <div className="grid grid-cols-3 p-4">
                                    <dt className="text-sm font-medium text-muted-foreground">Permissions</dt>
                                    <dd className="col-span-2">
                                        <div className="flex flex-wrap gap-1">
                                            {formValues.permissions?.map((permission) => (
                                                <Badge key={permission} variant="outline" className="text-xs">
                                                    {permissionOptions.find((p) => p.id === permission)?.label || permission}
                                                </Badge>
                                            ))}
                                            {!formValues.permissions?.length && (
                                                <span className="text-sm text-muted-foreground">No permissions assigned</span>
                                            )}
                                        </div>
                                    </dd>
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
                                    <dt className="text-sm font-medium text-muted-foreground">Welcome Email</dt>
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
                    onClick={() => router.push("/dashboard/staff")}
                >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create New User</h1>
                    <p className="text-muted-foreground">Add a new user to the system</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Information</CardTitle>
                    <CardDescription>
                        Enter the details for the new user. All fields marked with an asterisk (*) are required.
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
                                {currentStep === steps.length - 1 ? "Creating..." : "Next..."}
                            </>
                        ) : (
                            <>
                                {currentStep === steps.length - 1 ? (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Create User
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
