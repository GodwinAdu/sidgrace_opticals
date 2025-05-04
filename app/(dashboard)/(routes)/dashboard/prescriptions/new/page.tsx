"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import {
  ArrowLeft,
  ChevronRight,
  Search,
  User,
  Download,
  Printer,
  Share2,
  Plus,
  Trash2,
  Check,
  Loader2,
} from "lucide-react"

export default function NewPrescriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get("patient")
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prescriptionType, setPrescriptionType] = useState("eyeglasses")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("prescription")
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureImage, setSignatureImage] = useState<string | null>(null)

  // Mock data for patients
  const patients = [
    { id: "SGO-P1001", name: "John Smith", age: 45, lastVisit: "2023-04-15" },
    { id: "SGO-P1002", name: "Emily Johnson", age: 32, lastVisit: "2023-04-28" },
    { id: "SGO-P1003", name: "Michael Brown", age: 58, lastVisit: "2023-04-10" },
    { id: "SGO-P1004", name: "Sarah Williams", age: 27, lastVisit: "2023-04-22" },
    { id: "SGO-P1005", name: "Robert Davis", age: 62, lastVisit: "2023-03-30" },
  ]

  // Filter patients based on search query
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Find patient if patientId is provided
  const selectedPatient = patientId ? patients.find((p) => p.id === patientId) : null

  // Form state for eyeglasses prescription
  const [eyeglassesPrescription, setEyeglassesPrescription] = useState({
    rightEye: {
      sphere: "-2.25",
      cylinder: "-0.50",
      axis: "180",
      add: "+1.00",
      pd: "32",
    },
    leftEye: {
      sphere: "-2.00",
      cylinder: "-0.75",
      axis: "175",
      add: "+1.00",
      pd: "32",
    },
    notes: "Progressive lenses recommended. Blue light filtering coating advised for computer work.",
    validityPeriod: "12",
    lensRecommendations: ["Anti-reflective coating", "Blue light filtering", "Progressive lenses"],
  })

  // Form state for contact lenses prescription
  const [contactLensesPrescription, setContactLensesPrescription] = useState({
    rightEye: {
      power: "-2.25",
      baseCurve: "8.6",
      diameter: "14.2",
      brand: "Acuvue Oasys",
    },
    leftEye: {
      power: "-2.00",
      baseCurve: "8.6",
      diameter: "14.2",
      brand: "Acuvue Oasys",
    },
    notes: "Patient advised on proper lens care and hygiene. Follow up in 3 months.",
    validityPeriod: "12",
    lensType: "soft",
    replacementSchedule: "monthly",
  })

  // Form state for medication prescription
  const [medicationPrescription, setMedicationPrescription] = useState({
    medications: [
      {
        name: "Pataday (Olopatadine 0.2%)",
        dosage: "1 drop",
        frequency: "twice daily",
        duration: "4 weeks",
        instructions: "Apply one drop in each eye twice daily",
      },
    ],
    notes: "For allergic conjunctivitis. Discontinue use and contact doctor if irritation worsens.",
    validityPeriod: "1",
  })

  const handleEyeglassesChange = (eye: "rightEye" | "leftEye", field: string, value: string) => {
    setEyeglassesPrescription({
      ...eyeglassesPrescription,
      [eye]: {
        ...eyeglassesPrescription[eye],
        [field]: value,
      },
    })
  }

  const handleContactLensesChange = (eye: "rightEye" | "leftEye", field: string, value: string) => {
    setContactLensesPrescription({
      ...contactLensesPrescription,
      [eye]: {
        ...contactLensesPrescription[eye],
        [field]: value,
      },
    })
  }

  const handleMedicationChange = (index: number, field: string, value: string) => {
    const updatedMedications = [...medicationPrescription.medications]
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value,
    }

    setMedicationPrescription({
      ...medicationPrescription,
      medications: updatedMedications,
    })
  }

  const addMedication = () => {
    setMedicationPrescription({
      ...medicationPrescription,
      medications: [
        ...medicationPrescription.medications,
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
        },
      ],
    })
  }

  const removeMedication = (index: number) => {
    if (medicationPrescription.medications.length > 1) {
      const updatedMedications = [...medicationPrescription.medications]
      updatedMedications.splice(index, 1)

      setMedicationPrescription({
        ...medicationPrescription,
        medications: updatedMedications,
      })
    }
  }

  const toggleLensRecommendation = (recommendation: string) => {
    const currentRecommendations = eyeglassesPrescription.lensRecommendations || []

    if (currentRecommendations.includes(recommendation)) {
      setEyeglassesPrescription({
        ...eyeglassesPrescription,
        lensRecommendations: currentRecommendations.filter((r) => r !== recommendation),
      })
    } else {
      setEyeglassesPrescription({
        ...eyeglassesPrescription,
        lensRecommendations: [...currentRecommendations, recommendation],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    try {
      // In a real app, you would send prescription data to your API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Prescription created successfully",
        description: `Prescription for ${selectedPatient?.name || "patient"} has been created.`,
      })

      // Redirect to the prescriptions list or patient details
      if (patientId) {
        router.push(`/dashboard/patients/${patientId}`)
      } else {
        router.push("/dashboard/prescriptions")
      }
    } catch (error) {
      toast({
        title: "Failed to create prescription",
        description: "There was an error creating the prescription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Download Started",
      description: "Your prescription PDF is being generated and will download shortly.",
    })
  }

  const handleShare = () => {
    toast({
      title: "Share Options",
      description: "Sharing options will appear here in the production version.",
    })
  }

  const generateQRCode = () => {
    // In a real app, this would generate a QR code with prescription details
    return "/digital-prescription-qr.png"
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <Link href={patientId ? `/dashboard/patients/${patientId}` : "/dashboard/prescriptions"}>
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {patientId ? "Back to Patient" : "Back to Prescriptions"}
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-blue-900">Create New Prescription</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
                <CardDescription>Select or search for a patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                        {selectedPatient.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium">{selectedPatient.name}</h3>
                        <p className="text-sm text-gray-500">
                          ID: {selectedPatient.id} • Age: {selectedPatient.age}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Last Visit: {selectedPatient.lastVisit}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/dashboard/patients/${selectedPatient.id}`)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      View Patient Details
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-blue-700"
                      onClick={() => router.push("/dashboard/prescriptions/new")}
                    >
                      Change Patient
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder="Search patients by name or ID..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                            onClick={() => router.push(`/dashboard/prescriptions/new?patient=${patient.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                {patient.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-medium">{patient.name}</h3>
                                <p className="text-xs text-gray-500">
                                  ID: {patient.id} • Age: {patient.age}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No patients found. Try a different search term.
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Can't find the patient?</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push("/dashboard/patients/new")}
                      >
                        Register New Patient
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Middle and Right Columns - Prescription Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Prescription Details</CardTitle>
                <CardDescription>Enter prescription information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="prescription">Prescription</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>

                  <TabsContent value="prescription" className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="prescriptionType">
                          Prescription Type <span className="text-red-500">*</span>
                        </Label>
                        <Select value={prescriptionType} onValueChange={setPrescriptionType} required>
                          <SelectTrigger id="prescriptionType">
                            <SelectValue placeholder="Select prescription type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eyeglasses">Eyeglasses</SelectItem>
                            <SelectItem value="contactlenses">Contact Lenses</SelectItem>
                            <SelectItem value="medication">Medication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Eyeglasses Prescription Form */}
                      {prescriptionType === "eyeglasses" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-4">Eyeglasses Prescription</h3>

                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Eye</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Sphere (SPH)</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Cylinder (CYL)</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Axis</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Add</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">PD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Right (OD)</td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.rightEye.sphere}
                                        onChange={(e) => handleEyeglassesChange("rightEye", "sphere", e.target.value)}
                                        placeholder="e.g., -2.25"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.rightEye.cylinder}
                                        onChange={(e) => handleEyeglassesChange("rightEye", "cylinder", e.target.value)}
                                        placeholder="e.g., -0.50"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.rightEye.axis}
                                        onChange={(e) => handleEyeglassesChange("rightEye", "axis", e.target.value)}
                                        placeholder="e.g., 180"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.rightEye.add}
                                        onChange={(e) => handleEyeglassesChange("rightEye", "add", e.target.value)}
                                        placeholder="e.g., +1.00"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.rightEye.pd}
                                        onChange={(e) => handleEyeglassesChange("rightEye", "pd", e.target.value)}
                                        placeholder="e.g., 32"
                                        className="h-8"
                                      />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Left (OS)</td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.leftEye.sphere}
                                        onChange={(e) => handleEyeglassesChange("leftEye", "sphere", e.target.value)}
                                        placeholder="e.g., -2.00"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.leftEye.cylinder}
                                        onChange={(e) => handleEyeglassesChange("leftEye", "cylinder", e.target.value)}
                                        placeholder="e.g., -0.75"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.leftEye.axis}
                                        onChange={(e) => handleEyeglassesChange("leftEye", "axis", e.target.value)}
                                        placeholder="e.g., 175"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.leftEye.add}
                                        onChange={(e) => handleEyeglassesChange("leftEye", "add", e.target.value)}
                                        placeholder="e.g., +1.00"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={eyeglassesPrescription.leftEye.pd}
                                        onChange={(e) => handleEyeglassesChange("leftEye", "pd", e.target.value)}
                                        placeholder="e.g., 32"
                                        className="h-8"
                                      />
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="eyeglasses-notes">Notes & Recommendations</Label>
                            <Textarea
                              id="eyeglasses-notes"
                              value={eyeglassesPrescription.notes}
                              onChange={(e) =>
                                setEyeglassesPrescription({ ...eyeglassesPrescription, notes: e.target.value })
                              }
                              placeholder="Enter any additional notes or recommendations"
                              className="min-h-[100px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="eyeglasses-validity">Validity Period</Label>
                            <Select
                              value={eyeglassesPrescription.validityPeriod}
                              onValueChange={(value) =>
                                setEyeglassesPrescription({ ...eyeglassesPrescription, validityPeriod: value })
                              }
                            >
                              <SelectTrigger id="eyeglasses-validity">
                                <SelectValue placeholder="Select validity period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="12">1 year</SelectItem>
                                <SelectItem value="24">2 years</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Lens Recommendations</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[
                                "Anti-reflective coating",
                                "Blue light filtering",
                                "Photochromic lenses",
                                "Polycarbonate lenses",
                                "Progressive lenses",
                                "Scratch-resistant coating",
                                "UV protection",
                              ].map((option) => (
                                <div key={option} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`option-${option}`}
                                    checked={(eyeglassesPrescription.lensRecommendations || []).includes(option)}
                                    onCheckedChange={() => toggleLensRecommendation(option)}
                                  />
                                  <label
                                    htmlFor={`option-${option}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contact Lenses Prescription Form */}
                      {prescriptionType === "contactlenses" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-4">Contact Lenses Prescription</h3>

                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Eye</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Power</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Base Curve</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Diameter</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Brand</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Right (OD)</td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.rightEye.power}
                                        onChange={(e) => handleContactLensesChange("rightEye", "power", e.target.value)}
                                        placeholder="e.g., -2.25"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.rightEye.baseCurve}
                                        onChange={(e) =>
                                          handleContactLensesChange("rightEye", "baseCurve", e.target.value)
                                        }
                                        placeholder="e.g., 8.6"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.rightEye.diameter}
                                        onChange={(e) =>
                                          handleContactLensesChange("rightEye", "diameter", e.target.value)
                                        }
                                        placeholder="e.g., 14.2"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.rightEye.brand}
                                        onChange={(e) => handleContactLensesChange("rightEye", "brand", e.target.value)}
                                        placeholder="e.g., Acuvue"
                                        className="h-8"
                                      />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Left (OS)</td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.leftEye.power}
                                        onChange={(e) => handleContactLensesChange("leftEye", "power", e.target.value)}
                                        placeholder="e.g., -2.00"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.leftEye.baseCurve}
                                        onChange={(e) =>
                                          handleContactLensesChange("leftEye", "baseCurve", e.target.value)
                                        }
                                        placeholder="e.g., 8.6"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.leftEye.diameter}
                                        onChange={(e) =>
                                          handleContactLensesChange("leftEye", "diameter", e.target.value)
                                        }
                                        placeholder="e.g., 14.2"
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="border px-4 py-2">
                                      <Input
                                        value={contactLensesPrescription.leftEye.brand}
                                        onChange={(e) => handleContactLensesChange("leftEye", "brand", e.target.value)}
                                        placeholder="e.g., Acuvue"
                                        className="h-8"
                                      />
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="contactlenses-notes">Notes & Recommendations</Label>
                            <Textarea
                              id="contactlenses-notes"
                              value={contactLensesPrescription.notes}
                              onChange={(e) =>
                                setContactLensesPrescription({ ...contactLensesPrescription, notes: e.target.value })
                              }
                              placeholder="Enter any additional notes or recommendations"
                              className="min-h-[100px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="contactlenses-validity">Validity Period</Label>
                            <Select
                              value={contactLensesPrescription.validityPeriod}
                              onValueChange={(value) =>
                                setContactLensesPrescription({ ...contactLensesPrescription, validityPeriod: value })
                              }
                            >
                              <SelectTrigger id="contactlenses-validity">
                                <SelectValue placeholder="Select validity period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="12">1 year</SelectItem>
                                <SelectItem value="24">2 years</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Contact Lens Type</Label>
                            <RadioGroup
                              value={contactLensesPrescription.lensType}
                              onValueChange={(value) =>
                                setContactLensesPrescription({ ...contactLensesPrescription, lensType: value })
                              }
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="soft" id="lens-soft" />
                                <Label htmlFor="lens-soft">Soft Contact Lenses</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rigid" id="lens-rigid" />
                                <Label htmlFor="lens-rigid">Rigid Gas Permeable (RGP)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="hybrid" id="lens-hybrid" />
                                <Label htmlFor="lens-hybrid">Hybrid Contact Lenses</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="space-y-2">
                            <Label>Replacement Schedule</Label>
                            <RadioGroup
                              value={contactLensesPrescription.replacementSchedule}
                              onValueChange={(value) =>
                                setContactLensesPrescription({
                                  ...contactLensesPrescription,
                                  replacementSchedule: value,
                                })
                              }
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="daily" id="schedule-daily" />
                                <Label htmlFor="schedule-daily">Daily Disposable</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="biweekly" id="schedule-biweekly" />
                                <Label htmlFor="schedule-biweekly">Bi-weekly</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="monthly" id="schedule-monthly" />
                                <Label htmlFor="schedule-monthly">Monthly</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="quarterly" id="schedule-quarterly" />
                                <Label htmlFor="schedule-quarterly">Quarterly</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="annual" id="schedule-annual" />
                                <Label htmlFor="schedule-annual">Annual</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      )}

                      {/* Medication Prescription Form */}
                      {prescriptionType === "medication" && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-4">Medication Prescription</h3>

                            {medicationPrescription.medications.map((medication, index) => (
                              <div key={index} className="mb-6 p-4 border rounded-md bg-gray-50">
                                <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-medium">Medication #{index + 1}</h4>
                                  {medicationPrescription.medications.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeMedication(index)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`medication-name-${index}`}>Medication Name</Label>
                                    <Input
                                      id={`medication-name-${index}`}
                                      value={medication.name}
                                      onChange={(e) => handleMedicationChange(index, "name", e.target.value)}
                                      placeholder="Enter medication name"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`medication-dosage-${index}`}>Dosage</Label>
                                      <Input
                                        id={`medication-dosage-${index}`}
                                        value={medication.dosage}
                                        onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
                                        placeholder="e.g., 1 drop"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor={`medication-frequency-${index}`}>Frequency</Label>
                                      <Input
                                        id={`medication-frequency-${index}`}
                                        value={medication.frequency}
                                        onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)}
                                        placeholder="e.g., twice daily"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor={`medication-duration-${index}`}>Duration</Label>
                                      <Input
                                        id={`medication-duration-${index}`}
                                        value={medication.duration}
                                        onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
                                        placeholder="e.g., 4 weeks"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`medication-instructions-${index}`}>Instructions</Label>
                                    <Textarea
                                      id={`medication-instructions-${index}`}
                                      value={medication.instructions}
                                      onChange={(e) => handleMedicationChange(index, "instructions", e.target.value)}
                                      placeholder="Enter detailed instructions"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            <Button type="button" variant="outline" onClick={addMedication} className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Another Medication
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="medication-notes">Notes & Special Instructions</Label>
                            <Textarea
                              id="medication-notes"
                              value={medicationPrescription.notes}
                              onChange={(e) =>
                                setMedicationPrescription({ ...medicationPrescription, notes: e.target.value })
                              }
                              placeholder="Enter any additional notes or special instructions"
                              className="min-h-[100px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="medication-validity">Validity Period</Label>
                            <Select
                              value={medicationPrescription.validityPeriod}
                              onValueChange={(value) =>
                                setMedicationPrescription({ ...medicationPrescription, validityPeriod: value })
                              }
                            >
                              <SelectTrigger id="medication-validity">
                                <SelectValue placeholder="Select validity period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 month</SelectItem>
                                <SelectItem value="3">3 months</SelectItem>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="12">1 year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Advanced Prescription Preview */}
                  <TabsContent value="preview" className="space-y-6">
                    <div className="flex justify-end space-x-2 print:hidden">
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>

                    <div className="border rounded-lg p-8 bg-white shadow-sm">
                      {/* Prescription Header */}
                      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-6 mb-6">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                          <div className="w-16 h-16 relative">
                            <Image
                              src="/abstract-sg.png"
                              alt="Sid Grace Opticals Logo"
                              width={64}
                              height={64}
                              className="rounded-full"
                            />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-blue-900">Sid Grace Opticals</h2>
                            <p className="text-gray-500">Advanced Eye Care Hospital</p>
                            <p className="text-sm text-gray-500">123 Vision Street, Medical District, City</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Prescription ID: RX-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}
                          </div>
                          <div className="text-sm text-gray-500">Date: {format(new Date(), "PPP")}</div>
                          <div className="text-sm text-gray-500">Doctor: Dr. Sarah Johnson</div>
                        </div>
                      </div>

                      {/* Patient Information */}
                      <div className="mb-6 pb-6 border-b">
                        <h3 className="text-lg font-medium mb-3">Patient Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium">{selectedPatient ? selectedPatient.name : "Patient Name"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Patient ID</p>
                            <p className="font-medium">{selectedPatient ? selectedPatient.id : "Patient ID"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Age</p>
                            <p className="font-medium">{selectedPatient ? selectedPatient.age : "Patient Age"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Prescription Content */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium">
                            {prescriptionType === "eyeglasses"
                              ? "Eyeglasses Prescription"
                              : prescriptionType === "contactlenses"
                                ? "Contact Lenses Prescription"
                                : "Medication Prescription"}
                          </h3>
                          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Valid for:{" "}
                            {prescriptionType === "eyeglasses"
                              ? `${eyeglassesPrescription.validityPeriod} months`
                              : prescriptionType === "contactlenses"
                                ? `${contactLensesPrescription.validityPeriod} months`
                                : `${medicationPrescription.validityPeriod} months`}
                          </div>
                        </div>

                        {/* Eyeglasses Prescription Preview */}
                        {prescriptionType === "eyeglasses" && (
                          <div className="space-y-4">
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Eye</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Sphere (SPH)</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Cylinder (CYL)</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Axis</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Add</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">PD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Right (OD)</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.rightEye.sphere}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.rightEye.cylinder}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.rightEye.axis}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.rightEye.add}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.rightEye.pd}</td>
                                  </tr>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Left (OS)</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.leftEye.sphere}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.leftEye.cylinder}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.leftEye.axis}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.leftEye.add}</td>
                                    <td className="border px-4 py-2">{eyeglassesPrescription.leftEye.pd}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {eyeglassesPrescription.lensRecommendations &&
                              eyeglassesPrescription.lensRecommendations.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-blue-900 mb-2">Lens Recommendations</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {eyeglassesPrescription.lensRecommendations.map((rec, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
                                      >
                                        {rec}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {eyeglassesPrescription.notes && (
                              <div>
                                <h4 className="font-medium text-blue-900 mb-2">Notes & Recommendations</h4>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                                  {eyeglassesPrescription.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contact Lenses Prescription Preview */}
                        {prescriptionType === "contactlenses" && (
                          <div className="space-y-4">
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Eye</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Power</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Base Curve</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Diameter</th>
                                    <th className="border px-4 py-2 bg-gray-50 text-left">Brand</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Right (OD)</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.rightEye.power}</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.rightEye.baseCurve}</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.rightEye.diameter}</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.rightEye.brand}</td>
                                  </tr>
                                  <tr>
                                    <td className="border px-4 py-2 font-medium">Left (OS)</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.leftEye.power}</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.leftEye.baseCurve}</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.leftEye.diameter}</td>
                                    <td className="border px-4 py-2">{contactLensesPrescription.leftEye.brand}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium text-blue-900 mb-2">Lens Type</h4>
                                <p className="text-gray-700">
                                  {contactLensesPrescription.lensType === "soft"
                                    ? "Soft Contact Lenses"
                                    : contactLensesPrescription.lensType === "rigid"
                                      ? "Rigid Gas Permeable (RGP)"
                                      : "Hybrid Contact Lenses"}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-blue-900 mb-2">Replacement Schedule</h4>
                                <p className="text-gray-700">
                                  {contactLensesPrescription.replacementSchedule === "daily"
                                    ? "Daily Disposable"
                                    : contactLensesPrescription.replacementSchedule === "biweekly"
                                      ? "Bi-weekly"
                                      : contactLensesPrescription.replacementSchedule === "monthly"
                                        ? "Monthly"
                                        : contactLensesPrescription.replacementSchedule === "quarterly"
                                          ? "Quarterly"
                                          : "Annual"}
                                </p>
                              </div>
                            </div>

                            {contactLensesPrescription.notes && (
                              <div>
                                <h4 className="font-medium text-blue-900 mb-2">Notes & Recommendations</h4>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                                  {contactLensesPrescription.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Medication Prescription Preview */}
                        {prescriptionType === "medication" && (
                          <div className="space-y-4">
                            {medicationPrescription.medications.map((medication, index) => (
                              <div key={index} className="border rounded-md p-4">
                                <h4 className="font-medium text-blue-900 mb-2">Medication #{index + 1}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-gray-500">Name</p>
                                    <p className="font-medium">{medication.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Dosage</p>
                                    <p className="font-medium">{medication.dosage}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Frequency</p>
                                    <p className="font-medium">{medication.frequency}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Duration</p>
                                    <p className="font-medium">{medication.duration}</p>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500">Instructions</p>
                                  <p className="text-gray-700">{medication.instructions}</p>
                                </div>
                              </div>
                            ))}

                            {medicationPrescription.notes && (
                              <div>
                                <h4 className="font-medium text-blue-900 mb-2">Notes & Special Instructions</h4>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                                  {medicationPrescription.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Digital Verification */}
                      <div className="flex flex-col md:flex-row justify-between items-center border-t pt-6">
                        <div className="mb-4 md:mb-0">
                          <h4 className="font-medium text-blue-900 mb-2">Digital Verification</h4>
                          <p className="text-sm text-gray-500">Scan the QR code to verify this prescription</p>
                          <div className="mt-2">
                            <Image
                              src={generateQRCode() || "/placeholder.svg"}
                              alt="Prescription QR Code"
                              width={100}
                              height={100}
                            />
                          </div>
                        </div>

                        <div className="text-center md:text-right">
                          <div className="mb-2">
                            <Image src="/medical-professional-signature.png" alt="Doctor Signature" width={150} height={60} />
                          </div>
                          <p className="font-medium">Dr. Sarah Johnson</p>
                          <p className="text-sm text-gray-500">Ophthalmologist</p>
                          <p className="text-sm text-gray-500">License #: MED-12345</p>
                        </div>
                      </div>

                      {/* Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
                        <div className="text-9xl font-bold text-black rotate-[-30deg] whitespace-nowrap">
                          SID GRACE OPTICALS
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-700 hover:bg-blue-800"
                  disabled={isSubmitting || !selectedPatient}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Prescription...
                    </>
                  ) : (
                    <>
                      Create Prescription
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}
