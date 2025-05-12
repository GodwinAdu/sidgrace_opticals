"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ClipboardList, Save } from "lucide-react"

interface DoctorNotesData {
    doctorNote: string
}

interface DoctorNotesTabProps {
    initialData?: DoctorNotesData
    onSave?: (data: DoctorNotesData) => void
    readOnly?: boolean
}

export default function DoctorNotesTab({ initialData, onSave, readOnly = false }: DoctorNotesTabProps) {
    const [notesData, setNotesData] = useState<DoctorNotesData>(
        initialData || {
            doctorNote: "",
        },
    )

    const handleChange = (value: string) => {
        setNotesData({ doctorNote: value })
    }

    const handleSave = () => {
        if (onSave) {
            onSave(notesData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <ClipboardList className="h-5 w-5 inline mr-2" />
                        Doctor&#39;s Notes
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Notes
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-4">
                    <Label className="dark:text-gray-300 font-medium">Clinical Notes</Label>
                    <Textarea
                        disabled={readOnly}
                        placeholder="Enter detailed clinical notes, observations, and recommendations"
                        className="min-h-[300px] dark:bg-gray-700 dark:text-gray-300"
                        value={notesData.doctorNote}
                        onChange={(e) => handleChange(e.target.value)}
                    />

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">SOAP Format Guide</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">S - Subjective</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document the patient&#39;s symptoms, complaints, and history as described by the patient.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">O - Objective</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document measurable, observable data such as vital signs, examination findings, and test results.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">A - Assessment</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document your diagnosis, interpretation of the findings, and clinical reasoning.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">P - Plan</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document treatment plans, medications, procedures, patient education, and follow-up instructions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
