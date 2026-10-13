"use client";

/**
 * AttributionLine — read-only inline "who recorded this / when" line (R3.1).
 *
 * Rendered under each attributed clinical entry so any practitioner with access
 * to the visit can see who authored a piece of content and at what time, without
 * opening the restricted audit log (R3.2). This component applies NO permission
 * gating — it is informational text visible to every clinician.
 *
 * It accepts EITHER already-resolved parts (`name` / `role` / `at`) OR a raw
 * attributed entry (`entry`), and defers all formatting to the pure helpers in
 * `lib/clinical/attribution.ts` so display stays consistent with the server-side
 * audit log and the no-op/latest logic:
 *   - `resolveAuthorLabel` maps the entry's denormalised snapshot to a label,
 *     degrading to "author unknown" and OMITTING the role when it cannot be
 *     resolved (R3.3) — never a raw id, never a blank.
 *   - `formatAttribution` builds the final deterministic string (R3.1).
 *
 * The line is small, muted, and read-only (R3.5): no inputs, no buttons.
 */

import { User } from "lucide-react";
import {
    AUTHOR_UNKNOWN,
    formatAttribution,
    resolveAuthorLabel,
    type AttributionEntry,
} from "@/lib/clinical/attribution";
import { cn } from "@/lib/utils";

export interface AttributionLineProps {
    /** Pre-resolved author display name (used when `entry` is not supplied). */
    name?: string;
    /** Pre-resolved author role/title; omitted from display when blank (R3.3). */
    role?: string;
    /** When the entry was recorded (string | Date). */
    at?: string | Date;
    /**
     * A raw attributed entry (version or self-persisting record). When supplied,
     * its denormalised `authoredByName` / `authoredByRole` snapshot is resolved
     * via `resolveAuthorLabel`; `name` / `role` props are ignored in that case.
     */
    entry?: AttributionEntry | null;
    /** Optional extra classes for layout tuning in a wrapper. */
    className?: string;
    /** Hide the leading user icon (defaults to showing it). */
    hideIcon?: boolean;
}

/** Coerce a string|Date|undefined into a usable Date, or null when unparseable. */
function toDate(at: string | Date | undefined): Date | null {
    if (!at) return null;
    const d = at instanceof Date ? at : new Date(at);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Render the inline attribution line. Returns a single muted, read-only line of
 * text (with an optional user icon) describing who recorded the entry and when.
 */
export default function AttributionLine({
    name,
    role,
    at,
    entry,
    className,
    hideIcon,
}: AttributionLineProps) {
    // Prefer the raw entry when given so the denormalised snapshot drives the
    // label (and the unknown fallbacks) exactly like the audit log does.
    const label = entry
        ? resolveAuthorLabel(entry)
        : resolveAuthorLabel({ authoredByName: name, authoredByRole: role });

    const resolvedName = label.name;
    const resolvedRole = "role" in label ? label.role : undefined;

    // The timestamp can come from a prop or from a raw entry's own timestamp
    // field (createdAt / givenAt / recordedAt / takenAt / performedAt).
    const rawAt =
        at ??
        (entry
            ? ((entry as Record<string, unknown>).createdAt as string | Date | undefined) ??
              ((entry as Record<string, unknown>).givenAt as string | Date | undefined) ??
              ((entry as Record<string, unknown>).recordedAt as string | Date | undefined) ??
              ((entry as Record<string, unknown>).takenAt as string | Date | undefined) ??
              ((entry as Record<string, unknown>).performedAt as string | Date | undefined)
            : undefined);
    const date = toDate(rawAt);

    // With a resolvable time, use the deterministic full format (name, role,
    // time, date). Without a time, fall back to the who-only label so the line
    // is still meaningful (e.g. legacy entries) and never shows a blank or id.
    const text = date
        ? formatAttribution({ name: resolvedName, role: resolvedRole, at: date })
        : resolvedRole
          ? `${resolvedName} (${resolvedRole})`
          : resolvedName;

    const isUnknown = resolvedName === AUTHOR_UNKNOWN;

    return (
        <p
            className={cn(
                "mt-1 flex items-center gap-1 text-xs text-muted-foreground",
                isUnknown && "italic",
                className,
            )}
        >
            {!hideIcon && <User className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span>{text}</span>
        </p>
    );
}
