"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList, Save } from "lucide-react"

interface TreatmentPlanData {
    treatment: string
    followUp: string
}

interface TreatmentPlanTabProps {
    initialData?: TreatmentPlanData
    onSave?: (data: TreatmentPlanData) => void
    readOnly?: boolean
}

export default function TreatmentPlanTab({ initialData, onSave, readOnly = false }: TreatmentPlanTabProps) {
    const [planData, setPlanData] = useState<TreatmentPlanData>(
        initialData || {
            treatment: "",
            followUp: "",
        },
    )

    const handleChange = (field: keyof TreatmentPlanData, value: string) => {
        setPlanData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (onSave) {
            onSave(planData)
        }
    }

    return (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        <ClipboardList className="h-5 w-5 inline mr-2" />
                        Treatment Plan
                    </CardTitle>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" />
                            Save Plan
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-6">
                    <div>
                        <Label className="dark:text-gray-300 font-medium">Treatment Plan</Label>
                        <Textarea
                            disabled={readOnly}
                            placeholder="Enter detailed treatment plan"
                            className="mt-2 min-h-[200px] dark:bg-gray-700 dark:text-gray-300"
                            value={planData.treatment}
                            onChange={(e) => handleChange("treatment", e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="dark:text-gray-300 font-medium">Follow-up</Label>
                        <Select
                            disabled={readOnly}
                            value={planData.followUp}
                            onValueChange={(value) => handleChange("followUp", value)}
                        >
                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                <SelectValue placeholder="Select follow-up period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1week">1 Week</SelectItem>
                                <SelectItem value="2weeks">2 Weeks</SelectItem>
                                <SelectItem value="1month">1 Month</SelectItem>
                                <SelectItem value="3months">3 Months</SelectItem>
                                <SelectItem value="6months">6 Months</SelectItem>
                                <SelectItem value="1year">1 Year</SelectItem>
                                <SelectItem value="prn">As Needed (PRN)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Treatment Plan Guide</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Medications</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Include all prescribed medications with dosages, frequencies, and durations.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Procedures</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document any procedures to be performed, including timing and preparation.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Lifestyle Modifications</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Include recommendations for diet, exercise, and other lifestyle changes.
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">Patient Education</p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Document educational materials provided and topics discussed with the patient.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
