"use client";

/**
 * SectionRail — role-gated section navigation for the encounter workspace (R1),
 * responsive across breakpoints:
 *
 *   - lg and up  → the NOVACARE-style VERTICAL rail (icon + label + completion
 *                  tick), sticky beside the content.
 *   - below lg   → a sticky, horizontally-scrollable STRIP of section chips so
 *                  the content is visible immediately on phones/tablets and any
 *                  section is one swipe away (R1.5, R6.2) — no tall wall of
 *                  buttons above the content.
 *
 * The rail is DRIVEN BY the registry (caller passes the resolved, role-visible,
 * ordered items), so it never invents a section (Property 1). Done/active state
 * is conveyed with an icon + text weight, not color alone (R6.3). A single set
 * of roving-focus buttons powers both layouts with Arrow/Home/End keys (R6.1).
 */

import { useCallback, useMemo, useRef } from "react";
import { Check, Circle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** One rail entry. Mirrors the registry's `RegisteredTab` subset the rail needs. */
export interface SectionRailItem {
    id: string;
    label: string;
    icon: LucideIcon;
}

export interface SectionRailProps {
    items: SectionRailItem[];
    activeId: string;
    onSelect: (id: string) => void;
    /** Per-section done flag (derived, never stored). */
    doneState?: Record<string, boolean>;
}

export default function SectionRail({ items, activeId, onSelect, doneState }: SectionRailProps) {
    const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const ids = useMemo(() => items.map((i) => i.id), [items]);

    const focusSelect = useCallback(
        (id: string) => {
            onSelect(id);
            requestAnimationFrame(() => btnRefs.current[id]?.focus());
        },
        [onSelect],
    );

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
            const n = ids.length;
            if (n === 0) return;
            const i = ids.indexOf(id);
            let next: number | null = null;
            switch (e.key) {
                case "ArrowDown":
                case "ArrowRight":
                    next = (i + 1) % n;
                    break;
                case "ArrowUp":
                case "ArrowLeft":
                    next = (i - 1 + n) % n;
                    break;
                case "Home":
                    next = 0;
                    break;
                case "End":
                    next = n - 1;
                    break;
                default:
                    return;
            }
            e.preventDefault();
            focusSelect(ids[next]);
        },
        [ids, focusSelect],
    );

    if (items.length === 0) return null;

    const doneTick = (id: string) =>
        doneState?.[id] ? (
            <Check className="size-3 shrink-0 text-emerald-600" aria-label="Recorded" />
        ) : (
            <Circle className="size-1.5 shrink-0 fill-border text-border" aria-label="Not recorded" />
        );

    return (
        <nav aria-label="Encounter sections">
            {/* ── Mobile / tablet (< lg): sticky horizontal scrollable strip ── */}
            <div className="lg:hidden sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-gray-700">
                <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === activeId;
                        return (
                            <button
                                key={item.id}
                                ref={(el) => {
                                    btnRefs.current[item.id] = el;
                                }}
                                type="button"
                                aria-current={isActive ? "page" : undefined}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => onSelect(item.id)}
                                onKeyDown={(e) => onKeyDown(e, item.id)}
                                className={cn(
                                    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-9",
                                    isActive
                                        ? "bg-primary/10 text-primary dark:bg-primary/20"
                                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                                <span>{item.label}</span>
                                {doneTick(item.id)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Desktop (lg+): vertical rail ── */}
            <div className="hidden lg:flex max-h-[calc(100vh-7rem)] flex-col gap-0.5 overflow-y-auto p-2 [scrollbar-width:thin]">
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Encounter sections
                </p>
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeId;
                    return (
                        <button
                            key={item.id}
                            ref={(el) => {
                                // Both layouts share the ref map; only one is visible at a time,
                                // so focus lands on the rendered button. The desktop (lg+) layout
                                // registers last, which is correct for keyboard nav on desktop.
                                if (el) btnRefs.current[item.id] = el;
                            }}
                            type="button"
                            aria-current={isActive ? "page" : undefined}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => onSelect(item.id)}
                            onKeyDown={(e) => onKeyDown(e, item.id)}
                            className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                isActive
                                    ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="flex-1 truncate">{item.label}</span>
                            {doneTick(item.id)}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}