"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Activity, Save } from "lucide-react"

interface VitalsData {
    temperature: number | null
    pulse: number | null
    bloodPressure: string
    respiratoryRate: number | null
    weight: number | null
    height: number | null
    bmi: number | null
}

interface VitalsTabProps {
    initialData?: VitalsData
    onSave?: (data: VitalsData) => void
    readOnly?: boolean
}

export default function VitalsTab({ initialData, onSave, readOnly = false }: VitalsTabProps) {
    const [vitalsData, setVitalsData] = useState<VitalsData>(
        initialData || {
            temperature: null,
            pulse: null,
            bloodPressure: "",
            respiratoryRate: null,
            weight: null,
            height: null,
            bmi: null,
        },
    )

    const handleChange = (field: keyof VitalsData, value: string) => {
        if (field === "bloodPressure") {
            setVitalsData((prev) => ({ ...prev, [field]: value }))
        } else {
            const numValue = value === "" ? null : Number.parseFloat(value)
            setVitalsData((prev) => ({ ...prev, [field]: numValue }))

            // Auto-calculate BMI if both height and weight are present
            if ((field === "height" || field === "weight") && vitalsData.height && vitalsData.weight) {
                const height = field === "height" ? Number.parseFloat(value) : vitalsData.height
                const weight = field === "weight" ? Number.parseFloat(value) : vitalsData.weight

                if (height && weight) {
                    // BMI = weight(kg) / (height(m))²
                    const heightInMeters = height / 100 // Convert cm to meters
                    const bmi = weight / (heightInMeters * heightInMeters)
                    setVitalsData((prev) => ({ ...prev, bmi: Number.parseFloat(bmi.toFixed(2)) }))
                }
            }
        }
    }

    const handleSave = () => {
        if (onSave) {
            onSave(vitalsData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <Activity className="h-5 w-5 inline mr-2" />
                        Vital Signs
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Vitals
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <Label htmlFor="temperature" className="dark:text-gray-300">
                            Temperature
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="temperature"
                                type="number"
                                step="0.1"
                                disabled={readOnly}
                                value={vitalsData.temperature?.toString() || ""}
                                onChange={(e) => handleChange("temperature", e.target.value)}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">°C</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="pulse" className="dark:text-gray-300">
                            Pulse Rate
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="pulse"
                                type="number"
                                disabled={readOnly}
                                value={vitalsData.pulse?.toString() || ""}
                                onChange={(e) => handleChange("pulse", e.target.value)}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">bpm</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="bloodPressure" className="dark:text-gray-300">
                            Blood Pressure
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="bloodPressure"
                                disabled={readOnly}
                                placeholder="120/80"
                                value={vitalsData.bloodPressure}
                                onChange={(e) => handleChange("bloodPressure", e.target.value)}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">mmHg</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="respiratoryRate" className="dark:text-gray-300">
                            Respiratory Rate
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="respiratoryRate"
                                type="number"
                                disabled={readOnly}
                                value={vitalsData.respiratoryRate?.toString() || ""}
                                onChange={(e) => handleChange("respiratoryRate", e.target.value)}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">/min</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="weight" className="dark:text-gray-300">
                            Weight
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                disabled={readOnly}
                                value={vitalsData.weight?.toString() || ""}
                                onChange={(e) => handleChange("weight", e.target.value)}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">kg</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="height" className="dark:text-gray-300">
                            Height
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="height"
                                type="number"
                                disabled={readOnly}
                                value={vitalsData.height?.toString() || ""}
                                onChange={(e) => handleChange("height", e.target.value)}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">cm</span>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="bmi" className="dark:text-gray-300">
                            BMI
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="bmi"
                                type="number"
                                step="0.01"
                                disabled={true}
                                value={vitalsData.bmi?.toString() || ""}
                                className="dark:bg-gray-700 dark:text-gray-300"
                            />
                            <span className="dark:text-gray-300">kg/m²</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
