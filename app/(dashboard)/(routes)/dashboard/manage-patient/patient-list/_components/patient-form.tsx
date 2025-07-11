"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Check, ChevronRight, Loader2, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createPatient, updatePatient } from "@/lib/actions/patient.actions"

interface PatientFormData {
    // Personal Information
    fullName: string
    dob: string
    gender: string
    maritalStatus: string
    occupation: string
    email: string
    phone: string
    alternatePhone: string
    address: string
    // Medical Information
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
    currentMedications: string
    familyHistory: string
    familyOcularHistory: string
    medicalHistory: string[]
    socialHistory: string[]
    // Emergency Contact
    emergencyContactName: string
    emergencyContactRelationship: string
    emergencyContactPhone: string
    // Additional Information
    referralSource: string
    preferredCommunication: string
    providerId: string
    serviceNumber: string
    // Consent
    consentToTreatment: boolean
    consentToShareInformation: boolean
    acknowledgmentOfPrivacyPolicy: boolean
}

interface RegisterPatientPageProps {
    type: "create" | "update"
    initialData?: any
}

const defaultFormData: PatientFormData = {
    // Personal Information
    fullName: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    email: "",
    phone: "",
    alternatePhone: "",
    address: "",
    // Medical Information
    bloodType: "",
    allergies: [""],
    chronicConditions: [""],
    currentMedications: "",
    familyHistory: "",
    familyOcularHistory: "",
    medicalHistory: [""],
    socialHistory: [""],
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    // Additional Information
    referralSource: "",
    preferredCommunication: "",
    providerId: "",
    serviceNumber: "",
    // Consent
    consentToTreatment: false,
    consentToShareInformation: false,
    acknowledgmentOfPrivacyPolicy: false,
}

export default function RegisterPatientPage({ type, initialData }: RegisterPatientPageProps) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<PatientFormData>(defaultFormData)

    const totalSteps = 4

    // Initialize form data when component mounts or initialData changes
    useEffect(() => {
        if (type === "update" && initialData) {
            setFormData({
                // Personal Information
                fullName: initialData.fullName || "",
                dob: initialData.dob || "",
                gender: initialData.gender || "",
                maritalStatus: initialData.maritalStatus || "",
                occupation: initialData.occupation || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                alternatePhone: initialData.alternatePhone || "",
                address: initialData.address || "",
                // Medical Information
                bloodType: initialData.bloodType || "",
                allergies:
                    Array.isArray(initialData.allergies) && initialData.allergies.length > 0 ? initialData.allergies : [""],
                chronicConditions:
                    Array.isArray(initialData.chronicConditions) && initialData.chronicConditions.length > 0
                        ? initialData.chronicConditions
                        : [""],
                currentMedications: initialData.currentMedications || "",
                familyHistory: initialData.familyHistory || "",
                familyOcularHistory: initialData.familyOcularHistory || "",
                medicalHistory:
                    Array.isArray(initialData.medicalHistory) && initialData.medicalHistory.length > 0
                        ? initialData.medicalHistory
                        : [""],
                socialHistory:
                    Array.isArray(initialData.socialHistory) && initialData.socialHistory.length > 0
                        ? initialData.socialHistory
                        : [""],
                // Emergency Contact
                emergencyContactName: initialData.emergencyContactName || initialData.emergencyName || "",
                emergencyContactRelationship: initialData.emergencyContactRelationship || "",
                emergencyContactPhone: initialData.emergencyContactPhone || initialData.emergencyPhone || "",
                // Additional Information
                referralSource: initialData.referralSource || "",
                preferredCommunication: initialData.preferredCommunication || "",
                providerId: initialData.providerId || "",
                serviceNumber: initialData.serviceNumber || "",
                // Consent
                consentToTreatment: initialData.consentToTreatment || false,
                consentToShareInformation: initialData.consentToShareInformation || false,
                acknowledgmentOfPrivacyPolicy: initialData.acknowledgmentOfPrivacyPolicy || false,
            })
        }
    }, [type, initialData])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value,
        })
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData({
            ...formData,
            [name]: value,
        })
    }

    const handleCheckboxChange = (name: string, checked: boolean) => {
        setFormData({
            ...formData,
            [name]: checked,
        })
    }

    const handleArrayChange = (fieldName: string, index: number, value: string) => {
        const updatedArray = [...(formData[fieldName as keyof typeof formData] as string[])]
        updatedArray[index] = value
        setFormData({
            ...formData,
            [fieldName]: updatedArray,
        })
    }

    const addArrayItem = (fieldName: string) => {
        const currentArray = formData[fieldName as keyof typeof formData] as string[]
        setFormData({
            ...formData,
            [fieldName]: [...currentArray, ""],
        })
    }

    const removeArrayItem = (fieldName: string, index: number) => {
        const updatedArray = (formData[fieldName as keyof typeof formData] as string[]).filter((_, i) => i !== index)
        setFormData({
            ...formData,
            [fieldName]: updatedArray,
        })
    }

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1)
            window.scrollTo(0, 0)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
            window.scrollTo(0, 0)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (type === "create") {
                // Generate unique IDs for new patient
                const patientId = `PAT-${Date.now()}`
                const originalId = Date.now()

                const patientData = {
                    ...formData,
                    patientId,
                    originalId,
                    registeredAt: new Date().toISOString(),
                    registeredInfo: `Registered via web form on ${new Date().toLocaleDateString()}`,
                    emergencyName: formData.emergencyContactName,
                    emergencyPhone: formData.emergencyContactPhone,
                }

                await createPatient(patientData)
                toast.success("Patient registered successfully", {
                    description: `Patient ID: ${patientId}`,
                })
            } else {
                // Update existing patient
                const updatedPatientData = {
                    ...formData,
                    patientId: initialData.patientId,
                    originalId: initialData.originalId,
                    updatedAt: new Date().toISOString(),
                    emergencyName: formData.emergencyContactName,
                    emergencyPhone: formData.emergencyContactPhone,
                }

                await updatePatient(initialData.patientId, updatedPatientData)
                toast.success("Patient updated successfully", {
                    description: `Patient ID: ${initialData.patientId}`,
                })
            }

            // Redirect to the patients list
            router.push("/dashboard/manage-patient/patients")
        } catch (error) {
            console.log("Something went wrong", error)
            toast.error(type === "create" ? "Failed to register patient" : "Failed to update patient")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col">
            <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">
                        {type === "create" ? "Register New Patient" : "Update Patient Information"}
                    </h1>
                    <p className="text-gray-600">
                        {type === "create"
                            ? "Fill out the form below to register a new patient"
                            : "Update the patient information below"}
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="w-full max-w-3xl mx-auto mb-8">
                    <div className="flex justify-between mb-2">
                        {Array.from({ length: totalSteps }).map((_, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                                        currentStep > index + 1
                                            ? "bg-green-100 text-green-700 border-2 border-green-500"
                                            : currentStep === index + 1
                                                ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                                                : "bg-gray-100 text-gray-400 border-2 border-gray-200",
                                    )}
                                >
                                    {currentStep > index + 1 ? <Check className="h-5 w-5" /> : index + 1}
                                </div>
                                <span
                                    className={cn(
                                        "text-xs mt-1",
                                        currentStep === index + 1 ? "text-blue-700 font-medium" : "text-gray-500",
                                    )}
                                >
                                    {index === 0 ? "Personal" : index === 1 ? "Medical" : index === 2 ? "Emergency" : "Review"}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Step 1: Personal Information */}
                    {currentStep === 1 && (
                        <Card className="max-w-5xl mx-auto">
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Enter the patient's personal details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">
                                        Full Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="dob">
                                            Date of Birth <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input
                                                id="dob"
                                                name="dob"
                                                type="date"
                                                value={formData.dob}
                                                onChange={handleInputChange}
                                                className="pl-8"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="gender">
                                            Gender <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.gender}
                                            onValueChange={(value) => handleSelectChange("gender", value)}
                                            required
                                        >
                                            <SelectTrigger id="gender">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="maritalStatus">Marital Status</Label>
                                        <Select
                                            value={formData.maritalStatus}
                                            onValueChange={(value) => handleSelectChange("maritalStatus", value)}
                                        >
                                            <SelectTrigger id="maritalStatus">
                                                <SelectValue placeholder="Select marital status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Single">Single</SelectItem>
                                                <SelectItem value="Married">Married</SelectItem>
                                                <SelectItem value="Divorced">Divorced</SelectItem>
                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                                <SelectItem value="Separated">Separated</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="occupation">Occupation</Label>
                                        <Input
                                            id="occupation"
                                            name="occupation"
                                            value={formData.occupation}
                                            onChange={handleInputChange}
                                            placeholder="Enter occupation"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">
                                            Phone Number <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="Enter phone number"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="alternatePhone">Alternate Phone Number</Label>
                                    <Input
                                        id="alternatePhone"
                                        name="alternatePhone"
                                        value={formData.alternatePhone}
                                        onChange={handleInputChange}
                                        placeholder="Enter alternate phone number"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">
                                        Address <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Enter complete address"
                                        required
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="providerId">Provider ID</Label>
                                        <Input
                                            id="providerId"
                                            name="providerId"
                                            value={formData.providerId}
                                            onChange={handleInputChange}
                                            placeholder="Enter provider ID"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="serviceNumber">Service Number</Label>
                                        <Input
                                            id="serviceNumber"
                                            name="serviceNumber"
                                            value={formData.serviceNumber}
                                            onChange={handleInputChange}
                                            placeholder="Enter service number"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Preferred Communication Method</Label>
                                    <RadioGroup
                                        value={formData.preferredCommunication}
                                        onValueChange={(value) => handleSelectChange("preferredCommunication", value)}
                                        className="flex flex-col space-y-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Email" id="communication-email" />
                                            <Label htmlFor="communication-email">Email</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Phone" id="communication-phone" />
                                            <Label htmlFor="communication-phone">Phone</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="SMS" id="communication-sms" />
                                            <Label htmlFor="communication-sms">SMS</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="referralSource">Referral Source</Label>
                                    <Select
                                        value={formData.referralSource}
                                        onValueChange={(value) => handleSelectChange("referralSource", value)}
                                    >
                                        <SelectTrigger id="referralSource">
                                            <SelectValue placeholder="How did you hear about us?" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Doctor Referral">Doctor Referral</SelectItem>
                                            <SelectItem value="Friend/Family">Friend/Family</SelectItem>
                                            <SelectItem value="Insurance">Insurance</SelectItem>
                                            <SelectItem value="Internet Search">Internet Search</SelectItem>
                                            <SelectItem value="Social Media">Social Media</SelectItem>
                                            <SelectItem value="Advertisement">Advertisement</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" type="button" onClick={() => router.push("/dashboard/patients")}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={nextStep} className="bg-blue-700 hover:bg-blue-800">
                                    Next Step
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Step 2: Medical Information */}
                    {currentStep === 2 && (
                        <Card className="max-w-5xl mx-auto">
                            <CardHeader>
                                <CardTitle>Medical Information</CardTitle>
                                <CardDescription>Enter the patient's medical history and details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="bloodType">Blood Type</Label>
                                    <Select value={formData.bloodType} onValueChange={(value) => handleSelectChange("bloodType", value)}>
                                        <SelectTrigger id="bloodType">
                                            <SelectValue placeholder="Select blood type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A+">A+</SelectItem>
                                            <SelectItem value="A-">A-</SelectItem>
                                            <SelectItem value="B+">B+</SelectItem>
                                            <SelectItem value="B-">B-</SelectItem>
                                            <SelectItem value="AB+">AB+</SelectItem>
                                            <SelectItem value="AB-">AB-</SelectItem>
                                            <SelectItem value="O+">O+</SelectItem>
                                            <SelectItem value="O-">O-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Allergies</Label>
                                    {formData.allergies.map((allergy, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={allergy}
                                                onChange={(e) => handleArrayChange("allergies", index, e.target.value)}
                                                placeholder="Enter allergy"
                                            />
                                            {formData.allergies.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeArrayItem("allergies", index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("allergies")}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Allergy
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label>Chronic Conditions</Label>
                                    {formData.chronicConditions.map((condition, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={condition}
                                                onChange={(e) => handleArrayChange("chronicConditions", index, e.target.value)}
                                                placeholder="Enter chronic condition"
                                            />
                                            {formData.chronicConditions.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeArrayItem("chronicConditions", index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("chronicConditions")}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Condition
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="currentMedications">Current Medications</Label>
                                    <Textarea
                                        id="currentMedications"
                                        name="currentMedications"
                                        value={formData.currentMedications}
                                        onChange={handleInputChange}
                                        placeholder="List current medications, dosages, and frequency"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="familyHistory">Family History</Label>
                                    <Textarea
                                        id="familyHistory"
                                        name="familyHistory"
                                        value={formData.familyHistory}
                                        onChange={handleInputChange}
                                        placeholder="Enter family medical history"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="familyOcularHistory">Family Ocular History</Label>
                                    <Textarea
                                        id="familyOcularHistory"
                                        name="familyOcularHistory"
                                        value={formData.familyOcularHistory}
                                        onChange={handleInputChange}
                                        placeholder="Enter family eye/vision history"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Medical History</Label>
                                    {formData.medicalHistory.map((history, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={history}
                                                onChange={(e) => handleArrayChange("medicalHistory", index, e.target.value)}
                                                placeholder="Enter medical history item"
                                            />
                                            {formData.medicalHistory.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeArrayItem("medicalHistory", index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("medicalHistory")}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Medical History
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label>Social History</Label>
                                    {formData.socialHistory.map((history, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={history}
                                                onChange={(e) => handleArrayChange("socialHistory", index, e.target.value)}
                                                placeholder="Enter social history (smoking, drinking, etc.)"
                                            />
                                            {formData.socialHistory.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeArrayItem("socialHistory", index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("socialHistory")}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Social History
                                    </Button>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" type="button" onClick={prevStep}>
                                    Previous
                                </Button>
                                <Button type="button" onClick={nextStep} className="bg-blue-700 hover:bg-blue-800">
                                    Next Step
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Step 3: Emergency Contact */}
                    {currentStep === 3 && (
                        <Card className="max-w-5xl mx-auto">
                            <CardHeader>
                                <CardTitle>Emergency Contact</CardTitle>
                                <CardDescription>Enter emergency contact information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyContactName">
                                        Emergency Contact Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="emergencyContactName"
                                        name="emergencyContactName"
                                        value={formData.emergencyContactName}
                                        onChange={handleInputChange}
                                        placeholder="Enter emergency contact name"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergencyContactRelationship">
                                        Relationship <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.emergencyContactRelationship}
                                        onValueChange={(value) => handleSelectChange("emergencyContactRelationship", value)}
                                        required
                                    >
                                        <SelectTrigger id="emergencyContactRelationship">
                                            <SelectValue placeholder="Select relationship" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Spouse">Spouse</SelectItem>
                                            <SelectItem value="Parent">Parent</SelectItem>
                                            <SelectItem value="Child">Child</SelectItem>
                                            <SelectItem value="Sibling">Sibling</SelectItem>
                                            <SelectItem value="Friend">Friend</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emergencyContactPhone">
                                        Phone Number <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="emergencyContactPhone"
                                        name="emergencyContactPhone"
                                        value={formData.emergencyContactPhone}
                                        onChange={handleInputChange}
                                        placeholder="Enter emergency contact phone"
                                        required
                                    />
                                </div>

                                <div className="space-y-4 pt-4">
                                    <h3 className="font-medium text-lg">Consent and Agreements</h3>

                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="consentToTreatment"
                                                checked={formData.consentToTreatment}
                                                onCheckedChange={(checked) => handleCheckboxChange("consentToTreatment", checked === true)}
                                                required
                                            />
                                            <label
                                                htmlFor="consentToTreatment"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                I consent to treatment <span className="text-red-500">*</span>
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-6">
                                            I voluntarily consent to receive medical and health care services provided by Sid Grace Opticals
                                            doctors, employees, and other health care providers.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="consentToShareInformation"
                                                checked={formData.consentToShareInformation}
                                                onCheckedChange={(checked) =>
                                                    handleCheckboxChange("consentToShareInformation", checked === true)
                                                }
                                                required
                                            />
                                            <label
                                                htmlFor="consentToShareInformation"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                I consent to share information <span className="text-red-500">*</span>
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-6">
                                            I authorize Sid Grace Opticals to release my medical information to insurance carriers, other
                                            medical professionals, or as required by law.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="acknowledgmentOfPrivacyPolicy"
                                                checked={formData.acknowledgmentOfPrivacyPolicy}
                                                onCheckedChange={(checked) =>
                                                    handleCheckboxChange("acknowledgmentOfPrivacyPolicy", checked === true)
                                                }
                                                required
                                            />
                                            <label
                                                htmlFor="acknowledgmentOfPrivacyPolicy"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                I acknowledge receipt of privacy policy <span className="text-red-500">*</span>
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-6">
                                            I acknowledge that I have received a copy of SidGrace Opticals' Notice of Privacy Practices.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" type="button" onClick={prevStep}>
                                    Previous
                                </Button>
                                <Button type="button" onClick={nextStep}>
                                    Review Information
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Step 4: Review and Submit */}
                    {currentStep === 4 && (
                        <Card className="max-w-5xl mx-auto">
                            <CardHeader>
                                <CardTitle>Review Information</CardTitle>
                                <CardDescription>Please review all information before submitting</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Tabs defaultValue="personal" className="w-full">
                                    <TabsList className="grid grid-cols-3 mb-4">
                                        <TabsTrigger value="personal">Personal</TabsTrigger>
                                        <TabsTrigger value="medical">Medical</TabsTrigger>
                                        <TabsTrigger value="emergency">Emergency</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="personal" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                                                <p>{formData.fullName}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
                                                <p>{formData.dob}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                                                <p>{formData.gender}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Marital Status</h3>
                                                <p>{formData.maritalStatus || "Not specified"}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                                                <p>{formData.phone}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                                                <p>{formData.email || "Not provided"}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500">Address</h3>
                                            <p>{formData.address}</p>
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentStep(1)}
                                                className="text-blue-700"
                                            >
                                                Edit Personal Information
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="medical" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Blood Type</h3>
                                                <p>{formData.bloodType || "Not specified"}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Allergies</h3>
                                                <p>{formData.allergies.filter((a) => a).join(", ") || "None"}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Chronic Conditions</h3>
                                                <p>{formData.chronicConditions.filter((c) => c).join(", ") || "None"}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Current Medications</h3>
                                                <p>{formData.currentMedications || "None"}</p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentStep(2)}
                                                className="text-blue-700"
                                            >
                                                Edit Medical Information
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="emergency" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Emergency Contact</h3>
                                                <p>{formData.emergencyContactName}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Relationship</h3>
                                                <p>{formData.emergencyContactRelationship}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                                                <p>{formData.emergencyContactPhone}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2">
                                            <h3 className="text-sm font-medium text-gray-500">Consents</h3>
                                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                                <li className={formData.consentToTreatment ? "text-green-600" : "text-red-600"}>
                                                    {formData.consentToTreatment ? "Consented to treatment" : "Consent to treatment required"}
                                                </li>
                                                <li className={formData.consentToShareInformation ? "text-green-600" : "text-red-600"}>
                                                    {formData.consentToShareInformation
                                                        ? "Consented to share information"
                                                        : "Consent to share information required"}
                                                </li>
                                                <li className={formData.acknowledgmentOfPrivacyPolicy ? "text-green-600" : "text-red-600"}>
                                                    {formData.acknowledgmentOfPrivacyPolicy
                                                        ? "Acknowledged privacy policy"
                                                        : "Privacy policy acknowledgment required"}
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentStep(3)}
                                                className="text-blue-700"
                                            >
                                                Edit Emergency Information
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" type="button" onClick={prevStep}>
                                    Previous
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        !formData.consentToTreatment ||
                                        !formData.consentToShareInformation ||
                                        !formData.acknowledgmentOfPrivacyPolicy
                                    }
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {type === "create" ? "Registering..." : "Updating..."}
                                        </>
                                    ) : (
                                        <>
                                            {type === "create" ? "Register Patient" : "Update Patient"}
                                            <Check className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </form>
            </div>
        </div>
    )
}
