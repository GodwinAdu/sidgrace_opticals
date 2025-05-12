"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pill, Plus, Save, Trash } from "lucide-react"

interface Drug {
    name: string
    dosage: string
    frequency: string
    duration: string
}

interface MedicationsTabProps {
    initialData?: Drug[]
    onSave?: (data: Drug[]) => void
    readOnly?: boolean
}

export default function MedicationsTab({ initialData, onSave, readOnly = false }: MedicationsTabProps) {
    const [medications, setMedications] = useState<Drug[]>(initialData || [])
    const [newMedication, setNewMedication] = useState<Drug>({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
    })

    const handleNewMedicationChange = (field: keyof Drug, value: string) => {
        setNewMedication((prev) => ({ ...prev, [field]: value }))
    }

    const addMedication = () => {
        if (newMedication.name && newMedication.dosage) {
            setMedications((prev) => [...prev, { ...newMedication }])
            setNewMedication({
                name: "",
                dosage: "",
                frequency: "",
                duration: "",
            })
        }
    }

    const removeMedication = (index: number) => {
        setMedications((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(medications)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <Pill className="h-5 w-5 inline mr-2" />
                        Medications
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Medications
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Medication Name</TableHead>
                                    <TableHead>Dosage</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead>Duration</TableHead>
                                    {!readOnly && <TableHead className="w-[80px]">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {medications.length > 0 ? (
                                    medications.map((med, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{med.name}</TableCell>
                                            <TableCell>{med.dosage}</TableCell>
                                            <TableCell>{med.frequency}</TableCell>
                                            <TableCell>{med.duration}</TableCell>
                                            {!readOnly && (
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                                        onClick={() => removeMedication(index)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={readOnly ? 4 : 5} className="text-center py-4 text-gray-500 dark:text-gray-400">
                                            No medications prescribed
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {!readOnly && (
                        <div className="border rounded-lg p-4 dark:border-gray-700">
                            <h3 className="text-sm font-medium mb-3 dark:text-gray-300">Add New Medication</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label className="dark:text-gray-300">Medication Name</Label>
                                    <Input
                                        placeholder="Enter medication name"
                                        className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                        value={newMedication.name}
                                        onChange={(e) => handleNewMedicationChange("name", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="dark:text-gray-300">Dosage</Label>
                                    <Input
                                        placeholder="e.g., 500mg"
                                        className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                        value={newMedication.dosage}
                                        onChange={(e) => handleNewMedicationChange("dosage", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="dark:text-gray-300">Frequency</Label>
                                    <Input
                                        placeholder="e.g., TID, BID, Daily"
                                        className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                        value={newMedication.frequency}
                                        onChange={(e) => handleNewMedicationChange("frequency", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="dark:text-gray-300">Duration</Label>
                                    <Input
                                        placeholder="e.g., 7 days, 2 weeks"
                                        className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                        value={newMedication.duration}
                                        onChange={(e) => handleNewMedicationChange("duration", e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button className="mt-4" onClick={addMedication}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Medication
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
