"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, RotateCcw, Search, Wallet, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    fetchSmsHistory,
    fetchSmsOverview,
    retrySms,
    type SmsHistoryItem,
    type SmsHistoryQuery,
    type SmsOverview,
} from "@/lib/actions/sms.actions"

const PAGE_SIZE = 20
const REFRESH_MS = 30_000

const STATUS_STYLE: Record<SmsHistoryItem["status"], { label: string; className: string }> = {
    sent: { label: "Sent", className: "bg-green-100 text-green-800 border-green-200" },
    pending: { label: "Queued", className: "bg-amber-100 text-amber-800 border-amber-200" },
    failed: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 border-gray-200" },
}

const SOURCE_LABEL: Record<string, string> = {
    notification: "Messaging",
    "patient-welcome": "Patient welcome",
    "staff-welcome": "Staff welcome",
    appointment: "Appointment",
    recall: "Recall reminder",
    direct: "Direct",
}

function formatDate(iso: string | null) {
    if (!iso) return "-"
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function GatewayCard({ overview, loading, onRefresh }: { overview: SmsOverview | null; loading: boolean; onRefresh: () => void }) {
    const g = overview?.gateway
    let state: { label: string; className: string; icon: React.ReactNode }
    if (!g) state = { label: "Checking...", className: "bg-gray-100 text-gray-700", icon: <Clock className="h-4 w-4" /> }
    else if (!g.reachable) state = { label: "SMS service offline", className: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" /> }
    else if (!g.configured) state = { label: "Not configured", className: "bg-amber-100 text-amber-800", icon: <AlertTriangle className="h-4 w-4" /> }
    else if (g.balance === null) state = { label: "Gateway error", className: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" /> }
    else state = { label: "Connected", className: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-4 w-4" /> }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        SMS Gateway (SMSOnlineGH)
                    </CardTitle>
                    <CardDescription>Status, remaining credit and today&apos;s activity</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} aria-label="Refresh SMS status and history">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${state.className}`}>
                        {state.icon}
                        {state.label}
                    </span>
                    {g?.senderId && <span className="text-sm text-muted-foreground">Sender ID: <strong>{g.senderId}</strong></span>}
                </div>
                {g && (!g.reachable || !g.configured || g.balance === null) && (
                    <p className="text-sm text-muted-foreground" role="status">
                        {g.message}
                        {g.reachable && !g.configured && " Messages are kept in the queue and sent once the API key and sender ID are set."}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Credit balance" value={g?.balance ?? "-"} />
                    <Stat label="Sent today" value={overview?.today.sent ?? "-"} />
                    <Stat label="Failed today" value={overview?.today.failed ?? "-"} />
                    <Stat label="Waiting in queue" value={overview?.queued ?? "-"} />
                </div>
            </CardContent>
        </Card>
    )
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
    )
}

export default function SmsHistory() {
    const [overview, setOverview] = useState<SmsOverview | null>(null)
    const [items, setItems] = useState<SmsHistoryItem[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<NonNullable<SmsHistoryQuery["status"]>>("all")
    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(false)
    const [retryingId, setRetryingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [ov, hist] = await Promise.all([
                fetchSmsOverview(),
                fetchSmsHistory({ status, search, page, pageSize: PAGE_SIZE }),
            ])
            setOverview(ov)
            setItems(hist.items)
            setTotal(hist.total)
        } catch (error) {
            console.error(error)
            toast.error("Could not load SMS history")
        } finally {
            setLoading(false)
        }
    }, [status, search, page])

    useEffect(() => {
        load()
        const t = setInterval(load, REFRESH_MS)
        return () => clearInterval(t)
    }, [load])

    const onRetry = async (id: string) => {
        setRetryingId(id)
        try {
            const res = await retrySms(id)
            if (res.success) toast.success("Message queued again")
            else toast.error(res.message)
            await load()
        } catch {
            toast.error("Retry failed")
        } finally {
            setRetryingId(null)
        }
    }

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <div className="space-y-6">
            <GatewayCard overview={overview} loading={loading} onRefresh={load} />

            <Card>
                <CardHeader>
                    <CardTitle>Message History</CardTitle>
                    <CardDescription>Every SMS sent by the system, newest first. Updates every 30 seconds.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form
                        className="flex flex-col gap-3 sm:flex-row"
                        onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput) }}
                        role="search"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                aria-label="Search by name, phone number or message text"
                                placeholder="Search name, phone or message..."
                                className="pl-9"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>
                        <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v as typeof status) }}>
                            <SelectTrigger className="sm:w-44" aria-label="Filter by status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="pending">Queued</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" variant="secondary">Search</Button>
                    </form>

                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Recipient</TableHead>
                                    <TableHead className="min-w-[240px]">Message</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="min-w-[180px]">Details</TableHead>
                                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            {loading ? "Loading..." : "No messages found"}
                                        </TableCell>
                                    </TableRow>
                                ) : items.map((m) => {
                                    const st = STATUS_STYLE[m.status] ?? STATUS_STYLE.pending
                                    return (
                                        <TableRow key={m._id}>
                                            <TableCell className="whitespace-nowrap text-sm">{formatDate(m.sentAt ?? m.createdAt)}</TableCell>
                                            <TableCell className="text-sm">
                                                <div className="font-medium">{m.recipientName || "-"}</div>
                                                <div className="text-muted-foreground">{m.recipientPhone || "-"}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <p className="line-clamp-2" title={m.message}>{m.message}</p>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{SOURCE_LABEL[m.source ?? ""] ?? m.source ?? "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={st.className}>{st.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {m.status === "pending" && m.nextAttemptAt && m.retryCount > 0
                                                    ? `Retry ${m.retryCount} at ${formatDate(m.nextAttemptAt)}${m.lastError ? `: ${m.lastError}` : ""}`
                                                    : m.lastError || m.gatewayStatus || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(m.status === "failed" || m.status === "cancelled") && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onRetry(m._id)}
                                                        disabled={retryingId === m._id}
                                                        aria-label={`Retry SMS to ${m.recipientName || m.recipientPhone || "recipient"}`}
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                                        Retry
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{total} message(s)</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                            <span aria-live="polite">Page {page} of {pages}</span>
                            <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
