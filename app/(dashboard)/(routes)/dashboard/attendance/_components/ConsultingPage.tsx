"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import {
    User,
    FileText,
    Stethoscope,
    Microscope,
    ImageIcon,
    ClipboardList,
    Activity,
    Pill,
    Eye,
    AlertTriangle,
    Save,
    CalendarIcon,
    MoreVertical,
    ChevronDown,
    Printer,
    Download,
    Scissors,
    Clock,
    Plus,
    Filter,
    Heart,
    TreesIcon as Lungs,
    Brain,
    Bone,
    Zap,
    Clipboard,
    Check,
    Edit,
    Undo2,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link,
    TableIcon,
    Paperclip,
    Mic,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function PatientRecord() {
    const [activeTab, setActiveTab] = useState("history")
    const [activeBottomTab, setActiveBottomTab] = useState("drugs")
    const [date, setDate] = useState<Date>()
    const [showRichTextEditor, setShowRichTextEditor] = useState(false)



    return (
        <div>

            {/* Quick Actions Bar */}
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 py-2">
                <div className="container mx-auto flex items-center justify-between">

                    <div className="hidden md:flex items-center gap-2">
                        <Badge variant="outline" className="flex gap-1 items-center">
                            <Clock className="h-3 w-3" />
                            Last updated: 5 min ago
                        </Badge>
                        <Badge variant="secondary">Patient ID: 303702</Badge>
                    </div>
                </div>
            </div>

            {/* Patient Info */}
            <div className="container mx-auto p-4">
                <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="bg-gray-100 dark:bg-gray-700 pb-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-blue-500">
                                    <AvatarImage src="/patient-consultation.png" alt="Patient" />
                                    <AvatarFallback>PT</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                        Patient Information
                                    </CardTitle>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Female • 37 years</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="text-blue-800 border-blue-800 dark:text-blue-300 dark:border-blue-500"
                                >
                                    Time: 12:20:08 PM
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className="text-blue-800 border-blue-800 dark:text-blue-300 dark:border-blue-500"
                                >
                                    Date: 06-05-2025
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className=""></div>



                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium dark:text-gray-300">Type of Service</Label>
                                    <RadioGroup defaultValue="inpatient" className="flex gap-4 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="outpatient" id="outpatient" />
                                            <Label htmlFor="outpatient" className="dark:text-gray-300">
                                                Outpatient
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="inpatient" id="inpatient" />
                                            <Label htmlFor="inpatient" className="dark:text-gray-300">
                                                Inpatient
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="investigation" id="investigation" />
                                            <Label htmlFor="investigation" className="dark:text-gray-300">
                                                Investigation
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <div>
                                        <Label htmlFor="visit-type" className="dark:text-gray-300">
                                            Type of Visit
                                        </Label>
                                        <Select defaultValue="cash">
                                            <SelectTrigger className="w-32 bg-white dark:bg-gray-700 dark:text-gray-300">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">CASH</SelectItem>
                                                <SelectItem value="insurance">INSURANCE</SelectItem>
                                                <SelectItem value="nhis">NHIS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="balance" className="dark:text-gray-300">
                                            BALANCE
                                        </Label>
                                        <Input id="balance" className="w-32 bg-white dark:bg-gray-700 dark:text-gray-300" />
                                    </div>
                                </div>

                            </div>
                            <div className="mx-auto">
                                <ScrollArea className="h-24 w-56">
                                    <div className="">20/08/24</div>
                                    <div className="">20/08/24</div>
                                    <div className="">20/08/24</div>
                                    <div className="">20/08/24</div>
                                    <div className="">20/08/24</div>
                                    <div className="">20/08/24</div>
                                    <div className="">20/08/24</div>
                                </ScrollArea>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Tabs */}
                <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="">
                        <TabsTrigger
                            value="history"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">History</span>
                            <span className="inline md:hidden">Hist</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="physic-exam"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <Stethoscope className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Physic Exam</span>
                            <span className="inline md:hidden">Exam</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="diagnosis"
                            className="data-[state=active]:bg-red-200 dark:data-[state=active]:bg-red-900"
                        >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Diagnosis</span>
                            <span className="inline md:hidden">Diag</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="scan-image"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Scan/Image</span>
                            <span className="inline md:hidden">Scan</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="dr-notes"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <ClipboardList className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Dr&#39;s Notes</span>
                            <span className="inline md:hidden">Dr</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="nurse-notes"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <ClipboardList className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Nurse&#39;s Notes</span>
                            <span className="inline md:hidden">Nurse</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="vitals"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <Activity className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Vitals/Charts</span>
                            <span className="inline md:hidden">Vitals</span>
                        </TabsTrigger>
                        <TabsTrigger value="eye" className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900">
                            <Eye className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Eye Clinic</span>
                            <span className="inline md:hidden">Eye</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* History Tab Content */}
                    <TabsContent value="history" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader className="bg-gray-100 dark:bg-gray-700 py-2">
                                    <CardTitle className="text-sm font-medium dark:text-gray-300">Complaints</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge
                                            variant="outline"
                                            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                        >
                                            Primary
                                        </Badge>
                                        <p className="dark:text-gray-300">Irregular menses</p>
                                    </div>

                                    <div className="mt-4">
                                        <Label htmlFor="new-complaint" className="dark:text-gray-300">
                                            Add Complaint
                                        </Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                id="new-complaint"
                                                placeholder="Enter complaint"
                                                className="bg-white dark:bg-gray-700 dark:text-gray-300"
                                            />
                                            <Button size="sm">Add</Button>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <Label className="dark:text-gray-300">Common Complaints</Label>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <Button variant="outline" size="sm">
                                                Headache
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                Fever
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                Abdominal Pain
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                Nausea
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2 dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader className="bg-gray-100 dark:bg-gray-700 py-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-medium dark:text-gray-300">
                                            History of Present Complaint
                                        </CardTitle>
                                        <div className="flex gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setShowRichTextEditor(!showRichTextEditor)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Toggle rich text editor</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <Mic className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Voice dictation</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3">
                                    {showRichTextEditor ? (
                                        <div className="border rounded-md dark:border-gray-700">
                                            <div className="flex flex-wrap gap-1 p-1 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Bold className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Italic className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Underline className="h-4 w-4" />
                                                </Button>
                                                <Separator orientation="vertical" className="mx-1 h-6" />
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <List className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <ListOrdered className="h-4 w-4" />
                                                </Button>
                                                <Separator orientation="vertical" className="mx-1 h-6" />
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <AlignLeft className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <AlignCenter className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <AlignRight className="h-4 w-4" />
                                                </Button>
                                                <Separator orientation="vertical" className="mx-1 h-6" />
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Link className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <ImageIcon className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <TableIcon className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Paperclip className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Textarea
                                                className="min-h-[150px] border-0 focus-visible:ring-0 dark:bg-gray-700 dark:text-gray-300"
                                                defaultValue="Client seen for review this after afternoon for admission on accounts of continuity of oral treatment."
                                            />
                                        </div>
                                    ) : (
                                        <Textarea
                                            className="min-h-[150px] dark:bg-gray-700 dark:text-gray-300"
                                            defaultValue="Client seen for review this after afternoon for admission on accounts of continuity of oral treatment."
                                        />
                                    )}

                                    <div className="flex justify-between mt-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Templates
                                                    <ChevronDown className="h-3 w-3 ml-1" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>Quick Templates</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>General Examination</DropdownMenuItem>
                                                <DropdownMenuItem>Follow-up Visit</DropdownMenuItem>
                                                <DropdownMenuItem>Medication Review</DropdownMenuItem>
                                                <DropdownMenuItem>Post-operative Check</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Create New Template
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <Undo2 className="h-3 w-3 mr-1" />
                                                Undo
                                            </Button>
                                            <Button size="sm">Save Notes</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-3 dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader className="bg-gray-100 dark:bg-gray-700 py-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-medium dark:text-gray-300">Medical History</CardTitle>
                                        <Button variant="outline" size="sm">
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add History
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="past-medical">
                                            <AccordionTrigger className="text-sm font-medium">Past Medical History</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="dark:text-gray-300">Chronic Conditions</Label>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="diabetes" />
                                                                    <Label htmlFor="diabetes" className="dark:text-gray-300">
                                                                        Diabetes
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="hypertension" />
                                                                    <Label htmlFor="hypertension" className="dark:text-gray-300">
                                                                        Hypertension
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="asthma" />
                                                                    <Label htmlFor="asthma" className="dark:text-gray-300">
                                                                        Asthma
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="heart-disease" />
                                                                    <Label htmlFor="heart-disease" className="dark:text-gray-300">
                                                                        Heart Disease
                                                                    </Label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="dark:text-gray-300">Previous Hospitalizations</Label>
                                                            <Textarea
                                                                placeholder="Enter details of previous hospitalizations"
                                                                className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Additional Notes</Label>
                                                        <Textarea
                                                            placeholder="Enter additional notes about past medical history"
                                                            className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="surgical">
                                            <AccordionTrigger className="text-sm font-medium">Surgical History</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="dark:text-gray-300">Previous Surgeries</Label>
                                                            <div className="mt-2 space-y-2">
                                                                <div className="flex gap-2">
                                                                    <Input placeholder="Surgery name" className="dark:bg-gray-700 dark:text-gray-300" />
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button variant="outline">
                                                                                <CalendarIcon className="h-4 w-4" />
                                                                                <span className="sr-only">Date</span>
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0">
                                                                            <Calendar mode="single" />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                                <Button variant="outline" size="sm" className="w-full">
                                                                    <Plus className="h-3 w-3 mr-1" />
                                                                    Add Surgery
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="dark:text-gray-300">Surgical Complications</Label>
                                                            <Textarea
                                                                placeholder="Enter any surgical complications"
                                                                className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="family">
                                            <AccordionTrigger className="text-sm font-medium">Family History</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="dark:text-gray-300">Family Medical Conditions</Label>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="family-diabetes" />
                                                                    <Label htmlFor="family-diabetes" className="dark:text-gray-300">
                                                                        Diabetes
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="family-hypertension" />
                                                                    <Label htmlFor="family-hypertension" className="dark:text-gray-300">
                                                                        Hypertension
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="family-cancer" />
                                                                    <Label htmlFor="family-cancer" className="dark:text-gray-300">
                                                                        Cancer
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox id="family-heart" />
                                                                    <Label htmlFor="family-heart" className="dark:text-gray-300">
                                                                        Heart Disease
                                                                    </Label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="dark:text-gray-300">Family History Notes</Label>
                                                            <Textarea
                                                                placeholder="Enter additional family history notes"
                                                                className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="social">
                                            <AccordionTrigger className="text-sm font-medium">Social History</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <Label className="dark:text-gray-300">Smoking Status</Label>
                                                            <Select defaultValue="never">
                                                                <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                    <SelectValue placeholder="Select status" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="never">Never Smoked</SelectItem>
                                                                    <SelectItem value="former">Former Smoker</SelectItem>
                                                                    <SelectItem value="current">Current Smoker</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="dark:text-gray-300">Alcohol Consumption</Label>
                                                            <Select defaultValue="occasional">
                                                                <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                    <SelectValue placeholder="Select consumption" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    <SelectItem value="occasional">Occasional</SelectItem>
                                                                    <SelectItem value="moderate">Moderate</SelectItem>
                                                                    <SelectItem value="heavy">Heavy</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="dark:text-gray-300">Exercise Frequency</Label>
                                                            <Select defaultValue="moderate">
                                                                <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                    <SelectValue placeholder="Select frequency" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    <SelectItem value="light">Light</SelectItem>
                                                                    <SelectItem value="moderate">Moderate</SelectItem>
                                                                    <SelectItem value="heavy">Heavy</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Occupation & Social Context</Label>
                                                        <Textarea
                                                            placeholder="Enter occupation and social context information"
                                                            className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Physical Examination Tab Content */}
                    <TabsContent value="physic-exam" className="mt-4">
                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                        Physical Examination
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Templates
                                                    <ChevronDown className="h-4 w-4 ml-1" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>General Examination</DropdownMenuItem>
                                                <DropdownMenuItem>Cardiovascular Exam</DropdownMenuItem>
                                                <DropdownMenuItem>Respiratory Exam</DropdownMenuItem>
                                                <DropdownMenuItem>Neurological Exam</DropdownMenuItem>
                                                <DropdownMenuItem>Abdominal Exam</DropdownMenuItem>
                                                <DropdownMenuItem>Musculoskeletal Exam</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button size="sm">
                                            <Save className="h-4 w-4 mr-1" />
                                            Save Exam
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Accordion type="multiple" className="w-full">
                                    <AccordionItem value="general">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                General Appearance
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">General Condition</Label>
                                                        <Select defaultValue="well">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select condition" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="well">Well-appearing</SelectItem>
                                                                <SelectItem value="mild">Mildly distressed</SelectItem>
                                                                <SelectItem value="moderate">Moderately distressed</SelectItem>
                                                                <SelectItem value="severe">Severely distressed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Level of Consciousness</Label>
                                                        <Select defaultValue="alert">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select level" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="alert">Alert</SelectItem>
                                                                <SelectItem value="lethargic">Lethargic</SelectItem>
                                                                <SelectItem value="obtunded">Obtunded</SelectItem>
                                                                <SelectItem value="stuporous">Stuporous</SelectItem>
                                                                <SelectItem value="comatose">Comatose</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Notes</Label>
                                                    <Textarea
                                                        placeholder="Enter notes about general appearance"
                                                        className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="vitals">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4" />
                                                Vital Signs
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label htmlFor="temp" className="dark:text-gray-300">
                                                            Temperature
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="temp" defaultValue="36.2" className="dark:bg-gray-700 dark:text-gray-300" />
                                                            <span className="dark:text-gray-300">°C</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="pulse" className="dark:text-gray-300">
                                                            Pulse Rate
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="pulse" defaultValue="98" className="dark:bg-gray-700 dark:text-gray-300" />
                                                            <span className="dark:text-gray-300">bpm</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="resp" className="dark:text-gray-300">
                                                            Respiratory Rate
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="resp" defaultValue="16" className="dark:bg-gray-700 dark:text-gray-300" />
                                                            <span className="dark:text-gray-300">/min</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label htmlFor="bp-sys" className="dark:text-gray-300">
                                                            Blood Pressure (Systolic)
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="bp-sys" defaultValue="97" className="dark:bg-gray-700 dark:text-gray-300" />
                                                            <span className="dark:text-gray-300">mmHg</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="bp-dia" className="dark:text-gray-300">
                                                            Blood Pressure (Diastolic)
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input id="bp-dia" defaultValue="62" className="dark:bg-gray-700 dark:text-gray-300" />
                                                            <span className="dark:text-gray-300">mmHg</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="spo2" className="dark:text-gray-300">
                                                            SpO2
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Input
                                                                id="spo2"
                                                                placeholder="Enter SpO2"
                                                                className="dark:bg-gray-700 dark:text-gray-300"
                                                            />
                                                            <span className="dark:text-gray-300">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="heent">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Brain className="h-4 w-4" />
                                                HEENT (Head, Eyes, Ears, Nose, Throat)
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Head</Label>
                                                        <Textarea
                                                            placeholder="Enter head examination findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Eyes</Label>
                                                        <Textarea
                                                            placeholder="Enter eye examination findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Ears</Label>
                                                        <Textarea
                                                            placeholder="Enter ear examination findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Nose</Label>
                                                        <Textarea
                                                            placeholder="Enter nose examination findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Throat</Label>
                                                        <Textarea
                                                            placeholder="Enter throat examination findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="cardiovascular">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Heart className="h-4 w-4" />
                                                Cardiovascular System
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Heart Sounds</Label>
                                                        <Select defaultValue="normal">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select heart sounds" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="normal">Normal S1, S2</SelectItem>
                                                                <SelectItem value="s3">S3 Gallop</SelectItem>
                                                                <SelectItem value="s4">S4 Gallop</SelectItem>
                                                                <SelectItem value="murmur">Murmur Present</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Murmur Characteristics</Label>
                                                        <Textarea
                                                            placeholder="Describe any murmurs (location, radiation, intensity, etc.)"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Additional Cardiovascular Findings</Label>
                                                    <Textarea
                                                        placeholder="Enter additional cardiovascular findings"
                                                        className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="respiratory">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Lungs className="h-4 w-4" />
                                                Respiratory System
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Breath Sounds</Label>
                                                        <Select defaultValue="clear">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select breath sounds" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="clear">Clear bilaterally</SelectItem>
                                                                <SelectItem value="wheezes">Wheezes</SelectItem>
                                                                <SelectItem value="crackles">Crackles/Rales</SelectItem>
                                                                <SelectItem value="rhonchi">Rhonchi</SelectItem>
                                                                <SelectItem value="diminished">Diminished</SelectItem>
                                                                <SelectItem value="absent">Absent</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Respiratory Effort</Label>
                                                        <Select defaultValue="normal">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select respiratory effort" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="normal">Normal</SelectItem>
                                                                <SelectItem value="mild">Mild distress</SelectItem>
                                                                <SelectItem value="moderate">Moderate distress</SelectItem>
                                                                <SelectItem value="severe">Severe distress</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Additional Respiratory Findings</Label>
                                                    <Textarea
                                                        placeholder="Enter additional respiratory findings"
                                                        className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="abdominal">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Stethoscope className="h-4 w-4" />
                                                Abdominal Examination
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Inspection</Label>
                                                        <Textarea
                                                            placeholder="Enter abdominal inspection findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Auscultation</Label>
                                                        <Select defaultValue="normal">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select bowel sounds" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="normal">Normal bowel sounds</SelectItem>
                                                                <SelectItem value="hyperactive">Hyperactive</SelectItem>
                                                                <SelectItem value="hypoactive">Hypoactive</SelectItem>
                                                                <SelectItem value="absent">Absent</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Palpation</Label>
                                                        <Textarea
                                                            placeholder="Enter palpation findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Percussion</Label>
                                                        <Textarea
                                                            placeholder="Enter percussion findings"
                                                            className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="musculoskeletal">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Bone className="h-4 w-4" />
                                                Musculoskeletal System
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Range of Motion</Label>
                                                        <Select defaultValue="full">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select range of motion" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="full">Full ROM</SelectItem>
                                                                <SelectItem value="limited">Limited ROM</SelectItem>
                                                                <SelectItem value="severely">Severely limited ROM</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Strength</Label>
                                                        <Select defaultValue="5">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select strength" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="5">5/5 (Normal)</SelectItem>
                                                                <SelectItem value="4">4/5 (Active against resistance)</SelectItem>
                                                                <SelectItem value="3">3/5 (Active against gravity)</SelectItem>
                                                                <SelectItem value="2">2/5 (Active with gravity eliminated)</SelectItem>
                                                                <SelectItem value="1">1/5 (Trace contraction)</SelectItem>
                                                                <SelectItem value="0">0/5 (No contraction)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Additional Musculoskeletal Findings</Label>
                                                    <Textarea
                                                        placeholder="Enter additional musculoskeletal findings"
                                                        className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="neurological">
                                        <AccordionTrigger className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-4 w-4" />
                                                Neurological Examination
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 p-2">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Mental Status</Label>
                                                        <Select defaultValue="alert">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select mental status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="alert">Alert & Oriented x3</SelectItem>
                                                                <SelectItem value="confused">Confused</SelectItem>
                                                                <SelectItem value="drowsy">Drowsy</SelectItem>
                                                                <SelectItem value="lethargic">Lethargic</SelectItem>
                                                                <SelectItem value="obtunded">Obtunded</SelectItem>
                                                                <SelectItem value="comatose">Comatose</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Cranial Nerves</Label>
                                                        <Select defaultValue="intact">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select cranial nerves status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="intact">Intact</SelectItem>
                                                                <SelectItem value="abnormal">Abnormal</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Reflexes</Label>
                                                        <Select defaultValue="normal">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select reflexes" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="normal">Normal (2+)</SelectItem>
                                                                <SelectItem value="hyperreflexia">Hyperreflexia (3+/4+)</SelectItem>
                                                                <SelectItem value="hyporeflexia">Hyporeflexia (1+)</SelectItem>
                                                                <SelectItem value="areflexia">Areflexia (0)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Additional Neurological Findings</Label>
                                                    <Textarea
                                                        placeholder="Enter additional neurological findings"
                                                        className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t p-4 dark:border-gray-700">
                                <Button variant="outline">
                                    <Clipboard className="h-4 w-4 mr-1" />
                                    Load Previous Exam
                                </Button>
                                <Button>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save Examination
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Diagnosis Tab Content */}
                    <TabsContent value="diagnosis" className="mt-4">
                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">Diagnosis</CardTitle>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Diagnosis
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[600px]">
                                            <DialogHeader>
                                                <DialogTitle>Add New Diagnosis</DialogTitle>
                                                <DialogDescription>
                                                    Enter the diagnosis details below. Click save when you're done.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div>
                                                    <Label htmlFor="diagnosis-search" className="text-right">
                                                        Search Diagnosis
                                                    </Label>
                                                    <Command className="rounded-lg border shadow-md">
                                                        <CommandInput placeholder="Type to search..." />
                                                        <CommandList>
                                                            <CommandEmpty>No results found.</CommandEmpty>
                                                            <CommandGroup heading="Suggestions">
                                                                <CommandItem>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    <span>Hypertension</span>
                                                                </CommandItem>
                                                                <CommandItem>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    <span>Type 2 Diabetes Mellitus</span>
                                                                </CommandItem>
                                                                <CommandItem>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    <span>Asthma</span>
                                                                </CommandItem>
                                                                <CommandItem>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    <span>Irregular Menses</span>
                                                                </CommandItem>
                                                                <CommandItem>
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    <span>Polycystic Ovary Syndrome</span>
                                                                </CommandItem>
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="diagnosis-type" className="text-right">
                                                        Type
                                                    </Label>
                                                    <Select defaultValue="primary">
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="primary">Primary</SelectItem>
                                                            <SelectItem value="secondary">Secondary</SelectItem>
                                                            <SelectItem value="complication">Complication</SelectItem>
                                                            <SelectItem value="comorbidity">Comorbidity</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="diagnosis-status" className="text-right">
                                                        Status
                                                    </Label>
                                                    <Select defaultValue="active">
                                                        <SelectTrigger className="col-span-3">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="resolved">Resolved</SelectItem>
                                                            <SelectItem value="recurrent">Recurrent</SelectItem>
                                                            <SelectItem value="chronic">Chronic</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-4 items-center gap-4">
                                                    <Label htmlFor="diagnosis-date" className="text-right">
                                                        Date
                                                    </Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant={"outline"}
                                                                className={`col-span-3 justify-start text-left font-normal ${!date && "text-muted-foreground"
                                                                    }`}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="grid grid-cols-4 items-start gap-4">
                                                    <Label htmlFor="diagnosis-notes" className="text-right">
                                                        Notes
                                                    </Label>
                                                    <Textarea
                                                        id="diagnosis-notes"
                                                        placeholder="Enter any additional notes about this diagnosis"
                                                        className="col-span-3"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit">Save Diagnosis</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-4">
                                    <div className="p-3 border rounded-lg dark:border-gray-700">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge className="mb-2 bg-red-500">Primary</Badge>
                                                <h3 className="text-lg font-medium dark:text-gray-300">Irregular menses</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Added on: 06-05-2025</p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem>Change to secondary</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <Separator className="my-3" />
                                        <div className="text-sm dark:text-gray-300">
                                            <p>
                                                <span className="font-medium">Notes:</span> Patient reports irregular menstrual cycles for the
                                                past 6 months.
                                            </p>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <FileText className="h-3 w-3 mr-1" />
                                                View History
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <Pill className="h-3 w-3 mr-1" />
                                                Related Medications
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 border border-dashed rounded-lg dark:border-gray-700 flex flex-col items-center justify-center text-center">
                                        <Plus className="h-8 w-8 text-gray-400 dark:text-gray-600 mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Add another diagnosis by clicking the "Add Diagnosis" button
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Lab Request Tab Content */}
                    <TabsContent value="lab-request" className="mt-4">
                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                        Laboratory Requests
                                    </CardTitle>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-1" />
                                        New Lab Request
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium">Hematology</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="cbc" />
                                                        <Label htmlFor="cbc" className="dark:text-gray-300">
                                                            Complete Blood Count (CBC)
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="esr" />
                                                        <Label htmlFor="esr" className="dark:text-gray-300">
                                                            ESR
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="coagulation" />
                                                        <Label htmlFor="coagulation" className="dark:text-gray-300">
                                                            Coagulation Profile
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="blood-type" />
                                                        <Label htmlFor="blood-type" className="dark:text-gray-300">
                                                            Blood Type & Cross Match
                                                        </Label>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium">Chemistry</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="electrolytes" />
                                                        <Label htmlFor="electrolytes" className="dark:text-gray-300">
                                                            Electrolytes
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="liver-function" />
                                                        <Label htmlFor="liver-function" className="dark:text-gray-300">
                                                            Liver Function Tests
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="renal-function" />
                                                        <Label htmlFor="renal-function" className="dark:text-gray-300">
                                                            Renal Function Tests
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="lipid-profile" />
                                                        <Label htmlFor="lipid-profile" className="dark:text-gray-300">
                                                            Lipid Profile
                                                        </Label>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium">Endocrinology</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="thyroid" />
                                                        <Label htmlFor="thyroid" className="dark:text-gray-300">
                                                            Thyroid Function Tests
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="hba1c" />
                                                        <Label htmlFor="hba1c" className="dark:text-gray-300">
                                                            HbA1c
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="fasting-glucose" />
                                                        <Label htmlFor="fasting-glucose" className="dark:text-gray-300">
                                                            Fasting Blood Glucose
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id="hormonal-assay" />
                                                        <Label htmlFor="hormonal-assay" className="dark:text-gray-300">
                                                            Hormonal Assay
                                                        </Label>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div>
                                        <Label className="dark:text-gray-300">Special Instructions</Label>
                                        <Textarea
                                            placeholder="Enter any special instructions for the laboratory"
                                            className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline">
                                            <Printer className="h-4 w-4 mr-1" />
                                            Print Request
                                        </Button>
                                        <Button>
                                            <Save className="h-4 w-4 mr-1" />
                                            Submit Request
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Other tab contents would be defined here */}
                </Tabs>

                {/* Bottom Tabs */}
                <Tabs defaultValue="drugs" value={activeBottomTab} onValueChange={setActiveBottomTab} className=" mt-6">
                    <TabsList className="w-[70%] overflow-x-auto">
                        <TabsTrigger value="drugs" className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900">
                            <Pill className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Drugs</span>
                            <span className="inline md:hidden">Drugs</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="labs_report"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <Microscope className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Labs Report</span>
                            <span className="inline md:hidden">Labs</span>
                        </TabsTrigger>
                        <TabsTrigger value="plan" className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900">
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Plan</span>
                            <span className="inline md:hidden">Plan</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="surgical_notes"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <Scissors className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Surgical Notes</span>
                            <span className="inline md:hidden">Surgery</span>
                        </TabsTrigger>


                        <TabsTrigger
                            value="procedure"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <Stethoscope className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Procedure</span>
                            <span className="inline md:hidden">Proc</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="scan_xray"
                            className="data-[state=active]:bg-blue-200 dark:data-[state=active]:bg-blue-900"
                        >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            <span className="hidden md:inline">Scan/X-Ray</span>
                            <span className="inline md:hidden">Scan</span>
                        </TabsTrigger>

                    </TabsList>

                    {/* Drugs Tab Content */}
                    <TabsContent value="drugs" className="mt-4">
                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">Medications</CardTitle>
                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm">
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add Medication
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[600px]">
                                                <DialogHeader>
                                                    <DialogTitle>Add New Medication</DialogTitle>
                                                    <DialogDescription>
                                                        Enter medication details below. Click save when you're done.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div>
                                                        <Label htmlFor="medication-search" className="text-right">
                                                            Search Medication
                                                        </Label>
                                                        <Command className="rounded-lg border shadow-md">
                                                            <CommandInput placeholder="Type to search..." />
                                                            <CommandList>
                                                                <CommandEmpty>No results found.</CommandEmpty>
                                                                <CommandGroup heading="Suggestions">
                                                                    <CommandItem>
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        <span>FLUPHENAZINA DECANOATE 25MG</span>
                                                                    </CommandItem>
                                                                    <CommandItem>
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        <span>RISPERIDONE TABLET, 2 MG</span>
                                                                    </CommandItem>
                                                                    <CommandItem>
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        <span>ARTANE TABLET 5MG</span>
                                                                    </CommandItem>
                                                                    <CommandItem>
                                                                        <Check className="mr-2 h-4 w-4" />
                                                                        <span>CARBAMAZEPINE TABLET, 200 MG</span>
                                                                    </CommandItem>
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="dose">Dose</Label>
                                                            <Input id="dose" placeholder="e.g., 50mg" />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="frequency">Frequency</Label>
                                                            <Select defaultValue="bd">
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select frequency" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="stat">Stat</SelectItem>
                                                                    <SelectItem value="od">Once daily (OD)</SelectItem>
                                                                    <SelectItem value="bd">Twice daily (BD)</SelectItem>
                                                                    <SelectItem value="tds">Three times daily (TDS)</SelectItem>
                                                                    <SelectItem value="qds">Four times daily (QDS)</SelectItem>
                                                                    <SelectItem value="prn">As needed (PRN)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="duration">Duration (Days)</Label>
                                                            <Input id="duration" type="number" placeholder="e.g., 7" />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="route">Route</Label>
                                                            <Select defaultValue="oral">
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select route" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="oral">Oral</SelectItem>
                                                                    <SelectItem value="iv">Intravenous (IV)</SelectItem>
                                                                    <SelectItem value="im">Intramuscular (IM)</SelectItem>
                                                                    <SelectItem value="sc">Subcutaneous (SC)</SelectItem>
                                                                    <SelectItem value="topical">Topical</SelectItem>
                                                                    <SelectItem value="inhalation">Inhalation</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="instructions">Special Instructions</Label>
                                                        <Textarea
                                                            id="instructions"
                                                            placeholder="Enter any special instructions for this medication"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit">Add Medication</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        <Button variant="outline" size="sm">
                                            <Filter className="h-4 w-4 mr-1" />
                                            Filter
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <TableHead className="font-medium">Drugs</TableHead>
                                            <TableHead className="font-medium">Dose</TableHead>
                                            <TableHead className="font-medium">Freq</TableHead>
                                            <TableHead className="font-medium">Days</TableHead>
                                            <TableHead className="font-medium">Instructions</TableHead>
                                            <TableHead className="font-medium">Qty Served</TableHead>
                                            <TableHead className="font-medium">Date Time</TableHead>
                                            <TableHead className="font-medium">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <TableCell className="font-medium dark:text-gray-300">FLUPHENAZINA DECANOATE 25MG</TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input defaultValue="50mg" className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Select defaultValue="stat">
                                                    <SelectTrigger className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300">
                                                        <SelectValue placeholder="Freq" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="stat">Stat</SelectItem>
                                                        <SelectItem value="od">OD</SelectItem>
                                                        <SelectItem value="bd">BD</SelectItem>
                                                        <SelectItem value="tds">TDS</SelectItem>
                                                        <SelectItem value="qds">QDS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="Instructions" className="h-8 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">06-05-2025 1:28:54 PM</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="destructive" size="sm" className="h-6 w-6 p-0">
                                                        ×
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                                        □
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <TableCell className="font-medium dark:text-gray-300">RISPERIDONE TABLET, 2 MG</TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input defaultValue="2mg" className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Select defaultValue="bd">
                                                    <SelectTrigger className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300">
                                                        <SelectValue placeholder="Freq" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="stat">Stat</SelectItem>
                                                        <SelectItem value="od">OD</SelectItem>
                                                        <SelectItem value="bd">BD</SelectItem>
                                                        <SelectItem value="tds">TDS</SelectItem>
                                                        <SelectItem value="qds">QDS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="Instructions" className="h-8 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">06-05-2025 1:30:23 PM</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="destructive" size="sm" className="h-6 w-6 p-0">
                                                        ×
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                                        □
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <TableCell className="font-medium dark:text-gray-300">ARTANE TABLET 5MG</TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input defaultValue="5mg" className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Select defaultValue="bd">
                                                    <SelectTrigger className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300">
                                                        <SelectValue placeholder="Freq" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="stat">Stat</SelectItem>
                                                        <SelectItem value="od">OD</SelectItem>
                                                        <SelectItem value="bd">BD</SelectItem>
                                                        <SelectItem value="tds">TDS</SelectItem>
                                                        <SelectItem value="qds">QDS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="Instructions" className="h-8 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">06-05-2025 1:30:47 PM</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="destructive" size="sm" className="h-6 w-6 p-0">
                                                        ×
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                                        □
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <TableCell className="font-medium dark:text-gray-300">CARBAMAZEPINE TABLET, 200 MG</TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input defaultValue="200mg" className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Select defaultValue="bd">
                                                    <SelectTrigger className="h-8 w-20 dark:bg-gray-700 dark:text-gray-300">
                                                        <SelectValue placeholder="Freq" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="stat">Stat</SelectItem>
                                                        <SelectItem value="od">OD</SelectItem>
                                                        <SelectItem value="bd">BD</SelectItem>
                                                        <SelectItem value="tds">TDS</SelectItem>
                                                        <SelectItem value="qds">QDS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="Instructions" className="h-8 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">
                                                <Input placeholder="-" className="h-8 w-16 dark:bg-gray-700 dark:text-gray-300" />
                                            </TableCell>
                                            <TableCell className="dark:text-gray-300">06-05-2025 1:40:23 PM</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="destructive" size="sm" className="h-6 w-6 p-0">
                                                        ×
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                                        □
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter className="flex justify-between p-4 border-t dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Select defaultValue="10">
                                        <SelectTrigger className="w-16">
                                            <SelectValue placeholder="10" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">items per page</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled>
                                        Previous
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Next
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* Plan Tab Content */}
                    <TabsContent value="plan" className="mt-4">
                        <Card className="dark:bg-gray-800 dark:border-gray-700">
                            <CardHeader className="bg-gray-100 dark:bg-gray-700 py-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">Treatment Plan</CardTitle>
                                    <Button size="sm">
                                        <Save className="h-4 w-4 mr-1" />
                                        Save Plan
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-6">
                                    <div>
                                        <Label className="text-base font-medium dark:text-gray-300">Assessment</Label>
                                        <Textarea
                                            placeholder="Enter your assessment of the patient's condition"
                                            className="mt-2 min-h-[100px] dark:bg-gray-700 dark:text-gray-300"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-base font-medium dark:text-gray-300">Plan</Label>
                                        <div className="mt-2 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="dark:text-gray-300">Medications</Label>
                                                    <Textarea
                                                        placeholder="Outline medication plan"
                                                        className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Investigations</Label>
                                                    <Textarea
                                                        placeholder="Outline investigation plan"
                                                        className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="dark:text-gray-300">Procedures</Label>
                                                    <Textarea
                                                        placeholder="Outline procedure plan"
                                                        className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="dark:text-gray-300">Consultations</Label>
                                                    <Textarea
                                                        placeholder="Outline consultation plan"
                                                        className="mt-2 h-24 dark:bg-gray-700 dark:text-gray-300"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="dark:text-gray-300">Patient Education</Label>
                                                <Textarea
                                                    placeholder="Outline patient education plan"
                                                    className="mt-2 dark:bg-gray-700 dark:text-gray-300"
                                                />
                                            </div>

                                            <div>
                                                <Label className="dark:text-gray-300">Follow-up Plan</Label>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                                    <div>
                                                        <Label className="dark:text-gray-300">Follow-up Type</Label>
                                                        <Select defaultValue="clinic">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="clinic">Clinic Visit</SelectItem>
                                                                <SelectItem value="phone">Phone Call</SelectItem>
                                                                <SelectItem value="telemedicine">Telemedicine</SelectItem>
                                                                <SelectItem value="lab">Lab Check</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Follow-up Timeframe</Label>
                                                        <Select defaultValue="2-weeks">
                                                            <SelectTrigger className="mt-2 dark:bg-gray-700 dark:text-gray-300">
                                                                <SelectValue placeholder="Select timeframe" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1-week">1 Week</SelectItem>
                                                                <SelectItem value="2-weeks">2 Weeks</SelectItem>
                                                                <SelectItem value="1-month">1 Month</SelectItem>
                                                                <SelectItem value="3-months">3 Months</SelectItem>
                                                                <SelectItem value="6-months">6 Months</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="dark:text-gray-300">Follow-up Date</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={`w-full mt-2 justify-start text-left font-normal dark:bg-gray-700 dark:text-gray-300 ${!date && "text-muted-foreground"
                                                                        }`}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Other bottom tab contents would be defined here */}
                </Tabs>

                {/* Footer with action buttons */}
                <div className="flex justify-between mt-6 mb-10">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2">
                            <Printer className="h-4 w-4" />
                            Print Record
                        </Button>
                        <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                    <Button className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>
                </div>
            </div>

        </div>
    )
}
