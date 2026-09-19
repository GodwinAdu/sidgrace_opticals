"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User2, CalendarDays, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentPatient {
    _id: string;
    fullName?: string;
    patientId?: string;
    phone?: string;
    gender?: string;
    createdAt?: string;
}

interface RecentAppointment {
    _id: string;
    patientName: string;
    patientId: string;
    date?: string;
    timeSlot?: string;
    appointmentType?: string;
    status: string;
}

const APPT_STATUS: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    "no-show": "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    rescheduled: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

const AVATAR_GRADIENTS = [
    "from-teal-400 to-cyan-500",
    "from-cyan-400 to-sky-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-cyan-600",
    "from-indigo-400 to-violet-500",
    "from-rose-400 to-pink-500",
];

export function RecentPanels({
    patients,
    appointments,
}: {
    patients: RecentPatient[];
    appointments: RecentAppointment[];
}) {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Patients */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User2 className="h-4 w-4 text-teal-600" />
                            <h3 className="font-semibold">Recent Patients</h3>
                        </div>
                        <Link href="/dashboard/manage-patient/patient-list" className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                            View all <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    {patients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No patients registered yet.</p>
                    ) : (
                        <div className="space-y-1">
                            {patients.map((p, i) => (
                                <Link
                                    key={p._id}
                                    href={`/dashboard/portal/${p._id}`}
                                    className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length])}>
                                            {(p.fullName || "?").charAt(0).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{p.fullName || "Unnamed"}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {p.patientId || p._id.slice(-6)}{p.phone ? ` • ${p.phone}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Appointments */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-teal-600" />
                            <h3 className="font-semibold">Recent Appointments</h3>
                        </div>
                        <Link href="/dashboard/appointments" className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                            View all <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    {appointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No appointments yet.</p>
                    ) : (
                        <div className="space-y-1">
                            {appointments.map((a) => (
                                <div key={a._id} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{a.patientName}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {a.date ? new Date(a.date).toLocaleDateString() : ""}
                                            {a.timeSlot ? ` • ${a.timeSlot}` : ""}
                                            {a.appointmentType ? ` • ${a.appointmentType}` : ""}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={cn("shrink-0 border-0", APPT_STATUS[a.status] || "")}>
                                        {a.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
