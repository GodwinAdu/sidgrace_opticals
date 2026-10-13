"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save } from "lucide-react"

interface EyeTestData {
    visualAcuity: string
    colorVision: string
    intraocularPressure: string
    remarks: string
}

interface EyeTestTabProps {
    initialData?: EyeTestData
    onSave?: (data: EyeTestData) => void
    onChange?: (data: EyeTestData) => void
    autoSave?: boolean
    readOnly?: boolean
}

export default function EyeTestTab({ initialData, onSave, onChange, autoSave, readOnly = false }: EyeTestTabProps) {
    const [eyeTestData, setEyeTestData] = useState<EyeTestData>(
        initialData || { visualAcuity: "", colorVision: "", intraocularPressure: "", remarks: "" },
    )

    const handleChange = (field: keyof EyeTestData, value: string) => {
        const next = { ...eyeTestData, [field]: value }
        setEyeTestData(next)
        onChange?.(next)
    }

    const handleSave = () => {
        if (onSave) onSave(eyeTestData)
    }

    const [odIop = "", osIop = ""] = eyeTestData.intraocularPressure.split("/")

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">Eye Test</CardTitle>
                    {!readOnly && !autoSave && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Eye Test
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Visual Acuity</Label>
                            <Input
                                disabled={readOnly}
                                placeholder="e.g. 20/20 OD, 20/25 OS"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={eyeTestData.visualAcuity}
                                onChange={(e) => handleChange("visualAcuity", e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label className="dark:text-gray-300 font-medium">Color Vision</Label>
                                <Select
                                    disabled={readOnly}
                                    value={eyeTestData.colorVision}
                                    onValueChange={(value) => handleChange("colorVision", value)}
                                >
                                    <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                        <SelectValue placeholder="Select color vision test result" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="deficient">Color Deficient</SelectItem>
                                        <SelectItem value="protan">Protan Deficiency</SelectItem>
                                        <SelectItem value="deutan">Deutan Deficiency</SelectItem>
                                        <SelectItem value="tritan">Tritan Deficiency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="dark:text-gray-300 font-medium">Intraocular Pressure (IOP)</Label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <Label className="dark:text-gray-300">Right Eye (OD)</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input disabled={readOnly} placeholder="18" className="dark:bg-gray-700 dark:text-gray-300"
                                                value={odIop}
                                                onChange={(e) => handleChange("intraocularPressure", `${e.target.value}/${osIop}`)} />
                                            <span className="dark:text-gray-300">mmHg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="dark:text-gray-300">Left Eye (OS)</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input disabled={readOnly} placeholder="17" className="dark:bg-gray-700 dark:text-gray-300"
                                                value={osIop}
                                                onChange={(e) => handleChange("intraocularPressure", `${odIop}/${e.target.value}`)} />
                                            <span className="dark:text-gray-300">mmHg</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label className="dark:text-gray-300 font-medium">Remarks</Label>
                        <Textarea disabled={readOnly} placeholder="Enter any additional notes or remarks about the eye test"
                            className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                            value={eyeTestData.remarks}
                            onChange={(e) => handleChange("remarks", e.target.value)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}