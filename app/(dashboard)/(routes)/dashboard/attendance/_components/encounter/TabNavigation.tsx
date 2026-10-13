"use client";

/**
 * TabNavigation — the grouped, gated, responsive tab bar for the encounter
 * workspace (Req 2.3, 2.4, 7.1, 7.2).
 *
 * It renders the already-resolved visible tabs (from `resolveVisibleTabs` in
 * the registry) grouped by `TabGroup`, each group with a short visual label, so
 * the clinician scans Clinical / Diagnostics / Nursing / Specialty / Orders /
 * Billing sections rather than one flat row. Grouping is purely visual and does
 * NOT change gating or ordering — the input order (which already encodes the
 * monolith's `firstVisibleTab` precedence) is preserved within each group, and
 * groups appear in first-seen order.
 *
 * The bar is horizontally scrollable on small screens with no page overflow,
 * and uses the tab's `shortLabel` at narrow widths. Active-tab styling is tinted
 * per group so each section reads distinctly.
 *
 * Accessibility (Req 7.2): the bar is a single `role="tablist"` with full
 * keyboard tab semantics — roving `tabIndex` (only the active tab is in the tab
 * order), arrow-key navigation (Left/Right/Home/End) that wraps and moves focus
 * + selection, and `aria-selected` / `aria-controls` wiring to the panel the
 * shell renders. Group labels are presentational and are not part of the tab
 * order.
 */

import { useCallback, useMemo, useRef } from "react";
import type { RegisteredTab, TabGroup } from "./tabs/registry";

export interface TabNavigationProps {
    /** The resolved, ordered, visible tabs for the current role + context. */
    tabs: RegisteredTab[];
    /** The currently active tab id. */
    activeTab: string;
    /** Select a tab by id (keyboard or pointer). */
    onTabChange: (id: string) => void;
    /** id prefix for the panel each tab controls (for `aria-controls`). */
    panelIdPrefix?: string;
}

/** Human-readable section label for each group (Req 2.4). */
const GROUP_LABEL: Record<TabGroup, string> = {
    clinical: "Clinical",
    diagnostics: "Diagnostics",
    nursing: "Nursing",
    specialty: "Specialty",
    orders: "Orders",
    billing: "Billing",
};

/**
 * Per-group styling. `active` is the selected-tab tint; `label` tints the group
 * heading + the active underline so each section reads distinctly. Tuned for
 * both light and dark themes (Req 7.3).
 */
const GROUP_STYLE: Record<
    TabGroup,
    { active: string; label: string; ring: string }
> = {
    clinical: {
        active: "bg-teal-600 text-white dark:bg-teal-500",
        label: "text-teal-700 dark:text-teal-400",
        ring: "focus-visible:ring-teal-500",
    },
    diagnostics: {
        active: "bg-violet-600 text-white dark:bg-violet-500",
        label: "text-violet-700 dark:text-violet-400",
        ring: "focus-visible:ring-violet-500",
    },
    nursing: {
        active: "bg-rose-600 text-white dark:bg-rose-500",
        label: "text-rose-700 dark:text-rose-400",
        ring: "focus-visible:ring-rose-500",
    },
    specialty: {
        active: "bg-amber-600 text-white dark:bg-amber-500",
        label: "text-amber-700 dark:text-amber-400",
        ring: "focus-visible:ring-amber-500",
    },
    orders: {
        active: "bg-indigo-600 text-white dark:bg-indigo-500",
        label: "text-indigo-700 dark:text-indigo-400",
        ring: "focus-visible:ring-indigo-500",
    },
    billing: {
        active: "bg-emerald-600 text-white dark:bg-emerald-500",
        label: "text-emerald-700 dark:text-emerald-400",
        ring: "focus-visible:ring-emerald-500",
    },
};

/** Build the stable DOM id for a tab button, used for `aria-labelledby`. */
function tabButtonId(id: string): string {
    return `encounter-tab-${id}`;
}

export default function TabNavigation({
    tabs,
    activeTab,
    onTabChange,
    panelIdPrefix = "encounter-panel",
}: TabNavigationProps) {
    // Refs to each tab button so arrow-key navigation can move DOM focus
    // (roving tabindex: only the active tab is tabbable).
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Group the already-ordered tabs by `group`, preserving first-seen group
    // order and within-group order. Grouping never reorders across groups in a
    // way that changes which tab is first overall — the shell derives the
    // default tab from the flat resolved list, not from this grouping.
    const groups = useMemo(() => {
        const order: TabGroup[] = [];
        const byGroup = new Map<TabGroup, RegisteredTab[]>();
        for (const tab of tabs) {
            if (!byGroup.has(tab.group)) {
                byGroup.set(tab.group, []);
                order.push(tab.group);
            }
            byGroup.get(tab.group)!.push(tab);
        }
        return order.map((group) => ({ group, items: byGroup.get(group)! }));
    }, [tabs]);

    // Flat, in-DOM-order list of tab ids for arrow-key traversal.
    const flatIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

    const focusAndSelect = useCallback(
        (id: string) => {
            onTabChange(id);
            // Move focus after selection so roving tabindex follows the arrow key.
            requestAnimationFrame(() => buttonRefs.current[id]?.focus());
        },
        [onTabChange],
    );

    const onKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLButtonElement>, currentId: string) => {
            const count = flatIds.length;
            if (count === 0) return;
            const index = flatIds.indexOf(currentId);
            if (index === -1) return;

            let nextIndex: number | null = null;
            switch (event.key) {
                case "ArrowRight":
                case "ArrowDown":
                    nextIndex = (index + 1) % count;
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    nextIndex = (index - 1 + count) % count;
                    break;
                case "Home":
                    nextIndex = 0;
                    break;
                case "End":
                    nextIndex = count - 1;
                    break;
                default:
                    return;
            }
            event.preventDefault();
            focusAndSelect(flatIds[nextIndex]);
        },
        [flatIds, focusAndSelect],
    );

    if (tabs.length === 0) return null;

    return (
        <div
            role="tablist"
            aria-label="Encounter sections"
            aria-orientation="horizontal"
            className="flex w-full items-stretch gap-4 overflow-x-auto rounded-lg border bg-muted/30 p-2 dark:border-gray-700 dark:bg-gray-800/60 [scrollbar-width:thin]"
        >
            {groups.map(({ group, items }) => {
                const style = GROUP_STYLE[group];
                return (
                    <div
                        key={group}
                        className="flex shrink-0 flex-col gap-1"
                    >
                        <span
                            aria-hidden="true"
                            className={`px-1 text-[10px] font-semibold uppercase tracking-wider ${style.label}`}
                        >
                            {GROUP_LABEL[group]}
                        </span>
                        <div className="flex items-center gap-1">
                            {items.map((tab) => {
                                const isActive = tab.id === activeTab;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        ref={(el) => {
                                            buttonRefs.current[tab.id] = el;
                                        }}
                                        type="button"
                                        role="tab"
                                        id={tabButtonId(tab.id)}
                                        aria-selected={isActive}
                                        aria-controls={`${panelIdPrefix}-${tab.id}`}
                                        // Roving tabindex: only the active tab is in the tab order.
                                        tabIndex={isActive ? 0 : -1}
                                        onClick={() => onTabChange(tab.id)}
                                        onKeyDown={(e) => onKeyDown(e, tab.id)}
                                        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800 ${style.ring} ${
                                            isActive
                                                ? style.active
                                                : "text-muted-foreground hover:bg-background hover:text-foreground dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                        {/* Full label on larger screens, short label when narrow. */}
                                        <span className="hidden md:inline">{tab.label}</span>
                                        <span className="md:hidden">{tab.shortLabel}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
