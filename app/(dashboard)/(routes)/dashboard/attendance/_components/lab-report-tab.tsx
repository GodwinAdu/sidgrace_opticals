"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Microscope, Save, Upload, Plus, Trash } from "lucide-react"

interface LabTest {
    name: string
    value: string
    unit: string
    referenceRange: string
    flag?: "normal" | "high" | "low" | "critical"
}

interface LabReportData {
    testName: string
    testDate: string
    results: string
    interpretation: string
    fileUrl?: string
    labTests: LabTest[]
}

interface LabReportTabProps {
    initialData?: LabReportData
    onSave?: (data: LabReportData) => void
    readOnly?: boolean
}

export default function LabReportTab({ initialData, onSave, readOnly = false }: LabReportTabProps) {
    const [labData, setLabData] = useState<LabReportData>(
        initialData || {
            testName: "",
            testDate: new Date().toISOString().split("T")[0],
            results: "",
            interpretation: "",
            fileUrl: "",
            labTests: [],
        },
    )

    const [newTest, setNewTest] = useState<LabTest>({
        name: "",
        value: "",
        unit: "",
        referenceRange: "",
        flag: "normal",
    })

    const handleChange = (field: keyof LabReportData, value: string) => {
        setLabData((prev) => ({ ...prev, [field]: value }))
    }

    const handleNewTestChange = (field: keyof LabTest, value: string) => {
        setNewTest((prev) => ({ ...prev, [field]: value }))
    }

    const addLabTest = () => {
        if (newTest.name && newTest.value) {
            setLabData((prev) => ({
                ...prev,
                labTests: [...prev.labTests, { ...newTest }],
            }))
            setNewTest({
                name: "",
                value: "",
                unit: "",
                referenceRange: "",
                flag: "normal",
            })
        }
    }

    const removeLabTest = (index: number) => {
        setLabData((prev) => ({
            ...prev,
            labTests: prev.labTests.filter((_, i) => i !== index),
        }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(labData)
        }
    }

    const getFlagColor = (flag?: string) => {
        switch (flag) {
            case "high":
                return "text-red-500"
            case "low":
                return "text-blue-500"
            case "critical":
                return "text-red-600 font-bold"
            default:
                return "text-green-500"
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <Microscope className="h-5 w-5 inline mr-2" />
                        Laboratory Report
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Lab Report
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Test Name</Label>
                            <Input
                                disabled={readOnly}
                                placeholder="e.g., Complete Blood Count, Urinalysis"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={labData.testName}
                                onChange={(e) => handleChange("testName", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label className="dark:text-gray-300 font-medium">Test Date</Label>
                            <Input
                                disabled={readOnly}
                                type="date"
                                className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                value={labData.testDate}
                                onChange={(e) => handleChange("testDate", e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label className="dark:text-gray-300 font-medium">Lab Test Results</Label>
                            {!readOnly && (
                                <Button variant="outline" size="sm" onClick={() => addLabTest()}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Test
                                </Button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Test Name</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Reference Range</TableHead>
                                        <TableHead>Flag</TableHead>
                                        {!readOnly && <TableHead className="w-[80px]">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {labData.labTests.length > 0 ? (
                                        labData.labTests.map((test, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{test.name}</TableCell>
                                                <TableCell className={getFlagColor(test.flag)}>{test.value}</TableCell>
                                                <TableCell>{test.unit}</TableCell>
                                                <TableCell>{test.referenceRange}</TableCell>
                                                <TableCell className={getFlagColor(test.flag)}>
                                                    {test.flag === "normal"
                                                        ? "Normal"
                                                        : test.flag === "high"
                                                            ? "High"
                                                            : test.flag === "low"
                                                                ? "Low"
                                                                : "Critical"}
                                                </TableCell>
                                                {!readOnly && (
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                                            onClick={() => removeLabTest(index)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={readOnly ? 5 : 6}
                                                className="text-center py-4 text-gray-500 dark:text-gray-400"
                                            >
                                                No lab tests added
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {!readOnly && (
                            <div className="border rounded-lg p-4 mt-4 dark:border-gray-700">
                                <h3 className="text-sm font-medium mb-3 dark:text-gray-300">Add New Test</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="dark:text-gray-300">Test Name</Label>
                                        <Input
                                            placeholder="e.g., Hemoglobin, Glucose"
                                            className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                            value={newTest.name}
                                            onChange={(e) => handleNewTestChange("name", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="dark:text-gray-300">Value</Label>
                                        <Input
                                            placeholder="e.g., 14.2, 95"
                                            className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                            value={newTest.value}
                                            onChange={(e) => handleNewTestChange("value", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="dark:text-gray-300">Unit</Label>
                                        <Input
                                            placeholder="e.g., g/dL, mg/dL"
                                            className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                            value={newTest.unit}
                                            onChange={(e) => handleNewTestChange("unit", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="dark:text-gray-300">Reference Range</Label>
                                        <Input
                                            placeholder="e.g., 12-16, 70-100"
                                            className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                            value={newTest.referenceRange}
                                            onChange={(e) => handleNewTestChange("referenceRange", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="dark:text-gray-300">Flag</Label>
                                        <Select value={newTest.flag} onValueChange={(value) => handleNewTestChange("flag", value)}>
                                            <SelectTrigger className="mt-1 dark:bg-gray-700 dark:text-gray-300">
                                                <SelectValue placeholder="Select flag" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button className="mt-4" onClick={addLabTest}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Test
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Results Summary</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter laboratory test results summary"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={labData.results}
                            onChange={(e) => handleChange("results", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Interpretation</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter interpretation of laboratory results"
                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                            value={labData.interpretation}
                            onChange={(e) => handleChange("interpretation", e.target.value)}
                        />
                    </div>

                    {!readOnly && (
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Upload Lab Report</Label>
                            <div className="mt-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                <Upload className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Drag and drop lab report files here, or click to select files
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supported formats: PDF, JPG, PNG</p>
                                <Input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" id="lab-upload" />
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => document.getElementById("lab-upload")?.click()}
                                >
                                    Select File
                                </Button>
                            </div>
                        </div>
                    )}

                    {labData.fileUrl && (
                        <div>
                            <Label className="dark:text-gray-300 font-medium">Uploaded Report</Label>
                            <div className="mt-2 border rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md">
                                        <Microscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="ml-2 dark:text-gray-300">Lab Report Document</span>
                                </div>
                                <Button variant="outline" size="sm">
                                    View
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
