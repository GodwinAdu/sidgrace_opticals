"use client"

import { useState } from "react"
import { CalendarIcon, Check, Clock, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockMessageHistory } from "./_components/mock-data"


export default function MessageHistory() {
  const [messages, setMessages] = useState(mockMessageHistory)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })

  const filteredMessages = messages.filter((message) => {
    // Search filter
    const matchesSearch =
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.recipient.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus = !statusFilter || message.status === statusFilter

    // Date filter
    let matchesDate = true
    if (dateRange.from) {
      const messageDate = new Date(message.sentAt)
      matchesDate = messageDate >= dateRange.from

      if (dateRange.to) {
        matchesDate = matchesDate && messageDate <= dateRange.to
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter(undefined)
    setDateRange({ from: undefined, to: undefined })
  }

  const hasActiveFilters = searchQuery || statusFilter || dateRange.from

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search messages..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                    </>
                  ) : (
                    dateRange.from.toLocaleDateString()
                  )
                ) : (
                  "Date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <CardDescription>View and search your sent and scheduled messages</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {filteredMessages.length > 0 ? (
                filteredMessages.map((message) => (
                  <div key={message.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{message.recipient}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(message.sentAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          message.status === "delivered"
                            ? "default"
                            : message.status === "sent"
                              ? "secondary"
                              : message.status === "scheduled"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {message.status === "delivered" && <Check className="mr-1 h-3 w-3" />}
                        {message.status}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">{message.content}</p>
                    {message.deliveryReport && (
                      <div className="mt-2 text-xs text-muted-foreground">{message.deliveryReport}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No messages found matching your filters</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
