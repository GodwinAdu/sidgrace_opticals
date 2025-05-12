"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageIcon, Save, Upload } from "lucide-react"

interface ScanData {
    type?: string
    description?: string
    findings?: string
    imageUrl?: string
    date?: string
}

interface ScanTabProps {
    initialData?: ScanData
    onSave?: (data: ScanData) => void
    readOnly?: boolean
}

export default function ScanTab({ initialData, onSave, readOnly = false }: ScanTabProps) {
    const [scanData, setScanData] = useState<ScanData>(
        initialData || {
            type: "",
            description: "",
            findings: "",
            imageUrl: "",
            date: new Date().toISOString().split("T")[0],
        },
    )

    const handleChange = (field: keyof ScanData, value: string) => {
        setScanData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(scanData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <ImageIcon className="h-5 w-5 inline mr-2" />
                        Scan/Imaging
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Scan
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Scan Type</Label>
                            <Input
                                disabled={readOnly}
                                placeholder="e.g., X-Ray, MRI, CT Scan, Ultrasound"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={scanData.type || ""}
                                onChange={(e) => handleChange("type", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label className="dark:text-gray-300 font-medium">Date</Label>
                            <Input
                                disabled={readOnly}
                                type="date"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={scanData.date || ""}
                                onChange={(e) => handleChange("date", e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Description</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter description of the scan/imaging"
                            className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                            value={scanData.description || ""}
                            onChange={(e) => handleChange("description", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Findings</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter findings from the scan/imaging"
                            className="mt-2 min-h-[150px] dark:bg-gray-700 dark:text-gray-300"
                            value={scanData.findings || ""}
                            onChange={(e) => handleChange("findings", e.target.value)}
                        />
                    </div>

                    {!readOnly && (
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Upload Image</Label>
                            <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                <Upload className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Drag and drop image files here, or click to select files
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supported formats: JPEG, PNG, DICOM</p>
                                <Input type="file" className="hidden" accept="image/*,.dcm" id="scan-upload" />
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => document.getElementById("scan-upload")?.click()}
                                >
                                    Select File
                                </Button>
                            </div>
                        </div>
                    )}

                    {scanData.imageUrl && (
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Image Preview</Label>
                            <div className="mt-2 border rounded-lg overflow-hidden">
                                <img
                                    src={scanData.imageUrl || "/placeholder.svg"}
                                    alt="Scan"
                                    className="w-full h-auto max-h-[400px] object-contain"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
