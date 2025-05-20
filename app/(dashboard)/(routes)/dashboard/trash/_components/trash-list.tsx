'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { deleteTrash, restoreDocument } from '@/lib/actions/trash.actions'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface TrashItem {
    _id: string
    storeId: string
    originalCollection: string
    message: string
    deletedBy: string
    deletedAt: string
    autoDelete: boolean
}

export function TrashList({ trashes }: { trashes: TrashItem[] }) {
    const [filter, setFilter] = useState('')
    const [sortBy, setSortBy] = useState<keyof TrashItem>('deletedAt')
    const [sortOrder] = useState<'asc' | 'desc'>('desc')
    const [isRestoreLoading, setIsRestoreLoading] = useState<boolean>(false)
    const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false)


    const router = useRouter()



    const filteredItems = trashes?.filter(item =>
        item.message.toLowerCase().includes(filter.toLowerCase()) ||
        item.originalCollection.toLowerCase().includes(filter.toLowerCase())
    )

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1
        if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    const handleRestore = async (id: string) => {
        try {
            setIsRestoreLoading(true)
            await restoreDocument(id);

            router.refresh()

            toast.success("Item restored",{
                description: "Trash item restored successfully",
            });

        } catch {
            toast.error("Error restoring",{
                description: "Failed to restore trash item",
            });
        } finally {
            setIsRestoreLoading(false)
        }

    }

    const handleDelete = async (id: string) => {
        try {
            setIsDeleteLoading(true)
            await deleteTrash(id)

            router.refresh()

            toast("Item deleted",{
                description: "Trash item deleted successfully",
            });

        } catch {
            toast("Error deleting",{
                description: "Failed to delete trash item",
            });
        } finally {
            setIsDeleteLoading(false)
        }

    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Input
                    placeholder="Filter items..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
                <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as keyof TrashItem)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="deletedAt">Deleted At</SelectItem>
                        <SelectItem value="originalCollection">Collection</SelectItem>
                        <SelectItem value="message">Message</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Message</TableHead>
                        <TableHead>Collection</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>

                    {sortedItems.map((item) => (
                        <TableRow key={item._id}>
                            <TableCell>{item.message}</TableCell>
                            <TableCell>{item.originalCollection}</TableCell>
                            <TableCell>{formatDistanceToNow(new Date(item.deletedAt))}</TableCell>
                            <TableCell>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRestore(item._id)}
                                    >
                                        {isRestoreLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (

                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Restore
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(item._id)}
                                    >
                                        {isDeleteLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (

                                            <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}

                </TableBody>
            </Table>
            {sortedItems.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                    <p className="font-semibold text-lg">No more trash to load.</p>
                    <p className="text-sm">It looks like you&apos;ve reached the end. Everything&apos;s cleaned up!</p>
                </div>
            )}
        </div>
    )
}

