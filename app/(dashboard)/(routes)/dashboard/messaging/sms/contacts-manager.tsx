"use client"

import { useState } from "react"
import { Edit, Search, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockContacts } from "./_components/mock-data"


export default function ContactsManager() {
    const [contacts, setContacts] = useState(mockContacts)
    const [searchQuery, setSearchQuery] = useState("")
    const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", group: "" })
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

    const filteredContacts = contacts.filter(
        (contact) =>
            contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.phone.includes(searchQuery) ||
            contact.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const handleAddContact = () => {
        if (!newContact.name || !newContact.phone) {

            return
        }

        const id = Math.random().toString(36).substring(2, 9)
        setContacts([
            ...contacts,
            {
                id,
                ...newContact,
                avatar: `/placeholder.svg?height=40&width=40&text=${newContact.name.substring(0, 1)}`,
            },
        ])

        setNewContact({ name: "", phone: "", email: "", group: "" })
        setIsAddDialogOpen(false)


    }

    const handleDeleteContact = (id: string) => {
        const contactToDelete = contacts.find((c) => c.id === id)
        setContacts(contacts.filter((c) => c.id !== id))


    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search contacts..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Contact
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Contact</DialogTitle>
                            <DialogDescription>Add a new contact to your address book</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email (optional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="group">Group (optional)</Label>
                                <Input
                                    id="group"
                                    value={newContact.group}
                                    onChange={(e) => setNewContact({ ...newContact, group: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddContact}>Add Contact</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Contacts</CardTitle>
                    <CardDescription>Manage your contacts and groups</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                            {filteredContacts.length > 0 ? (
                                filteredContacts.map((contact) => (
                                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                                                <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{contact.name}</p>
                                                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                                {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
                                                {contact.group && <p className="text-xs text-muted-foreground mt-1">Group: {contact.group}</p>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon">
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.id)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    {searchQuery ? "No contacts match your search" : "No contacts found"}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter>
                    <p className="text-sm text-muted-foreground">
                        {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
