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
    onChange?: (data: PhysicalExamData) => void
    autoSave?: boolean
    readOnly?: boolean
}

export default function PhysicalExamTab({ initialData, onSave, onChange, autoSave, readOnly = false }: PhysicalExamTabProps) {
    const [examData, setExamData] = useState<PhysicalExamData>(
        initialData || { general: "", cardiovascular: "", respiratory: "", gastrointestinal: "", nervousSystem: "" },
    )

    const handleChange = (field: keyof PhysicalExamData, value: string) => {
        const next = { ...examData, [field]: value }
        setExamData(next)
        onChange?.(next)
    }

    const handleSave = () => {
        if (onSave) onSave(examData)
    }

    const fields: { key: keyof PhysicalExamData; label: string; placeholder: string }[] = [
        { key: "general", label: "General Examination", placeholder: "Enter general examination findings" },
        { key: "cardiovascular", label: "Cardiovascular System", placeholder: "Enter cardiovascular examination findings" },
        { key: "respiratory", label: "Respiratory System", placeholder: "Enter respiratory examination findings" },
        { key: "gastrointestinal", label: "Gastrointestinal System", placeholder: "Enter gastrointestinal examination findings" },
        { key: "nervousSystem", label: "Nervous System", placeholder: "Enter neurological examination findings" },
    ]

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <Stethoscope className="h-5 w-5 inline mr-2" />
                        Physical Examination
                    </CardTitle>
                    {!readOnly && !autoSave && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Examination
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    {fields.map((f) => (
                        <div key={f.key}>
                            <Label className="dark:text-gray-300 font-medium">{f.label}</Label>
                            <Textarea
                                disabled={readOnly}
                                placeholder={f.placeholder}
                                className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                                value={examData[f.key]}
                                onChange={(e) => handleChange(f.key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}