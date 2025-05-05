"use client"

import { useState } from "react"
import { Copy, Edit, FileText, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { mockTemplates } from "./_components/mock-data"


export default function TemplatesManager() {
    const [templates, setTemplates] = useState(mockTemplates)
    const [newTemplate, setNewTemplate] = useState({ name: "", content: "" })
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

    const handleAddTemplate = () => {
        if (!newTemplate.name || !newTemplate.content) {
            toast.error("Template name and content are required",)
            return
        }

        const id = Math.random().toString(36).substring(2, 9)
        setTemplates([...templates, { id, ...newTemplate }])

        setNewTemplate({ name: "", content: "" })
        setIsAddDialogOpen(false)

        toast.success( `"${newTemplate.name}" has been added to your templates`)
    }

    const handleDeleteTemplate = (id: string) => {
        const templateToDelete = templates.find((t) => t.id === id)
        setTemplates(templates.filter((t) => t.id !== id))

        toast.success( `"${templateToDelete?.name}" has been removed from your templates`)
    }

    const handleCopyTemplate = (content: string) => {
        navigator.clipboard.writeText(content)

        toast.success("Template content has been copied to clipboard")
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Message Templates</h2>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Template</DialogTitle>
                            <DialogDescription>Create a reusable message template with placeholders</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Template Name</Label>
                                <Input
                                    id="name"
                                    value={newTemplate.name}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="content">Template Content</Label>
                                <Textarea
                                    id="content"
                                    rows={6}
                                    placeholder="Type your template here. Use {name} for dynamic name insertion."
                                    value={newTemplate.content}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use curly braces for placeholders, e.g., {"{name}"}, {"{date}"}, etc.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddTemplate}>Save Template</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Card key={template.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    {template.name}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleCopyTemplate(template.content)}>
                                        <Copy className="h-4 w-4" />
                                        <span className="sr-only">Copy</span>
                                    </Button>
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </div>
                            </div>
                            <CardDescription>
                                {template.content.length > 50 ? `${template.content.substring(0, 50)}...` : template.content}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted p-3 rounded-md text-sm">
                                <ScrollArea className="h-24">{template.content}</ScrollArea>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => handleCopyTemplate(template.content)}>
                                Use Template
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="text-center py-12 border rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No templates yet</h3>
                    <p className="text-muted-foreground mt-2">Create templates to save time when sending common messages</p>
                    <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Template
                    </Button>
                </div>
            )}
        </div>
    )
}
