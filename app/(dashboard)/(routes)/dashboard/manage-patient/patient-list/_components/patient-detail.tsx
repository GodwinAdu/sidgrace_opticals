"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ArrowLeft,
    Edit,
    Phone,
    Mail,
    MapPin,
    Calendar,
    User,
    Heart,
    Shield,
    AlertTriangle,
    FileText,
    Printer,
    Download,
} from "lucide-react"

interface PatientDetailsViewProps {
    patient: any
}

export default function PatientDetailsView({ patient }: PatientDetailsViewProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("overview")

    const formatDate = (dateString: string) => {
        if (!dateString) return "Not provided"
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const calculateAge = (dob: string) => {
        if (!dob) return "Unknown"
        const today = new Date()
        const birthDate = new Date(dob)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    const handleEdit = () => {
        router.push(`/dashboard/patients/edit/${patient.patientId}`)
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{patient.fullName}</h1>
                        <p className="text-gray-600">Patient ID: {patient.patientId}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Patient
                    </Button>
                </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium">Age</p>
                                <p className="text-lg font-bold">{calculateAge(patient.dob)} years</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium">Gender</p>
                                <p className="text-lg font-bold capitalize">{patient.gender || "Not specified"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Heart className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="text-sm font-medium">Blood Type</p>
                                <p className="text-lg font-bold">{patient.bloodType || "Unknown"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Shield className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium">Status</p>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    Active
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="medical">Medical</TabsTrigger>
                    <TabsTrigger value="emergency">Emergency</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <User className="h-5 w-5" />
                                    <span>Personal Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Full Name</p>
                                        <p className="font-medium">{patient.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                                        <p className="font-medium">{formatDate(patient.dob)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Gender</p>
                                        <p className="font-medium capitalize">{patient.gender || "Not specified"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Marital Status</p>
                                        <p className="font-medium">{patient.maritalStatus || "Not specified"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Occupation</p>
                                        <p className="font-medium">{patient.occupation || "Not specified"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Blood Type</p>
                                        <p className="font-medium">{patient.bloodType || "Unknown"}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Phone className="h-5 w-5" />
                                    <span>Contact Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Primary Phone</p>
                                            <p className="font-medium">{patient.phone}</p>
                                        </div>
                                    </div>
                                    {patient.alternatePhone && (
                                        <div className="flex items-center space-x-3">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Alternate Phone</p>
                                                <p className="font-medium">{patient.alternatePhone}</p>
                                            </div>
                                        </div>
                                    )}
                                    {patient.email && (
                                        <div className="flex items-center space-x-3">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Email</p>
                                                <p className="font-medium">{patient.email}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start space-x-3">
                                        <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Address</p>
                                            <p className="font-medium">{patient.address}</p>
                                        </div>
                                    </div>
                                    {patient.preferredCommunication && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Preferred Communication</p>
                                            <Badge variant="outline">{patient.preferredCommunication}</Badge>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Provider ID</p>
                                    <p className="font-medium">{patient.providerId || "Not provided"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Service Number</p>
                                    <p className="font-medium">{patient.serviceNumber || "Not provided"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Referral Source</p>
                                    <p className="font-medium">{patient.referralSource || "Not specified"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Medical Tab */}
                <TabsContent value="medical" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Allergies & Conditions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                    <span>Allergies & Conditions</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">Allergies</p>
                                    {patient.allergies && patient.allergies.filter((a: string) => a).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {patient.allergies
                                                .filter((a: string) => a)
                                                .map((allergy: string, index: number) => (
                                                    <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                                                        {allergy}
                                                    </Badge>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No known allergies</p>
                                    )}
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2">Chronic Conditions</p>
                                    {patient.chronicConditions && patient.chronicConditions.filter((c: string) => c).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {patient.chronicConditions
                                                .filter((c: string) => c)
                                                .map((condition: string, index: number) => (
                                                    <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800">
                                                        {condition}
                                                    </Badge>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No chronic conditions</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Current Medications */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Heart className="h-5 w-5 text-blue-600" />
                                    <span>Current Medications</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.currentMedications ? (
                                    <div className="whitespace-pre-wrap">{patient.currentMedications}</div>
                                ) : (
                                    <p className="text-gray-500 italic">No current medications</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Family History */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Family Medical History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.familyHistory ? (
                                    <div className="whitespace-pre-wrap">{patient.familyHistory}</div>
                                ) : (
                                    <p className="text-gray-500 italic">No family history recorded</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Family Ocular History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.familyOcularHistory ? (
                                    <div className="whitespace-pre-wrap">{patient.familyOcularHistory}</div>
                                ) : (
                                    <p className="text-gray-500 italic">No family ocular history recorded</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Medical & Social History */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Medical History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.medicalHistory && patient.medicalHistory.filter((h: string) => h).length > 0 ? (
                                    <ul className="space-y-2">
                                        {patient.medicalHistory
                                            .filter((h: string) => h)
                                            .map((history: string, index: number) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                                                    <span>{history}</span>
                                                </li>
                                            ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic">No medical history recorded</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Social History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.socialHistory && patient.socialHistory.filter((h: string) => h).length > 0 ? (
                                    <ul className="space-y-2">
                                        {patient.socialHistory
                                            .filter((h: string) => h)
                                            .map((history: string, index: number) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                                                    <span>{history}</span>
                                                </li>
                                            ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 italic">No social history recorded</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Emergency Contact Tab */}
                <TabsContent value="emergency" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Phone className="h-5 w-5 text-red-600" />
                                <span>Emergency Contact Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Contact Name</p>
                                    <p className="text-lg font-medium">{patient.emergencyContactName || patient.emergencyName}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Relationship</p>
                                    <p className="text-lg font-medium">{patient.emergencyContactRelationship || "Not specified"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Phone Number</p>
                                    <p className="text-lg font-medium">{patient.emergencyContactPhone || patient.emergencyPhone}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Consent Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Shield className="h-5 w-5 text-green-600" />
                                <span>Consent & Agreements</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Consent to Treatment</span>
                                    <Badge variant={patient.consentToTreatment ? "default" : "destructive"}>
                                        {patient.consentToTreatment ? "Granted" : "Not Granted"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Consent to Share Information</span>
                                    <Badge variant={patient.consentToShareInformation ? "default" : "destructive"}>
                                        {patient.consentToShareInformation ? "Granted" : "Not Granted"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="font-medium">Privacy Policy Acknowledgment</span>
                                    <Badge variant={patient.acknowledgmentOfPrivacyPolicy ? "default" : "destructive"}>
                                        {patient.acknowledgmentOfPrivacyPolicy ? "Acknowledged" : "Not Acknowledged"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <FileText className="h-5 w-5" />
                                <span>Registration History</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">Patient Registered</p>
                                        <p className="text-sm text-gray-500">{patient.registeredInfo || "Registered via web form"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{formatDate(patient.registeredAt)}</p>
                                        <Badge variant="outline">Registration</Badge>
                                    </div>
                                </div>
                                {patient.updatedAt && (
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-medium">Patient Information Updated</p>
                                            <p className="text-sm text-gray-500">Patient details were modified</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{formatDate(patient.updatedAt)}</p>
                                            <Badge variant="outline">Update</Badge>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Future: Add appointment history, visit history, etc. */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Appointment History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 italic">No appointment history available</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
