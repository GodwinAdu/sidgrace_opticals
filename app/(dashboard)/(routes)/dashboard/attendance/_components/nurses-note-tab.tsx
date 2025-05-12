"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ClipboardList, Save } from "lucide-react"

interface NurseNotesData {
    nurseNote: string
}

interface NurseNotesTabProps {
    initialData?: NurseNotesData
    onSave?: (data: NurseNotesData) => void
    readOnly?: boolean
}

export default function NurseNotesTab({ initialData, onSave, readOnly = false }: NurseNotesTabProps) {
    const [notesData, setNotesData] = useState<NurseNotesData>(
        initialData || {
            nurseNote: "",
        },
    )

    const handleChange = (value: string) => {
        setNotesData({ nurseNote: value })
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
                        Nurse&#39;s Notes
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
                    <Label className="dark:text-gray-300 font-medium">Nursing Notes</Label>
                    <Textarea
                        disabled={readOnly}
                        placeholder="Enter nursing observations, interventions, and patient responses"
                        className="min-h-[300px] dark:bg-gray-700 dark:text-gray-300"
                        value={notesData.nurseNote}
                        onChange={(e) => handleChange(e.target.value)}
                    />

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Nursing Documentation Guide</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Assessment</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document patient assessment findings, including vital signs and general condition.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Interventions</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document nursing interventions, procedures performed, and medications administered.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Response</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document patient&#39;s response to interventions and any changes in condition.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Education</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document patient education provided and patient&#39;s understanding.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
