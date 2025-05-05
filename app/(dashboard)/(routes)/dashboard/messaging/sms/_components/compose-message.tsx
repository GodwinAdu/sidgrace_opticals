"use client"

import { useState } from "react"
import { CalendarIcon, Send, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
// import { TimePickerDemo } from "@/components/time-picker"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { mockContacts } from "./mock-data"
import { TimePickerDemo } from "./time-picker"

export default function ComposeMessage() {
    const [message, setMessage] = useState("")
    const [selectedContacts, setSelectedContacts] = useState<typeof mockContacts>([])
    const [showContactSelector, setShowContactSelector] = useState(false)
    const [showScheduler, setShowScheduler] = useState(false)
    const [date, setDate] = useState<Date | undefined>(undefined)
    const [isScheduled, setIsScheduled] = useState(false)

    const MAX_SMS_LENGTH = 160
    const messageCount = Math.ceil(message.length / MAX_SMS_LENGTH)
    const charactersLeft = MAX_SMS_LENGTH - (message.length % MAX_SMS_LENGTH)

    const handleSend = () => {
        if (message.trim() === "") {
           
            return
        }

        if (selectedContacts.length === 0) {
           
            return
        }

        const action = isScheduled ? "scheduled" : "sent"
        const scheduledInfo = isScheduled ? ` for ${date?.toLocaleDateString()} ${date?.toLocaleTimeString()}` : ""

      

        setMessage("")
        setSelectedContacts([])
        setDate(undefined)
        setIsScheduled(false)
    }

    const toggleContact = (contact: (typeof mockContacts)[0]) => {
        if (selectedContacts.some((c) => c.id === contact.id)) {
            setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id))
        } else {
            setSelectedContacts([...selectedContacts, contact])
        }
    }

    const removeContact = (id: string) => {
        setSelectedContacts(selectedContacts.filter((c) => c.id !== id))
    }

    const handleSchedule = () => {
        if (date) {
            setIsScheduled(true)
            setShowScheduler(false)
           
        } else {
            // toast({
            //     title: "Error",
            //     description: "Please select a date and time",
            //     variant: "destructive",
            // })
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <Card>
                <CardHeader>
                    <CardTitle>Compose Message</CardTitle>
                    <CardDescription>Create and send SMS messages to individuals or groups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">Recipients</label>
                            <Button variant="outline" size="sm" onClick={() => setShowContactSelector(!showContactSelector)}>
                                <Users className="h-4 w-4 mr-2" />
                                Select Contacts
                            </Button>
                        </div>

                        {selectedContacts.length > 0 ? (
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                                {selectedContacts.map((contact) => (
                                    <Badge key={contact.id} variant="secondary" className="flex items-center gap-1">
                                        {contact.name}
                                        <button
                                            onClick={() => removeContact(contact.id)}
                                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                            <span className="sr-only">Remove</span>
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground p-2 border rounded-md">No recipients selected</div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium">Message</label>
                        <Textarea
                            placeholder="Type your message here..."
                            className="mt-2 resize-none h-40"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>
                                {message.length} characters
                                {messageCount > 1 && ` (${messageCount} messages)`}
                            </span>
                            <span>{charactersLeft} characters left in current message</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        <Popover open={showScheduler} onOpenChange={setShowScheduler}>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {isScheduled ? "Scheduled" : "Schedule"}
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
                    <Button onClick={handleSend}>
                        <Send className="mr-2 h-4 w-4" />
                        {isScheduled ? "Schedule" : "Send"} Message
                    </Button>
                </CardFooter>
            </Card>

            {showContactSelector && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Contacts</CardTitle>
                        <CardDescription>Choose recipients for your message</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-2">
                                {mockContacts.map((contact) => (
                                    <div
                                        key={contact.id}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted",
                                            selectedContacts.some((c) => c.id === contact.id) && "bg-muted",
                                        )}
                                        onClick={() => toggleContact(contact)}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                                            <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{contact.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" onClick={() => setShowContactSelector(false)}>
                            Done ({selectedContacts.length} selected)
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}
