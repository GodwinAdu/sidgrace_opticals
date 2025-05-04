import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function AddDiagnosisPage({ params }: { params: { id: string } }) {
  const patientId = params.id

  // This would normally be fetched from a database
  const patient = {
    id: patientId,
    name: "John Smith",
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Back button and title */}
        <div className="flex items-center mb-6">
          <Link href={`/dashboard/patients/${patientId}`}>
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Patient
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-blue-900">Add Diagnosis: {patient.name}</h1>
        </div>

        <form>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis Information</CardTitle>
                <CardDescription>Enter the diagnosis details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Input id="diagnosis" placeholder="Enter diagnosis" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icd10">ICD-10 Code</Label>
                  <Input id="icd10" placeholder="e.g., H52.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosisDate">Diagnosis Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input id="diagnosisDate" type="date" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosisType">Diagnosis Type</Label>
                  <Select>
                    <SelectTrigger id="diagnosisType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="complication">Complication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select>
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
                  <Select defaultValue="active">
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="recurrent">Recurrent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Clinical Notes</CardTitle>
                  <CardDescription>Document your findings and observations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Symptoms</Label>
                    <Textarea id="symptoms" placeholder="Describe patient symptoms" className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicalFindings">Clinical Findings</Label>
                    <Textarea
                      id="clinicalFindings"
                      placeholder="Document examination findings"
                      className="min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Treatment Plan</CardTitle>
                  <CardDescription>Specify the treatment approach</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="treatment">Treatment</Label>
                    <Textarea id="treatment" placeholder="Describe the treatment plan" className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medications">Medications</Label>
                    <Textarea id="medications" placeholder="List prescribed medications" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followUp">Follow-up Plan</Label>
                    <Textarea id="followUp" placeholder="Specify follow-up instructions" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" placeholder="Any additional information" />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="addToMedicalHistory" />
                    <label
                      htmlFor="addToMedicalHistory"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Add to patient's medical history
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="createPrescription" />
                    <label
                      htmlFor="createPrescription"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Create prescription
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="scheduleFollowUp" />
                    <label
                      htmlFor="scheduleFollowUp"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Schedule follow-up appointment
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button className="bg-blue-700 hover:bg-blue-800">
                <Save className="mr-2 h-4 w-4" />
                Save Diagnosis
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
