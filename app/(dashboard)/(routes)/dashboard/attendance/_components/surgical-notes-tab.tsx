"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Stethoscope, Save } from "lucide-react"

interface SurgicalNotesData {
    surgicalNote: string
    procedureDate?: string
    surgeon?: string
    assistants?: string
}

interface SurgicalNotesTabProps {
    initialData?: SurgicalNotesData
    onSave?: (data: SurgicalNotesData) => void
    readOnly?: boolean
}

export default function SurgicalNotesTab({ initialData, onSave, readOnly = false }: SurgicalNotesTabProps) {
    const [notesData, setNotesData] = useState<SurgicalNotesData>(
        initialData || {
            surgicalNote: "",
            procedureDate: new Date().toISOString().split("T")[0],
            surgeon: "",
            assistants: "",
        },
    )

    const handleChange = (field: keyof SurgicalNotesData, value: string) => {
        setNotesData((prev) => ({ ...prev, [field]: value }))
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
                        <Stethoscope className="h-5 w-5 inline mr-2" />
                        Surgical Notes
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
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Procedure Date</Label>
                            <Input
                                disabled={readOnly}
                                type="date"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={notesData.procedureDate || ""}
                                onChange={(e) => handleChange("procedureDate", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label className="dark:text-gray-300 font-medium">Surgeon</Label>
                            <Input
                                disabled={readOnly}
                                placeholder="Enter surgeon's name"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={notesData.surgeon || ""}
                                onChange={(e) => handleChange("surgeon", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label className="dark:text-gray-300 font-medium">Assistants</Label>
                            <Input
                                disabled={readOnly}
                                placeholder="Enter assistants' names"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={notesData.assistants || ""}
                                onChange={(e) => handleChange("assistants", e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Surgical Notes</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter detailed surgical notes"
                            className="mt-2 min-h-[300px] dark:bg-gray-700 dark:text-gray-300"
                            value={notesData.surgicalNote}
                            onChange={(e) => handleChange("surgicalNote", e.target.value)}
                        />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Surgical Note Guide</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Pre-operative Diagnosis</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document the diagnosis that led to the surgical procedure.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Procedure</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document the procedure performed, including approach and technique.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Findings</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document intraoperative findings and any complications.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Post-operative Plan</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document post-operative care instructions and follow-up plan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
