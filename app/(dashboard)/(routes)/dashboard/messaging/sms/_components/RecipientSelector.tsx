"use client"

import { Search, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { IPatient } from "@/types/notification.types"

interface RecipientSelectorProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    searchResults: IPatient[]
    selectedContacts: any[]
    isSearching: boolean
    onSearch: () => void
    onToggleContact: (contact: IPatient) => void
    onClose: () => void
}

export function RecipientSelector({
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedContacts,
    isSearching,
    onSearch,
    onToggleContact,
    onClose,
}: RecipientSelectorProps) {
    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Search Patients
                </CardTitle>
                <div className="relative">
                    <Input
                        placeholder="Search by name, phone, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSearch()}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={onSearch}
                        disabled={isSearching}
                        className="absolute inset-y-0 right-2 flex items-center justify-center disabled:opacity-50"
                    >
                        {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                    {searchResults.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <p className="text-sm">No patients found. Try searching with different keywords.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {searchResults.map((patient) => (
                                <div
                                    key={patient._id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                                        selectedContacts.some((c) => c._id === patient._id) && "bg-muted border border-primary/20",
                                    )}
                                    onClick={() => onToggleContact(patient)}
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={patient.avatar || "/placeholder.svg"} alt={patient.fullName} />
                                        <AvatarFallback className="text-xs">
                                            {patient.fullName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{patient.fullName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{patient.phone}</p>
                                        {patient.email && <p className="text-xs text-muted-foreground truncate">{patient.email}</p>}
                                    </div>
                                    {patient.status === "inactive" && (
                                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Inactive</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>

            <CardFooter>
                <Button variant="outline" className="w-full bg-transparent" onClick={onClose}>
                    Done ({selectedContacts.length} selected)
                </Button>
            </CardFooter>
        </Card>
    )
}
