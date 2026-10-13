"use client";

/**
 * `VisitAuditLog` — the per-visit clinical audit trail body (R4, R5).
 *
 * Read-only, reverse-chronological, paginated list of every clinical write
 * event recorded against the visit. It calls the restricted, server-gated
 * `getVisitAuditLog` action (wrapped with `withAuth(..., "auditView")`), which
 * enforces the audit-view permission on the server regardless of UI state
 * (R5.2) and fails closed when the flag is unconfigured (R5.4). The tab that
 * mounts this is itself gated by `can("auditView")` in the registry (R5.1), so
 * an unauthorised user never sees it; this component additionally degrades
 * gracefully if the server denies a direct call.
 *
 * Everything here is strictly read-only — there is no edit/delete affordance on
 * any row (R4.3, R7.1). Rows show the actor (name + role), the action/field,
 * the timestamp, and an optional message (R4.1, R4.2). Simple previous/next
 * pagination keeps the view responsive on large visits (R4.4).
 */
import { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
    getVisitAuditLog,
    type VisitAuditLogResult,
    type VisitAuditRow,
} from "@/lib/actions/visit-audit.actions";
import { Button } from "@/components/ui/button";

/** Rows per page; matches the server default and keeps the read responsive (R4.4). */
const PAGE_SIZE = 50;

/** A human-readable label for a raw `History.actionType` enum value. */
function formatActionType(actionType: string): string {
    if (!actionType) return "Clinical write";
    return actionType
        .toLowerCase()
        .split("_")
        .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
        .join(" ");
}

/** Deterministic, locale-independent timestamp display for a row (R4.2). */
function formatTimestamp(iso: string | null): string {
    if (!iso) return "—";
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return "—";
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
    const date = `${at.getDate()} ${months[at.getMonth()]} ${at.getFullYear()}`;
    return `${time}, ${date}`;
}

/** The actor display: "Name (Role)" or just the name when the role is unknown. */
function actorDisplay(row: VisitAuditRow): string {
    return row.actorRole ? `${row.actorName} (${row.actorRole})` : row.actorName;
}

interface VisitAuditLogProps {
    /** Mongo _id of the visit (`Attendance`) whose trail to read. */
    attendanceId?: string;
}

/** The access-denied state shown if the server denies a direct call (R5.1/R5.3). */
type LoadState = "loading" | "ready" | "forbidden" | "error";

export default function VisitAuditLog({ attendanceId }: VisitAuditLogProps) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<VisitAuditLogResult | null>(null);
    const [state, setState] = useState<LoadState>("loading");

    const load = useCallback(
        async (nextPage: number) => {
            if (!attendanceId) {
                setState("error");
                return;
            }
            setState("loading");
            try {
                const result = await getVisitAuditLog(attendanceId, {
                    page: nextPage,
                    pageSize: PAGE_SIZE,
                });
                setData(result);
                setState("ready");
            } catch (error) {
                // The tab is gated, so this normally never fires; but a direct or
                // stale call can be denied server-side. Degrade to an access
                // message rather than crashing the workspace (R5.1, R5.3).
                const message = error instanceof Error ? error.message : String(error);
                setState(/forbidden/i.test(message) ? "forbidden" : "error");
            }
        },
        [attendanceId],
    );

    useEffect(() => {
        void load(page);
    }, [load, page]);

    if (state === "forbidden") {
        return (
            <p className="text-sm text-muted-foreground">
                You do not have permission to view the audit log for this visit.
            </p>
        );
    }

    if (state === "error") {
        return (
            <p className="text-sm text-muted-foreground">
                The audit log could not be loaded. Please try again.
            </p>
        );
    }

    if (state === "loading" && !data) {
        return <p className="text-sm text-muted-foreground">Loading audit log…</p>;
    }

    const rows = data?.rows ?? [];
    const total = data?.total ?? 0;
    const pageSize = data?.pageSize ?? PAGE_SIZE;
    const currentPage = data?.page ?? page;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <HistoryIcon className="size-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <HistoryIcon className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Visit audit log</h3>
                <span className="text-xs text-muted-foreground">
                    {total} {total === 1 ? "event" : "events"}
                </span>
            </div>

            {/* Read-only table — no edit/delete affordances (R4.3, R7.1). */}
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2 font-medium">Actor</th>
                            <th className="px-3 py-2 font-medium">Action</th>
                            <th className="px-3 py-2 font-medium">Field</th>
                            <th className="px-3 py-2 font-medium">When</th>
                            <th className="px-3 py-2 font-medium">Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-t align-top">
                                <td className="px-3 py-2 whitespace-nowrap">{actorDisplay(row)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    {formatActionType(row.actionType)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                    {row.field || "—"}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                    {formatTimestamp(row.timestamp)}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                    {row.message || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hasPrev || state === "loading"}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="size-4" />
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!hasNext || state === "loading"}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
