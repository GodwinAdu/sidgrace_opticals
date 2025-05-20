"use client";

import { useState, useEffect, useRef } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, Search, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, formatDistanceToNow, isSameDay } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { deleteHistory, fetchAllHistories } from "@/lib/actions/history.actions";
import { toast } from "sonner";
import { truncateMessage } from "@/lib/utils";


interface HistoryItem {
    _id: string;
    storeId: string;
    actionType: string;
    details: {
        itemId: string;
        deletedAt?: string;
    };
    performedBy: {
        fullName: string;
    };
    entityId: string;
    message: string;
    entityType: string;
    timestamp: string;
    createdAt: string;
    updatedAt: string;
}
const actionTypes = ["CREATED", "UPDATED", "DELETED"]; // Add more as needed


const getActionTypeColor = (actionType: string) => {
    if (actionType.includes("DELETED"))
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (actionType.includes("CREATED"))
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (actionType.includes("UPDATED"))
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (actionType.includes("RESTORED"))
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
};

export function HistoryList() {
    const [histories, setHistories] = useState<HistoryItem[]>([]);
    const [lastId, setLastId] = useState(null); // Store the last fetched _id
    const [filter, setFilter] = useState("");
    const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [sortBy, setSortBy] = useState<keyof HistoryItem>("timestamp");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);

    const router = useRouter()

    const fetchHistories = async () => {
        if (loading || !hasMore) return;

        setLoading(true);

        try {
            const limit = 10; // Fetch 10 items at a time
            const data = await fetchAllHistories(lastId, limit);

            if (data.length === 0) {
                setHasMore(false);
                return;
            }

            // Remove duplicates
            const newHistories = data.filter(
                (history: HistoryItem) => !histories.some((h) => h._id === history._id)
            );

            if (newHistories.length > 0) {
                setHistories((prev) => [...prev, ...newHistories]);
                setLastId(newHistories[newHistories.length - 1]._id);
            } else {
                setHasMore(false);
            }
        } catch {
            toast.error("Something went wrong", {
                description: "Failed to fetch histories. Please try again later.",
            })
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistories();
    }, []);

    const handleScroll = () => {
        if (
            window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 100 &&
            hasMore &&
            !loading
        ) {
            fetchHistories();
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loading]);

    const lastHistoryRef = (node: HTMLTableRowElement) => {
        if (loading) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                fetchHistories();
            }
        });

        if (node) observer.current.observe(node);
    };

    const applyFiltersAndSort = () => {
        let filtered = [...histories]; // Create a shallow copy of histories

        if (filter) {
            filtered = filtered.filter((history) =>
                history.message.toLowerCase().includes(filter.toLowerCase())
            );
        }

        if (actionTypeFilter) {
            filtered = filtered.filter((history) =>
                history.actionType.includes(actionTypeFilter)
            );
        }

        if (dateFilter) {
            const selectedDate = new Date(dateFilter);
            filtered = filtered.filter((history) =>
                isSameDay(new Date(history.timestamp), selectedDate)
            );
        }


        // Remove duplicates based on _id
        filtered = filtered.filter((history, index, self) =>
            index === self.findIndex((t) => t._id === history._id)
        );

        filtered.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];

            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });

        return filtered;
    };

    const filteredAndSortedHistories = applyFiltersAndSort();


    console.log(filteredAndSortedHistories, "filteredHistories")

    const handleDelete = async (id: string) => {
        try {
            setIsLoading(true);
            await deleteHistory(id);
            router.refresh();
            toast.success("Deleted history", {
                description: "You've deleted history successfully.",
            });


        } catch {

            toast.error("Error deleting history", {
                description: "Failed to delete history. Please try again later.",
            });
        } finally {
            setIsLoading(false);
        }

    }


    return (
        <div className="space-y-4 ">
            {loading && page === 1 && (
                <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search history..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Select
                        value={actionTypeFilter || "all"}
                        onValueChange={(value) =>
                            setActionTypeFilter(value === "all" ? null : value)
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by action type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {actionTypes.map((actionType) => (
                                <SelectItem key={actionType} value={actionType}>
                                    {actionType}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={sortBy}
                        onValueChange={(value) => setSortBy(value as keyof HistoryItem)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="timestamp">Date</SelectItem>
                            <SelectItem value="actionType">Action Type</SelectItem>
                            <SelectItem value="storeId">Store ID</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={sortOrder}
                        onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-[280px] justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFilter ? format(dateFilter, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={dateFilter as Date}
                                onSelect={(date) => setDateFilter(date as Date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Action Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedHistories.map((history, index) => (
                        <TableRow
                            key={index}
                            ref={index === histories.length - 1 ? lastHistoryRef : null}
                        >
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={`font-semibold ${getActionTypeColor(
                                        history.actionType
                                    )}`}
                                >
                                    {history.actionType}
                                </Badge>
                            </TableCell>
                            <TableCell title={history.message}>{truncateMessage(history.message,10)}</TableCell>
                            <TableCell>{history.entityType}</TableCell>
                            <TableCell>{history.performedBy?.fullName}</TableCell>
                            <TableCell>{formatDistanceToNow(new Date(history.timestamp), { addSuffix: true })}</TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                            <span className="sr-only">Delete history item</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure you want to delete this history item?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the history item.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(history._id)}>{isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : "Delete"}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {loading && page > 1 && (
                <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}
            {!hasMore && !loading && (
                <div className="text-center py-4 text-muted-foreground">
                    No more histories to load.
                </div>
            )}
        </div>
    );
}