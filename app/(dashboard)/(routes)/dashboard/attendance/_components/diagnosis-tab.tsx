"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Plus, Save, X } from "lucide-react"

interface DiagnosisData {
    primary: string
    secondary: string[]
}

interface DiagnosisTabProps {
    initialData?: DiagnosisData
    onSave?: (data: DiagnosisData) => void
    readOnly?: boolean
}

export default function DiagnosisTab({ initialData, onSave, readOnly = false }: DiagnosisTabProps) {
    const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>(
        initialData || {
            primary: "",
            secondary: [],
        },
    )
    const [newSecondary, setNewSecondary] = useState("")

    const handlePrimaryChange = (value: string) => {
        setDiagnosisData((prev) => ({ ...prev, primary: value }))
    }

    const addSecondaryDiagnosis = () => {
        if (newSecondary.trim()) {
            setDiagnosisData((prev) => ({
                ...prev,
                secondary: [...prev.secondary, newSecondary.trim()],
            }))
            setNewSecondary("")
        }
    }

    const removeSecondaryDiagnosis = (index: number) => {
        setDiagnosisData((prev) => ({
            ...prev,
            secondary: prev.secondary.filter((_, i) => i !== index),
        }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(diagnosisData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <AlertTriangle className="h-5 w-5 inline mr-2" />
                        Diagnosis
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Diagnosis
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
                <div className="space-y-6">
                    <div>
                        <Label className="dark:text-gray-300 font-medium">Primary Diagnosis</Label>
                        <div className="mt-2">
                            <Input
                                disabled={readOnly}
                                placeholder="Enter primary diagnosis"
                                className="dark:bg-gray-700 dark:text-gray-300"
                                value={diagnosisData.primary}
                                onChange={(e) => handlePrimaryChange(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Secondary Diagnoses</Label>
                        <div className="mt-2 space-y-4">
                            {diagnosisData.secondary.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {diagnosisData.secondary.map((diagnosis, index) => (
                                        <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                                            {diagnosis}
                                            {!readOnly && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 ml-2 hover:bg-red-100 hover:text-red-500"
                                                    onClick={() => removeSecondaryDiagnosis(index)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No secondary diagnoses added</p>
                            )}

                            {!readOnly && (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add secondary diagnosis"
                                        className="dark:bg-gray-700 dark:text-gray-300"
                                        value={newSecondary}
                                        onChange={(e) => setNewSecondary(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                addSecondaryDiagnosis()
                                            }
                                        }}
                                    />
                                    <Button onClick={addSecondaryDiagnosis}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
