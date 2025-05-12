"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FileText, Save } from "lucide-react"

interface HistoryData {
    presentingComplaints: string
    pastMedicalHistory: string
    familyHistory: string
    drugHistory: string
}

interface HistoryTabProps {
    initialData?: HistoryData
    onSave?: (data: HistoryData) => void
    readOnly?: boolean
}

export default function HistoryTab({ initialData, onSave, readOnly = false }: HistoryTabProps) {
    const [historyData, setHistoryData] = useState<HistoryData>(
        initialData || {
            presentingComplaints: "",
            pastMedicalHistory: "",
            familyHistory: "",
            drugHistory: "",
        },
    )

    const handleChange = (field: keyof HistoryData, value: string) => {
        setHistoryData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(historyData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <FileText className="h-5 w-5 inline mr-2" />
                        Patient History
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save History
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div>
                        <Label className="dark:text-gray-300 font-medium">Presenting Complaints</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter patient's presenting complaints"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={historyData.presentingComplaints}
                            onChange={(e) => handleChange("presentingComplaints", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Past Medical History</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter patient's past medical history"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={historyData.pastMedicalHistory}
                            onChange={(e) => handleChange("pastMedicalHistory", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Family History</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter patient's family history"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={historyData.familyHistory}
                            onChange={(e) => handleChange("familyHistory", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Drug History</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter patient's drug history"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={historyData.drugHistory}
                            onChange={(e) => handleChange("drugHistory", e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
