"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Loader2 } from "lucide-react";
import { fetchAllHistories } from "@/lib/actions/history.actions";

interface HistoryItem {
    _id: string;
    actionType: string;
    message?: string;
    performedBy?: { fullName?: string } | null;
    createdAt?: string;
}

export function NotificationBell() {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const load = async (open: boolean) => {
        if (!open || loaded) return;
        try {
            setLoading(true);
            const data = await fetchAllHistories(null, 12);
            setItems(data || []);
            setLoaded(true);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover onOpenChange={load}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-500" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold">Recent Activity</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : items.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
                    ) : (
                        <div className="divide-y">
                            {items.map((it) => (
                                <div key={it._id} className="px-4 py-3">
                                    <p className="text-sm leading-snug">{it.message || it.actionType}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {it.createdAt ? new Date(it.createdAt).toLocaleString() : ""}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
