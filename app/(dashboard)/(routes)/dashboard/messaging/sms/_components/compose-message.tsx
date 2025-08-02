"use client"

import { Send, X, MessageSquare, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { BulkSendProgressComponent } from "./BulkProgressSender"
import { TimePickerDemo } from "./time-picker"
import { RecipientSelector } from "./RecipientSelector"
import { useNotificationForm } from "@/hooks/use-notification"



interface ComposeMessageProps {
    roles: IRole[]
}

export default function ComposeMessage({ roles = [] }: ComposeMessageProps) {
    const {
        formData,
        updateFormData,
        selectedContacts,
        searchResults,
        searchQuery,
        setSearchQuery,
        date,
        setDate,
        showContactSelector,
        setShowContactSelector,
        showScheduler,
        setShowScheduler,
        isSearching,
        isSending,
        bulkSendProgress,
        messageCount,
        charactersLeft,
        getBulkRecipientsCount,
        handleSearch,
        toggleContact,
        removeContact,
        handleSchedule,
        handleSubmit,
    } = useNotificationForm()

    const getUniqueGroups = () => {
        const groups = roles.map((role) => role.displayName).filter(Boolean)
        return [...new Set(groups)]
    }

    const bulkRecipientsCount = getBulkRecipientsCount(roles.map((r) => r.displayName))
    const estimatedCost = (formData.sendMode === "individual" ? selectedContacts.length : bulkRecipientsCount) * 0.05

    return (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Compose Message
                        </CardTitle>
                        <CardDescription>Create and send SMS messages to patients individually or in bulk</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Send Mode Selection */}
                        <div className="space-y-4">
                            <Label className="text-base font-medium">Delivery Mode</Label>
                            <RadioGroup
                                value={formData.sendMode}
                                onValueChange={(value: "individual" | "bulk") => updateFormData({ sendMode: value })}
                                className="grid grid-cols-2 gap-4"
                            >
                                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value="individual" id="individual" />
                                    <Label htmlFor="individual" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Individual Recipients</div>
                                        <div className="text-sm text-muted-foreground">Select specific patients</div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value="bulk" id="bulk" />
                                    <Label htmlFor="bulk" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Bulk Send</div>
                                        <div className="text-sm text-muted-foreground">Send to patient groups</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <Separator />

                        {/* Recipient Selection */}
                        {formData.sendMode === "individual" ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-medium">Select Recipients</Label>
                                    <Button variant="outline" size="sm" onClick={() => setShowContactSelector(!showContactSelector)}>
                                        <Users className="h-4 w-4 mr-2" />
                                        {selectedContacts.length > 0 ? `${selectedContacts.length} Selected` : "Select Patients"}
                                    </Button>
                                </div>

                                {selectedContacts.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/20">
                                        {selectedContacts.map((contact) => (
                                            <Badge key={contact._id} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                                                <span>{contact.fullName}</span>
                                                <button
                                                    onClick={() => removeContact(contact._id)}
                                                    className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                    <span className="sr-only">Remove {contact.fullName}</span>
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/10 text-center">
                                        No patients selected. Click "Select Patients" to choose recipients.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Label className="text-base font-medium">Bulk Send Options</Label>

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="selectAll"
                                            checked={formData.allContacts}
                                            onCheckedChange={(checked) => {
                                                updateFormData({
                                                    allContacts: !!checked,
                                                    selectedRole: checked ? [] : formData.selectedRole,
                                                })
                                            }}
                                        />
                                        <Label htmlFor="selectAll" className="font-medium cursor-pointer">
                                            Send to All Active Patients
                                        </Label>
                                    </div>

                                    {!formData.allContacts && (
                                        <div className="space-y-3">
                                            <Label className="text-sm font-medium">Or select by patient categories:</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {getUniqueGroups().map((group) => (
                                                    <div key={group} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={group}
                                                            checked={formData.selectedRole.includes(group)}
                                                            onCheckedChange={(checked) => {
                                                                const newSelectedRoles = checked
                                                                    ? [...formData.selectedRole, group]
                                                                    : formData.selectedRole.filter((g) => g !== group)
                                                                updateFormData({ selectedRole: newSelectedRoles })
                                                            }}
                                                        />
                                                        <Label htmlFor={group} className="text-sm cursor-pointer">
                                                            {group}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-900">Recipients Summary</span>
                                            <span className="text-lg font-bold text-blue-600">{bulkRecipientsCount}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <p>• Estimated cost: ${estimatedCost.toFixed(2)}</p>
                                            <p>• Message parts: {messageCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Bulk Send Progress */}
                        <BulkSendProgressComponent progress={bulkSendProgress} />

                        {/* Message Composition */}
                        <div className="space-y-4">
                            <Label htmlFor="message" className="text-base font-medium">
                                Message Content
                            </Label>
                            <Textarea
                                id="message"
                                placeholder="Type your message here..."
                                className="min-h-[120px] resize-none"
                                value={formData.message}
                                onChange={(e) => updateFormData({ message: e.target.value })}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {formData.message.length} characters
                                    {messageCount > 1 && ` (${messageCount} SMS parts)`}
                                </span>
                                <span className={charactersLeft < 20 ? "text-orange-600 font-medium" : ""}>
                                    {charactersLeft} characters remaining
                                </span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        <div className="flex gap-2">
                            <Popover open={showScheduler} onOpenChange={setShowScheduler}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                                        <Clock className="h-4 w-4" />
                                        {formData.isScheduled ? "Scheduled" : "Schedule"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    <div className="p-3 border-t">
                                        <TimePickerDemo setDate={setDate} date={date} />
                                    </div>
                                    <div className="flex justify-end gap-2 p-3 border-t">
                                        <Button variant="outline" size="sm" onClick={() => setShowScheduler(false)}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleSchedule}>
                                            Schedule
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={isSending || bulkSendProgress.isActive}
                            className="flex items-center gap-2"
                        >
                            {isSending ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {formData.isScheduled ? "Schedule Message" : "Send Message"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Recipient Selector Sidebar */}
            {showContactSelector && (
                <div className="lg:col-span-1">
                    <RecipientSelector
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchResults={searchResults}
                        selectedContacts={selectedContacts}
                        isSearching={isSearching}
                        onSearch={handleSearch}
                        onToggleContact={toggleContact}
                        onClose={() => setShowContactSelector(false)}
                    />
                </div>
            )}
        </div>
    )
}
