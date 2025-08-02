"use client"

import type React from "react"
import { useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
    Phone,
    PlusIcon,
    InfoIcon,
    CalendarIcon,
    ClockIcon,
    TagIcon,
    SplitIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    XIcon,
} from "lucide-react"
import { calculateSmsSegments, cn, replaceVariables } from "@/lib/utils"


interface MessageVariant {
    id: string
    content: string
    percentage: number
}

export default function SMSTemplateCreator() {
    const [templateName, setTemplateName] = useState("")
    const [recipientType, setRecipientType] = useState("all")
    const [isEnabled, setIsEnabled] = useState(true)
    const [showPreview, setShowPreview] = useState(false)
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined)
    const [scheduledTime, setScheduledTime] = useState("09:00") // Default time
    const [tagsInput, setTagsInput] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [messageVariants, setMessageVariants] = useState<MessageVariant[]>([
        { id: crypto.randomUUID(), content: "", percentage: 100 },
    ])
    const [activeVariantId, setActiveVariantId] = useState(messageVariants[0].id)
    const [isVariantsCollapsibleOpen, setIsVariantsCollapsibleOpen] = useState(false)

    // Using a ref to store textarea elements for direct manipulation (e.g., cursor position)
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

    const dynamicVariables = [
        { name: "name", description: "Recipient's Name" },
        { name: "date", description: "Current Date" },
        { name: "time", description: "Current Time" },
        { name: "appointment_time", description: "Appointment Time" },
        { name: "clinic_name", description: "Clinic Name" },
        { name: "doctor_name", description: "Doctor's Name" },
        { name: "otp", description: "One-Time Password" },
    ]

    const exampleData = {
        name: "Dr. Smith",
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "hh:mm a"),
        appointment_time: "2:30 PM",
        clinic_name: "HealthPlus Clinic",
        doctor_name: "Dr. Alice",
        otp: "123456",
    }

    // Memoize the active message content for efficient re-renders
    const activeMessageContent = useMemo(
        () => messageVariants.find((v) => v.id === activeVariantId)?.content || "",
        [messageVariants, activeVariantId],
    )

    // Update message content for a specific variant
    const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>, variantId: string) => {
        setMessageVariants((prevVariants) =>
            prevVariants.map((v) => (v.id === variantId ? { ...v, content: e.target.value } : v)),
        )
    }, [])

    // Handle tags input (comma-separated)
    const handleTagsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTagsInput(e.target.value)
        setTags(
            e.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
        )
    }

    // Insert a dynamic variable into the active textarea at the current cursor position
    const insertVariable = useCallback(
        (variable: string) => {
            const textarea = textareaRefs.current[activeVariantId]
            if (textarea) {
                const start = textarea.selectionStart
                const end = textarea.selectionEnd
                const newText =
                    activeMessageContent.substring(0, start) + `{{${variable}}}` + activeMessageContent.substring(end)

                setMessageVariants((prevVariants) =>
                    prevVariants.map((v) => (v.id === activeVariantId ? { ...v, content: newText } : v)),
                )

                // Restore cursor position after insertion
                setTimeout(() => {
                    textarea.focus()
                    textarea.setSelectionRange(start + `{{${variable}}}`.length, start + `{{${variable}}}`.length)
                }, 0)
            }
        },
        [activeMessageContent, activeVariantId],
    )

    // Add a new message variant
    const addMessageVariant = () => {
        const newVariantId = crypto.randomUUID()
        setMessageVariants((prev) => [...prev, { id: newVariantId, content: "", percentage: 0 }])
        setActiveVariantId(newVariantId) // Set new variant as active
        setIsVariantsCollapsibleOpen(true) // Ensure collapsible is open when adding
    }

    // Remove a message variant
    const removeMessageVariant = (id: string) => {
        setMessageVariants((prev) => {
            const filtered = prev.filter((v) => v.id !== id)
            if (filtered.length === 0) {
                // If all removed, add a new empty one and set it as active
                const newId = crypto.randomUUID()
                setActiveVariantId(newId)
                return [{ id: newId, content: "", percentage: 100 }]
            }
            if (activeVariantId === id) {
                // If active variant is removed, set the first remaining as active
                setActiveVariantId(filtered[0].id)
            }
            return filtered
        })
    }

    // Handle percentage change for a message variant
    const handleVariantPercentageChange = (id: string, value: string) => {
        const percentage = Math.max(0, Math.min(100, Number.parseInt(value) || 0))
        setMessageVariants((prev) => prev.map((v) => (v.id === id ? { ...v, percentage: percentage } : v)))
    }

    // Calculate SMS details for the active message content
    const smsDetails = calculateSmsSegments(activeMessageContent)
    // Generate preview message by replacing variables with example data
    const previewMessage = replaceVariables(activeMessageContent, exampleData)

    // Handle save confirmation
    const handleConfirmSave = () => {
        // In a real application, you would send this data to your backend
        console.log({
            templateName,
            recipientType,
            messageVariants,
            isEnabled,
            scheduledDate: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : "Not Scheduled",
            scheduledTime,
            tags,
            smsDetails: smsDetails,
        })
        alert("Template data logged to console. (This is a demo submission)")
        // Optionally reset form or navigate
    }

    return (
        <div className="flex flex-col lg:flex-row justify-center items-start min-h-screen bg-gray-50 dark:bg-gray-950 p-4 gap-4">
            <Card className="w-full max-w-2xl lg:flex-1">
                <CardHeader>
                    <CardTitle>Create SMS Template</CardTitle>
                    <CardDescription>Design your message, choose recipients, and configure advanced options.</CardDescription>
                </CardHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                    {" "}
                    {/* Prevent default form submission for AlertDialog */}
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                placeholder="e.g., Appointment Reminder, Promotion Alert"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="recipient-type">Send to</Label>
                            <Select value={recipientType} onValueChange={setRecipientType}>
                                <SelectTrigger id="recipient-type">
                                    <SelectValue placeholder="Select recipient type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="doctors">Doctors</SelectItem>
                                    <SelectItem value="patients">Patients</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="admins">Admins</SelectItem>
                                    <SelectItem value="custom">Custom Group (requires further setup)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Message Variants / A/B Testing */}
                        <Collapsible
                            className="grid gap-2"
                            open={isVariantsCollapsibleOpen}
                            onOpenChange={setIsVariantsCollapsibleOpen}
                        >
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between px-0">
                                    <div className="flex items-center gap-2">
                                        <SplitIcon className="h-4 w-4" />
                                        <span className="font-semibold">
                                            Message Content {messageVariants.length > 1 ? `(${messageVariants.length} Variants)` : ""}
                                        </span>
                                    </div>
                                    {isVariantsCollapsibleOpen ? (
                                        <ChevronUpIcon className="h-4 w-4" />
                                    ) : (
                                        <ChevronDownIcon className="h-4 w-4" />
                                    )}
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4">
                                {messageVariants.map((variant, index) => (
                                    <div
                                        key={variant.id}
                                        className={cn(
                                            "border rounded-md p-4 relative",
                                            activeVariantId === variant.id && "border-blue-500 ring-2 ring-blue-500/50", // Highlight active variant
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <Label htmlFor={`message-content-${variant.id}`}>
                                                Variant {index + 1}
                                                {messageVariants.length > 1 && (
                                                    <span className="ml-2 text-sm text-muted-foreground">
                                                        (Active: {activeVariantId === variant.id ? "Yes" : "No"})
                                                    </span>
                                                )}
                                            </Label>
                                            {messageVariants.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeMessageVariant(variant.id)}
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    aria-label={`Remove variant ${index + 1}`}
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Textarea
                                                ref={(el) => (textareaRefs.current[variant.id] = el)}
                                                id={`message-content-${variant.id}`}
                                                placeholder="Type your SMS message here..."
                                                value={variant.content}
                                                onChange={(e) => handleMessageChange(e, variant.id)}
                                                className="min-h-[120px] pr-10" // Add padding for the button
                                                required
                                                onFocus={() => setActiveVariantId(variant.id)} // Set active on focus
                                            />
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        aria-label="Insert dynamic variable"
                                                    >
                                                        <PlusIcon className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 p-2">
                                                    <div className="grid gap-1">
                                                        <p className="text-sm font-medium mb-1">Insert Variable</p>
                                                        {dynamicVariables.map((variable) => (
                                                            <Button
                                                                key={variable.name}
                                                                variant="ghost"
                                                                className="justify-start h-auto py-1 px-2 text-sm"
                                                                onClick={() => insertVariable(variable.name)}
                                                            >
                                                                <span className="font-mono text-xs mr-2 text-blue-600 dark:text-blue-400">
                                                                    {`{{${variable.name}}}`}
                                                                </span>
                                                                {variable.description}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                                            <div className="flex items-center gap-1">
                                                <span>Characters: {calculateSmsSegments(variant.content).charCount}</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <InfoIcon className="h-3 w-3 cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                {calculateSmsSegments(variant.content).encoding === "GSM-7"
                                                                    ? "GSM-7 encoding (standard characters)"
                                                                    : "UCS-2 encoding (emojis or special characters)"}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <p
                                                className={cn(
                                                    calculateSmsSegments(variant.content).segments > 1 && "text-red-500 dark:text-red-400",
                                                )}
                                            >
                                                SMS Segments: {calculateSmsSegments(variant.content).segments} (Max{" "}
                                                {calculateSmsSegments(variant.content).charsPerSegment} chars/segment)
                                            </p>
                                        </div>
                                        {calculateSmsSegments(variant.content).segments > 1 && (
                                            <p className="text-sm text-orange-500 dark:text-orange-400 mt-1">
                                                This variant will be sent as {calculateSmsSegments(variant.content).segments} SMS messages.
                                            </p>
                                        )}
                                        {calculateSmsSegments(variant.content).encoding === "UCS-2" && (
                                            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                                This variant contains non-GSM characters (e.g., emojis), reducing character limit per SMS.
                                            </p>
                                        )}
                                        {messageVariants.length > 1 && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <Label htmlFor={`percentage-${variant.id}`} className="whitespace-nowrap">
                                                    Distribution %
                                                </Label>
                                                <Input
                                                    id={`percentage-${variant.id}`}
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={variant.percentage}
                                                    onChange={(e) => handleVariantPercentageChange(variant.id, e.target.value)}
                                                    className="w-20"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <Button variant="outline" type="button" onClick={addMessageVariant} className="w-full bg-transparent">
                                    <PlusIcon className="h-4 w-4 mr-2" /> Add Message Variant
                                </Button>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Scheduling */}
                        <Collapsible className="grid gap-2">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between px-0">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        <span className="font-semibold">Scheduling</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !scheduledDate && "text-muted-foreground",
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="scheduled-time">Scheduled Time</Label>
                                    <div className="relative">
                                        <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="scheduled-time"
                                            type="time"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Tags */}
                        <Collapsible className="grid gap-2">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between px-0">
                                    <div className="flex items-center gap-2">
                                        <TagIcon className="h-4 w-4" />
                                        <span className="font-semibold">Tags</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="tags-input">Tags (comma-separated)</Label>
                                    <Input
                                        id="tags-input"
                                        placeholder="e.g., marketing, urgent, reminder"
                                        value={tagsInput}
                                        onChange={handleTagsInputChange}
                                    />
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CollapsibleContent>
                        </Collapsible>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="enable-template" className="text-sm font-medium leading-none">
                                    Enable Template
                                </Label>
                                <p className="text-sm text-muted-foreground">Make this template active and available for sending.</p>
                            </div>
                            <Switch id="enable-template" checked={isEnabled} onCheckedChange={setIsEnabled} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => setShowPreview(!showPreview)}>
                            {showPreview ? "Hide Preview" : "Show Preview"}
                        </Button>
                        <Button variant="outline" type="button">
                            Send Test SMS
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button">Save Template</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Template Details</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Please review the details before saving your SMS template.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid gap-2 text-sm">
                                    <p>
                                        <span className="font-medium">Template Name:</span> {templateName || "N/A"}
                                    </p>
                                    <p>
                                        <span className="font-medium">Recipient Type:</span> {recipientType}
                                    </p>
                                    <p>
                                        <span className="font-medium">Status:</span> {isEnabled ? "Enabled" : "Disabled"}
                                    </p>
                                    <p>
                                        <span className="font-medium">Scheduled:</span>{" "}
                                        {scheduledDate ? `${format(scheduledDate, "PPP")} at ${scheduledTime}` : "Not Scheduled"}
                                    </p>
                                    <p>
                                        <span className="font-medium">Tags:</span> {tags.length > 0 ? tags.join(", ") : "None"}
                                    </p>
                                    <div className="mt-2">
                                        <p className="font-medium">Message Variants:</p>
                                        {messageVariants.map((variant, index) => (
                                            <div key={variant.id} className="ml-4 mt-1 p-2 border rounded-md">
                                                <p className="font-semibold">
                                                    Variant {index + 1} ({variant.percentage}% distribution)
                                                </p>
                                                <p className="text-muted-foreground break-words whitespace-pre-wrap">
                                                    {variant.content || "Empty"}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Chars: {calculateSmsSegments(variant.content).charCount}, Segments:{" "}
                                                    {calculateSmsSegments(variant.content).segments}, Encoding:{" "}
                                                    {calculateSmsSegments(variant.content).encoding}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirmSave}>Save Template</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </form>
            </Card>

            {showPreview && (
                <Card className="w-full max-w-sm lg:sticky lg:top-4 lg:ml-4">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">SMS Preview</CardTitle>
                        <Phone className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg shadow-inner min-h-[150px] flex flex-col justify-end">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md text-sm break-words">
                                {previewMessage.split("\n").map((line, index) => (
                                    <p key={index} className="mb-1 last:mb-0">
                                        {line.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
                                            if (part.startsWith("{{") && part.endsWith("}}")) {
                                                return (
                                                    <Badge key={i} variant="secondary" className="mx-0.5">
                                                        {part}
                                                    </Badge>
                                                )
                                            }
                                            return part
                                        })}
                                    </p>
                                ))}
                                {activeMessageContent.length === 0 && (
                                    <p className="text-muted-foreground italic">Your message will appear here...</p>
                                )}
                            </div>
                            <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                            <p>
                                <span className="font-medium">Previewing Variant:</span>{" "}
                                {messageVariants.findIndex((v) => v.id === activeVariantId) + 1}
                            </p>
                            <p>
                                <span className="font-medium">Previewing with Example Data:</span>
                            </p>
                            <ul className="list-disc list-inside text-xs mt-1">
                                {Object.entries(exampleData).map(([key, value]) => (
                                    <li key={key}>
                                        <span className="font-mono text-blue-600 dark:text-blue-400 mr-1">{`{{${key}}}`}:</span>
                                        {value}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
