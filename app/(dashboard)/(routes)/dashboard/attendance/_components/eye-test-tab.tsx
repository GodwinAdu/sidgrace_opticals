"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Save } from "lucide-react"

interface EyeTestData {
    visualAcuity: string
    colorVision: string
    intraocularPressure: string
    remarks: string
}

interface EyeTestTabProps {
    initialData?: EyeTestData
    onSave?: (data: EyeTestData) => void
    readOnly?: boolean
}

export default function EyeTestTab({ initialData, onSave, readOnly = false }: EyeTestTabProps) {
    const [eyeTestData, setEyeTestData] = useState<EyeTestData>(
        initialData || {
            visualAcuity: "",
            colorVision: "",
            intraocularPressure: "",
            remarks: "",
        },
    )

    const handleChange = (field: keyof EyeTestData, value: string) => {
        setEyeTestData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(eyeTestData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">Eye Test</CardTitle>
                    {!readOnly && (
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
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="dark:text-gray-300 font-medium">Visual Acuity Measurements</Label>
                                    {!readOnly && (
                                        <Button variant="outline" size="sm">
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Reset
                                        </Button>
                                    )}
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Eye</TableHead>
                                                <TableHead>Uncorrected</TableHead>
                                                <TableHead>Corrected</TableHead>
                                                <TableHead>Pinhole</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">Right (OD)</TableCell>
                                                <TableCell>
                                                    <Select disabled={readOnly} defaultValue="20/20">
                                                        <SelectTrigger className="w-24 dark:bg-gray-700 dark:text-gray-300">
                                                            <SelectValue placeholder="VA" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="20/20">20/20</SelectItem>
                                                            <SelectItem value="20/25">20/25</SelectItem>
                                                            <SelectItem value="20/30">20/30</SelectItem>
                                                            <SelectItem value="20/40">20/40</SelectItem>
                                                            <SelectItem value="20/50">20/50</SelectItem>
                                                            <SelectItem value="20/70">20/70</SelectItem>
                                                            <SelectItem value="20/100">20/100</SelectItem>
                                                            <SelectItem value="20/200">20/200</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select disabled={readOnly} defaultValue="20/20">
                                                        <SelectTrigger className="w-24 dark:bg-gray-700 dark:text-gray-300">
                                                            <SelectValue placeholder="VA" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="20/20">20/20</SelectItem>
                                                            <SelectItem value="20/25">20/25</SelectItem>
                                                            <SelectItem value="20/30">20/30</SelectItem>
                                                            <SelectItem value="20/40">20/40</SelectItem>
                                                            <SelectItem value="20/50">20/50</SelectItem>
                                                            <SelectItem value="20/70">20/70</SelectItem>
                                                            <SelectItem value="20/100">20/100</SelectItem>
                                                            <SelectItem value="20/200">20/200</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select disabled={readOnly} defaultValue="20/20">
                                                        <SelectTrigger className="w-24 dark:bg-gray-700 dark:text-gray-300">
                                                            <SelectValue placeholder="VA" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="20/20">20/20</SelectItem>
                                                            <SelectItem value="20/25">20/25</SelectItem>
                                                            <SelectItem value="20/30">20/30</SelectItem>
                                                            <SelectItem value="20/40">20/40</SelectItem>
                                                            <SelectItem value="20/50">20/50</SelectItem>
                                                            <SelectItem value="20/70">20/70</SelectItem>
                                                            <SelectItem value="20/100">20/100</SelectItem>
                                                            <SelectItem value="20/200">20/200</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium">Left (OS)</TableCell>
                                                <TableCell>
                                                    <Select disabled={readOnly} defaultValue="20/20">
                                                        <SelectTrigger className="w-24 dark:bg-gray-700 dark:text-gray-300">
                                                            <SelectValue placeholder="VA" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="20/20">20/20</SelectItem>
                                                            <SelectItem value="20/25">20/25</SelectItem>
                                                            <SelectItem value="20/30">20/30</SelectItem>
                                                            <SelectItem value="20/40">20/40</SelectItem>
                                                            <SelectItem value="20/50">20/50</SelectItem>
                                                            <SelectItem value="20/70">20/70</SelectItem>
                                                            <SelectItem value="20/100">20/100</SelectItem>
                                                            <SelectItem value="20/200">20/200</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select disabled={readOnly} defaultValue="20/20">
                                                        <SelectTrigger className="w-24 dark:bg-gray-700 dark:text-gray-300">
                                                            <SelectValue placeholder="VA" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="20/20">20/20</SelectItem>
                                                            <SelectItem value="20/25">20/25</SelectItem>
                                                            <SelectItem value="20/30">20/30</SelectItem>
                                                            <SelectItem value="20/40">20/40</SelectItem>
                                                            <SelectItem value="20/50">20/50</SelectItem>
                                                            <SelectItem value="20/70">20/70</SelectItem>
                                                            <SelectItem value="20/100">20/100</SelectItem>
                                                            <SelectItem value="20/200">20/200</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select disabled={readOnly} defaultValue="20/20">
                                                        <SelectTrigger className="w-24 dark:bg-gray-700 dark:text-gray-300">
                                                            <SelectValue placeholder="VA" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="20/20">20/20</SelectItem>
                                                            <SelectItem value="20/25">20/25</SelectItem>
                                                            <SelectItem value="20/30">20/30</SelectItem>
                                                            <SelectItem value="20/40">20/40</SelectItem>
                                                            <SelectItem value="20/50">20/50</SelectItem>
                                                            <SelectItem value="20/70">20/70</SelectItem>
                                                            <SelectItem value="20/100">20/100</SelectItem>
                                                            <SelectItem value="20/200">20/200</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
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
                                            <Input
                                                disabled={readOnly}
                                                placeholder="18"
                                                className="dark:bg-gray-700 dark:text-gray-300"
                                                value={eyeTestData.intraocularPressure.split("/")[0] || ""}
                                                onChange={(e) => {
                                                    const leftValue = eyeTestData.intraocularPressure.split("/")[1] || ""
                                                    handleChange("intraocularPressure", `${e.target.value}/${leftValue}`)
                                                }}
                                            />
                                            <span className="dark:text-gray-300">mmHg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="dark:text-gray-300">Left Eye (OS)</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                disabled={readOnly}
                                                placeholder="17"
                                                className="dark:bg-gray-700 dark:text-gray-300"
                                                value={eyeTestData.intraocularPressure.split("/")[1] || ""}
                                                onChange={(e) => {
                                                    const rightValue = eyeTestData.intraocularPressure.split("/")[0] || ""
                                                    handleChange("intraocularPressure", `${rightValue}/${e.target.value}`)
                                                }}
                                            />
                                            <span className="dark:text-gray-300">mmHg</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Remarks</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter any additional notes or remarks about the eye test"
                            className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                            value={eyeTestData.remarks}
                            onChange={(e) => handleChange("remarks", e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
