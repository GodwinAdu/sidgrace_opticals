"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Stethoscope,
    CalendarDays,
    FileText,
    Activity,
    ImageIcon,
    ClipboardList,
    ReceiptText,
    ArrowUpRight,
} from "lucide-react";

interface TimelineEvent {
    id: string;
    type: "visit" | "appointment" | "note" | "perio" | "imaging" | "plan" | "invoice";
    date: string;
    title: string;
    summary: string;
    status?: string;
    href?: string;
    appointmentId?: string | null;
}

const TYPE_META: Record<TimelineEvent["type"], { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
    visit: { icon: Stethoscope, color: "bg-teal-500", label: "Visit" },
    appointment: { icon: CalendarDays, color: "bg-cyan-500", label: "Appointment" },
    note: { icon: FileText, color: "bg-indigo-500", label: "Clinical Note" },
    perio: { icon: Activity, color: "bg-purple-500", label: "Perio" },
    imaging: { icon: ImageIcon, color: "bg-sky-500", label: "Imaging" },
    plan: { icon: ClipboardList, color: "bg-emerald-500", label: "Treatment Plan" },
    invoice: { icon: ReceiptText, color: "bg-amber-500", label: "Invoice" },
};

function EventCard({ e }: { e: TimelineEvent }) {
    const meta = TYPE_META[e.type];
    const Icon = meta.icon;
    return (
        <div className="relative">
            <span className={cn("absolute -left-[22px] top-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-4 ring-background", meta.color)}>
                <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-lg border bg-card p-3 transition-colors hover:border-teal-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{e.title}</span>
                        <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                        {e.status && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">{e.status}</span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {e.date ? new Date(e.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
                    </span>
                </div>
                {e.summary && <p className="mt-1 text-xs text-muted-foreground">{e.summary}</p>}
                {e.href && (
                    <Link href={e.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                        Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                )}
            </div>
        </div>
    );
}

export function PatientTimeline({ events }: { events: TimelineEvent[] }) {
    if (!events || events.length === 0) {
        return <p className="text-sm text-muted-foreground">No recorded activity yet for this patient.</p>;
    }

    // Group events that share an appointmentId into a single "visit" cluster.
    // Events without a linked appointment render standalone. A visit cluster is
    // only formed when 2+ events share the same appointmentId (i.e. the
    // appointment itself plus at least one clinical record linked to it).
    const byAppt = new Map<string, TimelineEvent[]>();
    const standalone: TimelineEvent[] = [];
    for (const e of events) {
        if (e.appointmentId) {
            const arr = byAppt.get(e.appointmentId) || [];
            arr.push(e);
            byAppt.set(e.appointmentId, arr);
        } else {
            standalone.push(e);
        }
    }

    type Row =
        | { kind: "single"; date: number; event: TimelineEvent }
        | { kind: "visit"; date: number; apptId: string; events: TimelineEvent[] };

    const rows: Row[] = [];
    for (const [apptId, group] of byAppt.entries()) {
        if (group.length > 1) {
            const date = Math.max(...group.map((g) => new Date(g.date).getTime()));
            rows.push({ kind: "visit", date, apptId, events: group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) });
        } else {
            rows.push({ kind: "single", date: new Date(group[0].date).getTime(), event: group[0] });
        }
    }
    for (const e of standalone) rows.push({ kind: "single", date: new Date(e.date).getTime(), event: e });
    rows.sort((a, b) => b.date - a.date);

    return (
        <div className="relative pl-6">
            <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
            <div className="space-y-5">
                {rows.map((row) =>
                    row.kind === "single" ? (
                        <EventCard key={`${row.event.type}-${row.event.id}`} e={row.event} />
                    ) : (
                        <div key={`visit-${row.apptId}`} className="relative">
                            <span className="absolute -left-[22px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white ring-4 ring-background">
                                <CalendarDays className="h-3 w-3" />
                            </span>
                            <div className="rounded-lg border-2 border-teal-200 bg-teal-50/40 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-bold text-teal-800">
                                        Visit — {new Date(row.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                                    </span>
                                    <Badge className="bg-teal-600 text-[10px]">{row.events.length} records</Badge>
                                </div>
                                <div className="space-y-3 pl-4">
                                    {row.events.map((e) => (
                                        <EventCard key={`${e.type}-${e.id}`} e={e} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
