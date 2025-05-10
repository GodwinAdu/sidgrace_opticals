"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
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
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Calendar, Check, ChevronRight, Loader2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"


export default function RegisterPatientPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    email: "",
    phone: "",
    alternatePhone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
    },
    // Medical Information
    bloodType: "",
    allergies: "",
    chronicConditions: "",
    currentMedications: "",
    familyHistory: "",
    // Insurance Information
    insuranceProvider: "",
    policyNumber: "",
    groupNumber: "",
    policyHolderName: "",
    policyHolderRelationship: "Self",
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    // Additional Information
    referralSource: "",
    preferredCommunication: "Email",
    preferredLanguage: "English",
    // Consent
    consentToTreatment: false,
    consentToShareInformation: false,
    acknowledgmentOfPrivacyPolicy: false,
  })

  const totalSteps = 4

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Handle nested properties like address.street
    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof typeof formData],
          [child]: value,
        },
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
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

    // Simulate API call
    try {
      // In a real app, you would send formData to your API
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log(formData, "patient form")

      toast.success("created successfully", {
        description: "Patient created Successfully"
      })

      // Redirect to the patients list
      router.push("/dashboard/patients")
    } catch (error) {
      console.log("something went wrong", error)
      toast.error("something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-3 ">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
          <div className="flex items-center">
            <Link href="/dashboard/manage-patient/patients">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="sr-only">Back to Patients</span>

              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-blue-900">Register New Patient</h1>
          </div>
        </div>

        <Separator />

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
                  {index === 0
                    ? "Personal"
                      : index === 1
                        ? "Insurance"
                        : index === 2
                          ? "Emergency"
                          : "Review"}
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
                <CardDescription>Enter the patient&#39;s personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">
                      Date of Birth <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
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
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
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
                  <Label htmlFor="address.street">
                    Street Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address.street"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    placeholder="Enter street address"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="address.city">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address.city"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address.state">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address.state"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address.zipCode">
                      ZIP Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address.zipCode"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleInputChange}
                      placeholder="Enter ZIP code"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.country">Country</Label>
                  <Select
                    value={formData.address.country}
                    onValueChange={(value) => handleSelectChange("address.country", value)}
                  >
                    <SelectTrigger id="address.country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      {/* Add more countries as needed */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredLanguage">Preferred Language</Label>
                  <Select
                    value={formData.preferredLanguage}
                    onValueChange={(value) => handleSelectChange("preferredLanguage", value)}
                  >
                    <SelectTrigger id="preferredLanguage">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                      {/* Add more languages as needed */}
                    </SelectContent>
                  </Select>
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


          {/* Step 3: Insurance Information */}
          {currentStep === 2 && (
            <Card className="max-w-5xl mx-auto">
              <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
                <CardDescription>Enter the patient's insurance details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Select
                    value={formData.insuranceProvider}
                    onValueChange={(value) => handleSelectChange("insuranceProvider", value)}
                  >
                    <SelectTrigger id="insuranceProvider">
                      <SelectValue placeholder="Select insurance provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blue Cross Blue Shield">Blue Cross Blue Shield</SelectItem>
                      <SelectItem value="Aetna">Aetna</SelectItem>
                      <SelectItem value="Cigna">Cigna</SelectItem>
                      <SelectItem value="UnitedHealthcare">UnitedHealthcare</SelectItem>
                      <SelectItem value="Humana">Humana</SelectItem>
                      <SelectItem value="Kaiser Permanente">Kaiser Permanente</SelectItem>
                      <SelectItem value="Medicare">Medicare</SelectItem>
                      <SelectItem value="Medicaid">Medicaid</SelectItem>
                      <SelectItem value="None">None / Self-Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="policyNumber">Policy Number</Label>
                    <Input
                      id="policyNumber"
                      name="policyNumber"
                      value={formData.policyNumber}
                      onChange={handleInputChange}
                      placeholder="Enter policy number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupNumber">Group Number</Label>
                    <Input
                      id="groupNumber"
                      name="groupNumber"
                      value={formData.groupNumber}
                      onChange={handleInputChange}
                      placeholder="Enter group number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policyHolderName">Policy Holder Name</Label>
                  <Input
                    id="policyHolderName"
                    name="policyHolderName"
                    value={formData.policyHolderName}
                    onChange={handleInputChange}
                    placeholder="Enter policy holder name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policyHolderRelationship">Relationship to Policy Holder</Label>
                  <Select
                    value={formData.policyHolderRelationship}
                    onValueChange={(value) => handleSelectChange("policyHolderRelationship", value)}
                  >
                    <SelectTrigger id="policyHolderRelationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Self">Self</SelectItem>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="insuranceCardFront">Insurance Card (Front)</Label>
                    <span className="text-xs text-gray-500">Optional</span>
                  </div>
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="insuranceCardFront"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or PDF (MAX. 2MB)</p>
                      </div>
                      <input id="insuranceCardFront" type="file" className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="insuranceCardBack">Insurance Card (Back)</Label>
                    <span className="text-xs text-gray-500">Optional</span>
                  </div>
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="insuranceCardBack"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or PDF (MAX. 2MB)</p>
                      </div>
                      <input id="insuranceCardBack" type="file" className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secondary Insurance</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="hasSecondaryInsurance" />
                    <Label htmlFor="hasSecondaryInsurance">Patient has secondary insurance</Label>
                  </div>
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

          {/* Step 4: Emergency Contact */}
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
                <Button type="button" onClick={nextStep} >
                  Review Information
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 5: Review and Submit */}
          {currentStep === 4 && (
            <Card className="max-w-5xl mx-auto">
              <CardHeader>
                <CardTitle>Review Information</CardTitle>
                <CardDescription>Please review all information before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="insurance">Insurance</TabsTrigger>
                    <TabsTrigger value="emergency">Emergency</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                        <p>
                          {formData.fullName}
                        </p>
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
                      <p>
                        {formData.address.street}, {formData.address.city}, {formData.address.state}{" "}
                        {formData.address.zipCode}, {formData.address.country}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Preferred Communication</h3>
                      <p>{formData.preferredCommunication}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Preferred Language</h3>
                      <p>{formData.preferredLanguage}</p>
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

                  <TabsContent value="insurance" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Insurance Provider</h3>
                        <p>{formData.insuranceProvider || "Not specified"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Policy Number</h3>
                        <p>{formData.policyNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Group Number</h3>
                        <p>{formData.groupNumber || "Not provided"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Policy Holder</h3>
                        <p>{formData.policyHolderName || formData.fullName}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Relationship to Policy Holder</h3>
                        <p>{formData.policyHolderRelationship}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Referral Source</h3>
                        <p>{formData.referralSource || "Not specified"}</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(3)}
                        className="text-blue-700"
                      >
                        Edit Insurance Information
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
                        onClick={() => setCurrentStep(4)}
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
                      Registering...
                    </>
                  ) : (
                    <>
                      Register Patient
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
