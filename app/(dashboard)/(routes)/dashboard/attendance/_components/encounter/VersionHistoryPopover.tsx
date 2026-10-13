"use client";

/**
 * VersionHistoryPopover — read-only "earlier versions exist" affordance (R3.4).
 *
 * A tracked clinical field is append-only: every meaningful save adds an
 * immutable version. When more than one version exists, this component surfaces
 * a small "edited ×N — view history" button next to the current entry. Clicking
 * it loads the field's full version history via `getFieldVersions` and lists
 * each prior version, newest first, with its own `AttributionLine` and a
 * read-only preview of that version's content.
 *
 * Everything here is READ-ONLY (R3.5, R7.1): no edit, no delete, no re-save.
 * The trigger is a real `<button>` with an accessible name so the affordance is
 * reachable by keyboard and announced by assistive tech.
 *
 * Gating: `getFieldVersions` is auth-only on the server (any clinician with
 * access to the visit may inspect a field's history); this component adds no
 * extra permission check, matching the inline-attribution visibility rule
 * (R3.2). The restricted full audit log is a separate, gated surface (Task 10).
 */

import { useCallback, useState } from "react";
import { History, Loader2 } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    getFieldVersions,
    type TrackedClinicalField,
} from "@/lib/actions/visit-audit.actions";
import type { AttributedVersion } from "@/lib/clinical/attribution";
import AttributionLine from "./AttributionLine";

export interface VersionHistoryPopoverProps {
    /** Visit (`Attendance`) id whose field history to read. */
    attendanceId: string;
    /** The tracked clinical field whose versions to show. */
    field: TrackedClinicalField;
    /**
     * How many versions the current entry has. The affordance renders ONLY when
     * this is greater than 1 (R3.4) — a single version has no earlier history.
     */
    versionCount?: number;
}

/** A loaded version as returned (serialized) by `getFieldVersions`. */
type LoadedVersion = Omit<AttributedVersion, "createdAt"> & {
    createdAt?: string | null;
};

/**
 * Render a version's content as read-only text. Strings render verbatim;
 * structured section values (e.g. `vitals`, `history`) render as "label: value"
 * lines so the preview is legible without re-implementing each tab's layout.
 */
function renderContent(content: unknown): React.ReactNode {
    if (content === null || content === undefined || content === "") {
        return <span className="italic text-muted-foreground">(empty)</span>;
    }
    if (typeof content === "string") {
        return <span className="whitespace-pre-wrap break-words">{content}</span>;
    }
    if (typeof content === "object") {
        const entries = Object.entries(content as Record<string, unknown>).filter(
            ([, v]) => v !== null && v !== undefined && v !== "",
        );
        if (entries.length === 0) {
            return <span className="italic text-muted-foreground">(empty)</span>;
        }
        return (
            <dl className="space-y-0.5">
                {entries.map(([key, value]) => (
                    <div key={key} className="flex gap-1">
                        <dt className="font-medium capitalize">{key}:</dt>
                        <dd className="break-words">
                            {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                        </dd>
                    </div>
                ))}
            </dl>
        );
    }
    return <span className="break-words">{String(content)}</span>;
}

/**
 * The prior-versions affordance + popover. Loads lazily on first open so the
 * version arrays are not fetched for fields the user never inspects.
 */
export default function VersionHistoryPopover({
    attendanceId,
    field,
    versionCount,
}: VersionHistoryPopoverProps) {
    const [versions, setVersions] = useState<LoadedVersion[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only an entry with more than one version has history to show (R3.4).
    const count = typeof versionCount === "number" ? versionCount : 0;
    const edits = Math.max(count - 1, 0);

    const load = useCallback(async () => {
        if (versions || loading || !attendanceId) return;
        setLoading(true);
        setError(null);
        try {
            const result = (await getFieldVersions(
                attendanceId,
                field,
            )) as LoadedVersion[];
            setVersions(Array.isArray(result) ? result : []);
        } catch {
            setError("Could not load version history.");
            setVersions([]);
        } finally {
            setLoading(false);
        }
    }, [attendanceId, field, versions, loading]);

    const onOpenChange = useCallback(
        (open: boolean) => {
            if (open) void load();
        },
        [load],
    );

    if (count <= 1) return null;

    // Prior versions = everything except the current (last) one, newest first.
    const prior = versions ? versions.slice(0, -1).reverse() : [];

    return (
        <Popover onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`View version history (edited ${edits} ${edits === 1 ? "time" : "times"})`}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                    <History className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>
                        edited ×{edits} — view history
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
                <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium">Version history</p>
                    <p className="text-xs text-muted-foreground">
                        Earlier versions, newest first. Read-only.
                    </p>
                </div>
                <ScrollArea className="max-h-72">
                    <div className="p-3">
                        {loading && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Loading…
                            </p>
                        )}
                        {!loading && error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        {!loading && !error && prior.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No earlier versions.
                            </p>
                        )}
                        {!loading &&
                            !error &&
                            prior.map((version, index) => (
                                <div key={index}>
                                    {index > 0 && <Separator className="my-3" />}
                                    <AttributionLine
                                        entry={version}
                                        at={version.createdAt ?? undefined}
                                    />
                                    <div className="mt-1 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                                        {renderContent(version.content)}
                                    </div>
                                </div>
                            ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
