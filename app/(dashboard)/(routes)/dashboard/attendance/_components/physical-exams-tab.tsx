"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Stethoscope, Save } from "lucide-react"

interface PhysicalExamData {
    general: string
    cardiovascular: string
    respiratory: string
    gastrointestinal: string
    nervousSystem: string
}

interface PhysicalExamTabProps {
    initialData?: PhysicalExamData
    onSave?: (data: PhysicalExamData) => void
    readOnly?: boolean
}

export default function PhysicalExamTab({ initialData, onSave, readOnly = false }: PhysicalExamTabProps) {
    const [examData, setExamData] = useState<PhysicalExamData>(
        initialData || {
            general: "",
            cardiovascular: "",
            respiratory: "",
            gastrointestinal: "",
            nervousSystem: "",
        },
    )

    const handleChange = (field: keyof PhysicalExamData, value: string) => {
        setExamData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(examData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <Stethoscope className="h-5 w-5 inline mr-2" />
                        Physical Examination
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Examination
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div>
                        <Label className="dark:text-gray-300 font-medium">General Examination</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter general examination findings"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={examData.general}
                            onChange={(e) => handleChange("general", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Cardiovascular System</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter cardiovascular examination findings"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={examData.cardiovascular}
                            onChange={(e) => handleChange("cardiovascular", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Respiratory System</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter respiratory examination findings"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={examData.respiratory}
                            onChange={(e) => handleChange("respiratory", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Gastrointestinal System</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter gastrointestinal examination findings"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={examData.gastrointestinal}
                            onChange={(e) => handleChange("gastrointestinal", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Nervous System</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter neurological examination findings"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={examData.nervousSystem}
                            onChange={(e) => handleChange("nervousSystem", e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
