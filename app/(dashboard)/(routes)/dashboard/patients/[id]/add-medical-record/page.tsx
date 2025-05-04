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
import { ArrowLeft, Calendar, Loader2, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { format } from "date-fns"
import { toast } from "sonner"

export default function AddMedicalRecordPage({ params }: { params: { id: string } }) {
  const patientId = params.id
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recordType, setRecordType] = useState("examination")

  // This would normally be fetched from a database
  const patient = {
    id: patientId,
    name: "John Smith",
  }

  // Form data state
  const [formData, setFormData] = useState({
    // General record information
    recordType: "examination",
    recordDate: format(new Date(), "yyyy-MM-dd"),
    doctor: "Dr. Sarah Johnson",

    // Examination data
    examination: {
      visualAcuity: {
        rightEye: "20/40",
        leftEye: "20/30",
      },
      intraocularPressure: {
        rightEye: "16",
        leftEye: "15",
      },
      findings: "",
      additionalTests: [],
    },

    // Diagnosis data
    diagnosis: {
      primaryDiagnosis: "",
      icd10Code: "",
      additionalDiagnoses: "",
      severity: "moderate",
      status: "active",
    },

    // Treatment plan
    treatment: {
      plan: "",
      medications: "",
      procedures: "",
      eyewear: "",
      followUpPeriod: "1",
      followUpUnit: "month",
    },

    // Notes
    notes: "",

    // Options
    options: {
      addToPrescription: false,
      scheduleFollowUp: false,
      sendToPatient: false,
    },
  })

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    section?: string,
    subsection?: string,
  ) => {
    const { name, value } = e.target

    if (section && subsection) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section as keyof typeof formData],
          [subsection]: {
            ...(formData[section as keyof typeof formData] as any)[subsection],
            [name]: value,
          },
        },
      })
    } else if (section) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section as keyof typeof formData],
          [name]: value,
        },
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // Handle select change
  const handleSelectChange = (value: string, section?: string, name?: string) => {
    if (section && name) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section as keyof typeof formData],
          [name]: value,
        },
      })
    } else if (name) {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean, section: string, name: string) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section as keyof typeof formData],
        [name]: checked,
      },
    })
  }

  // Toggle additional test
  const toggleAdditionalTest = (test: string) => {
    const currentTests = formData.examination.additionalTests || []

    if (currentTests.includes(test)) {
      setFormData({
        ...formData,
        examination: {
          ...formData.examination,
          additionalTests: currentTests.filter((t) => t !== test),
        },
      })
    } else {
      setFormData({
        ...formData,
        examination: {
          ...formData.examination,
          additionalTests: [...currentTests, test],
        },
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    try {
      // In a real app, you would send formData to your API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Medical record added successfully",
        description: `The medical record for ${patient.name} has been added to their file.`,
      })

      // Redirect to the patient's medical records page
      router.push(`/dashboard/patients/${patientId}/medical-records`)
    } catch (error) {
      toast({
        title: "Failed to add medical record",
        description: "There was an error adding the medical record. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Back button and title */}
        <div className="flex items-center mb-6">
          <Link href={`/dashboard/patients/${patientId}/medical-records`}>
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Medical Records
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-blue-900">Add Medical Record: {patient.name}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue={recordType} onValueChange={setRecordType} className="w-full">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="examination">Examination</TabsTrigger>
              <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
              <TabsTrigger value="treatment">Treatment Plan</TabsTrigger>
            </TabsList>

            {/* General Information Card - Always visible */}
            <Card className="mb-6 mt-6">
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>Basic information about this medical record</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recordType">Record Type</Label>
                    <Select
                      value={formData.recordType}
                      onValueChange={(value) => handleSelectChange(value, undefined, "recordType")}
                    >
                      <SelectTrigger id="recordType">
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="examination">Eye Examination</SelectItem>
                        <SelectItem value="follow-up">Follow-up Visit</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recordDate">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="recordDate"
                        name="recordDate"
                        type="date"
                        className="pl-8"
                        value={formData.recordDate}
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor</Label>
                    <Select
                      value={formData.doctor}
                      onValueChange={(value) => handleSelectChange(value, undefined, "doctor")}
                    >
                      <SelectTrigger id="doctor">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dr. Sarah Johnson">Dr. Sarah Johnson</SelectItem>
                        <SelectItem value="Dr. Michael Chen">Dr. Michael Chen</SelectItem>
                        <SelectItem value="Dr. Amara Patel">Dr. Amara Patel</SelectItem>
                        <SelectItem value="Dr. Robert Williams">Dr. Robert Williams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Examination Tab */}
            <TabsContent value="examination" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visual Measurements</CardTitle>
                  <CardDescription>Enter visual acuity and pressure measurements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium mb-3">Visual Acuity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rightEyeVA">Right Eye (OD)</Label>
                        <Input
                          id="rightEyeVA"
                          name="rightEye"
                          placeholder="e.g., 20/40"
                          value={formData.examination.visualAcuity.rightEye}
                          onChange={(e) => handleInputChange(e, "examination", "visualAcuity")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leftEyeVA">Left Eye (OS)</Label>
                        <Input
                          id="leftEyeVA"
                          name="leftEye"
                          placeholder="e.g., 20/30"
                          value={formData.examination.visualAcuity.leftEye}
                          onChange={(e) => handleInputChange(e, "examination", "visualAcuity")}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium mb-3">Intraocular Pressure (mmHg)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rightEyeIOP">Right Eye (OD)</Label>
                        <Input
                          id="rightEyeIOP"
                          name="rightEye"
                          placeholder="e.g., 16"
                          value={formData.examination.intraocularPressure.rightEye}
                          onChange={(e) => handleInputChange(e, "examination", "intraocularPressure")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leftEyeIOP">Left Eye (OS)</Label>
                        <Input
                          id="leftEyeIOP"
                          name="leftEye"
                          placeholder="e.g., 15"
                          value={formData.examination.intraocularPressure.leftEye}
                          onChange={(e) => handleInputChange(e, "examination", "intraocularPressure")}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Examination Findings</CardTitle>
                  <CardDescription>Document your examination findings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="findings">Clinical Findings</Label>
                    <Textarea
                      id="findings"
                      name="findings"
                      placeholder="Document detailed examination findings"
                      className="min-h-[150px]"
                      value={formData.examination.findings}
                      onChange={(e) => handleInputChange(e, "examination")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Tests Performed</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        "Visual Field Test",
                        "OCT Scan",
                        "Corneal Topography",
                        "Refraction",
                        "Slit Lamp Examination",
                        "Fundus Photography",
                        "Gonioscopy",
                        "Color Vision Test",
                        "Tear Film Evaluation",
                      ].map((test) => (
                        <div key={test} className="flex items-center space-x-2">
                          <Checkbox
                            id={`test-${test.replace(/\s+/g, "-").toLowerCase()}`}
                            checked={formData.examination.additionalTests.includes(test)}
                            onCheckedChange={(checked) => toggleAdditionalTest(test)}
                          />
                          <label
                            htmlFor={`test-${test.replace(/\s+/g, "-").toLowerCase()}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {test}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Diagnosis Tab */}
            <TabsContent value="diagnosis" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Diagnosis Information</CardTitle>
                  <CardDescription>Enter diagnosis details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primaryDiagnosis">Primary Diagnosis</Label>
                      <Input
                        id="primaryDiagnosis"
                        name="primaryDiagnosis"
                        placeholder="e.g., Myopia"
                        value={formData.diagnosis.primaryDiagnosis}
                        onChange={(e) => handleInputChange(e, "diagnosis")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="icd10Code">ICD-10 Code</Label>
                      <Input
                        id="icd10Code"
                        name="icd10Code"
                        placeholder="e.g., H52.1"
                        value={formData.diagnosis.icd10Code}
                        onChange={(e) => handleInputChange(e, "diagnosis")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalDiagnoses">Additional Diagnoses</Label>
                    <Textarea
                      id="additionalDiagnoses"
                      name="additionalDiagnoses"
                      placeholder="List any secondary diagnoses"
                      value={formData.diagnosis.additionalDiagnoses}
                      onChange={(e) => handleInputChange(e, "diagnosis")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="severity">Severity</Label>
                      <Select
                        value={formData.diagnosis.severity}
                        onValueChange={(value) => handleSelectChange(value, "diagnosis", "severity")}
                      >
                        <SelectTrigger id="severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.diagnosis.status}
                        onValueChange={(value) => handleSelectChange(value, "diagnosis", "status")}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="recurrent">Recurrent</SelectItem>
                          <SelectItem value="chronic">Chronic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Treatment Plan Tab */}
            <TabsContent value="treatment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Treatment Plan</CardTitle>
                  <CardDescription>Document treatment recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="plan">Treatment Plan</Label>
                    <Textarea
                      id="plan"
                      name="plan"
                      placeholder="Describe the overall treatment approach"
                      className="min-h-[100px]"
                      value={formData.treatment.plan}
                      onChange={(e) => handleInputChange(e, "treatment")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medications">Medications</Label>
                    <Textarea
                      id="medications"
                      name="medications"
                      placeholder="List prescribed medications, dosage, and instructions"
                      value={formData.treatment.medications}
                      onChange={(e) => handleInputChange(e, "treatment")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="procedures">Procedures</Label>
                    <Textarea
                      id="procedures"
                      name="procedures"
                      placeholder="Document any procedures performed or recommended"
                      value={formData.treatment.procedures}
                      onChange={(e) => handleInputChange(e, "treatment")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eyewear">Eyewear Recommendations</Label>
                    <Textarea
                      id="eyewear"
                      name="eyewear"
                      placeholder="Specify any eyewear recommendations (glasses, contacts, etc.)"
                      value={formData.treatment.eyewear}
                      onChange={(e) => handleInputChange(e, "treatment")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="followUpPeriod">Follow-up in</Label>
                      <Input
                        id="followUpPeriod"
                        name="followUpPeriod"
                        type="number"
                        min="1"
                        max="24"
                        value={formData.treatment.followUpPeriod}
                        onChange={(e) => handleInputChange(e, "treatment")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="followUpUnit">Period</Label>
                      <Select
                        value={formData.treatment.followUpUnit}
                        onValueChange={(value) => handleSelectChange(value, "treatment", "followUpUnit")}
                      >
                        <SelectTrigger id="followUpUnit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day(s)</SelectItem>
                          <SelectItem value="week">Week(s)</SelectItem>
                          <SelectItem value="month">Month(s)</SelectItem>
                          <SelectItem value="year">Year(s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Additional Information (Common to all tabs) */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Enter any additional notes or information"
                  value={formData.notes}
                  onChange={(e) => handleInputChange(e)}
                />
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addToPrescription"
                      checked={formData.options.addToPrescription}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(checked === true, "options", "addToPrescription")
                      }
                    />
                    <label
                      htmlFor="addToPrescription"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Create prescription based on this record
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scheduleFollowUp"
                      checked={formData.options.scheduleFollowUp}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(checked === true, "options", "scheduleFollowUp")
                      }
                    />
                    <label
                      htmlFor="scheduleFollowUp"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Schedule follow-up appointment
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendToPatient"
                      checked={formData.options.sendToPatient}
                      onCheckedChange={(checked) => handleCheckboxChange(checked === true, "options", "sendToPatient")}
                    />
                    <label
                      htmlFor="sendToPatient"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send a copy to patient via email
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-700 hover:bg-blue-800" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Medical Record
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
