"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Stethoscope, Plus, Save, Trash } from "lucide-react"

interface Procedure {
    name: string
    date: string
    notes: string
}

interface ProceduresTabProps {
    initialData?: Procedure[]
    onSave?: (data: Procedure[]) => void
    readOnly?: boolean
}

export default function ProceduresTab({ initialData, onSave, readOnly = false }: ProceduresTabProps) {
    const [procedures, setProcedures] = useState<Procedure[]>(initialData || [])
    const [newProcedure, setNewProcedure] = useState<Procedure>({
        name: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
    })

    const handleNewProcedureChange = (field: keyof Procedure, value: string) => {
        setNewProcedure((prev) => ({ ...prev, [field]: value }))
    }

    const addProcedure = () => {
        if (newProcedure.name) {
            setProcedures((prev) => [...prev, { ...newProcedure }])
            setNewProcedure({
                name: "",
                date: new Date().toISOString().split("T")[0],
                notes: "",
            })
        }
    }

    const removeProcedure = (index: number) => {
        setProcedures((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(procedures)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <Stethoscope className="h-5 w-5 inline mr-2" />
                        Procedures
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Procedures
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
                                    <TableHead>Procedure Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Notes</TableHead>
                                    {!readOnly && <TableHead className="w-[80px]">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {procedures.length > 0 ? (
                                    procedures.map((procedure, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{procedure.name}</TableCell>
                                            <TableCell>{new Date(procedure.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="max-w-[300px] truncate">{procedure.notes}</TableCell>
                                            {!readOnly && (
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                                        onClick={() => removeProcedure(index)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={readOnly ? 3 : 4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                                            No procedures recorded
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {!readOnly && (
                        <div className="border rounded-lg p-4 dark:border-gray-700">
                            <h3 className="text-sm font-medium mb-3 dark:text-gray-300">Add New Procedure</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="dark:text-gray-300">Procedure Name</Label>
                                    <Input
                                        placeholder="Enter procedure name"
                                        className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                        value={newProcedure.name}
                                        onChange={(e) => handleNewProcedureChange("name", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="dark:text-gray-300">Date</Label>
                                    <Input
                                        type="date"
                                        className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                        value={newProcedure.date}
                                        onChange={(e) => handleNewProcedureChange("date", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label className="dark:text-gray-300">Notes</Label>
                                <Textarea
                                    placeholder="Enter procedure notes"
                                    className="mt-1 dark:bg-gray-700 dark:text-gray-300"
                                    value={newProcedure.notes}
                                    onChange={(e) => handleNewProcedureChange("notes", e.target.value)}
                                />
                            </div>
                            <Button className="mt-4" onClick={addProcedure}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Procedure
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
