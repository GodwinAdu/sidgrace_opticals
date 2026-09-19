"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    Users,
    CalendarCheck,
    Wallet,
    TrendingDown,
    Stethoscope,
    ReceiptText,
    ClipboardList,
    FlaskConical,
    BellRing,
    ArrowUpRight,
    Activity,
    CircleDollarSign,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from "recharts";

interface KpiData {
    totalBilled: number;
    totalCollected: number;
    collectionRate: number;
    totalPatients: number;
    newPatientsThisYear: number;
    noShowRate: number;
}

interface ReportData {
    revenueByMonth: { month: string; billed: number; collected: number }[];
    appointmentStatus: { name: string; value: number }[];
    planStatus: { name: string; value: number }[];
    kpis: KpiData;
}

interface ActivityItem {
    _id: string;
    actionType: string;
    message?: string;
    performedBy?: { fullName?: string } | null;
    createdAt?: string;
}

interface AccountingTotals {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    margin: number;
}

interface DashboardOverviewProps {
    userName: string;
    report: ReportData;
    activity: ActivityItem[];
    accounting: AccountingTotals;
}

const PIE_COLORS = ["#14b8a6", "#06b6d4", "#f59e0b", "#ef4444", "#6366f1", "#10b981", "#8b5cf6"];

const QUICK_ACTIONS = [
    { label: "New Appointment", href: "/dashboard/appointments/new", icon: CalendarCheck, color: "from-teal-500 to-cyan-600" },
    { label: "New Invoice", href: "/dashboard/billing/invoices/new", icon: ReceiptText, color: "from-cyan-500 to-sky-600" },
    { label: "Clinical Records", href: "/dashboard/clinical", icon: Stethoscope, color: "from-emerald-500 to-teal-600" },
    { label: "Treatment Plans", href: "/dashboard/treatment-plans", icon: ClipboardList, color: "from-indigo-500 to-violet-600" },
    { label: "Lab Cases", href: "/dashboard/lab-cases", icon: FlaskConical, color: "from-amber-500 to-orange-600" },
    { label: "Recalls", href: "/dashboard/recalls", icon: BellRing, color: "from-rose-500 to-pink-600" },
];

function money(n: number) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function DashboardOverview({ userName, report, activity, accounting }: DashboardOverviewProps) {
    const { kpis, revenueByMonth, appointmentStatus, planStatus } = report;

    const stats = [
        {
            label: "Total Patients",
            value: kpis.totalPatients.toLocaleString(),
            sub: `+${kpis.newPatientsThisYear} new this year`,
            icon: Users,
            gradient: "from-teal-500 to-cyan-600",
        },
        {
            label: "Revenue (YTD)",
            value: money(accounting.totalRevenue),
            sub: `${money(kpis.totalCollected)} collected`,
            icon: Wallet,
            gradient: "from-emerald-500 to-teal-600",
        },
        {
            label: "Expenses (YTD)",
            value: money(accounting.totalExpenses),
            sub: "operating costs",
            icon: TrendingDown,
            gradient: "from-rose-500 to-red-600",
        },
        {
            label: "Net Profit (YTD)",
            value: money(accounting.netProfit),
            sub: `${accounting.margin}% margin`,
            icon: CircleDollarSign,
            gradient: accounting.netProfit >= 0 ? "from-cyan-500 to-sky-600" : "from-orange-500 to-red-600",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-700 p-6 text-white shadow-lg sm:p-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 right-1/3 h-56 w-56 rounded-full bg-teal-900/20 blur-3xl" />
                <div className="relative">
                    <p className="text-sm text-teal-100/90">Welcome back,</p>
                    <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{userName} 👋</h1>
                    <p className="mt-2 max-w-lg text-sm text-teal-50/85">
                        Here's what's happening at your clinic today. Track performance, manage patients, and keep operations running smoothly.
                    </p>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <Card key={s.label} className="overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", s.gradient)}>
                                    <s.icon className="h-5 w-5" />
                                </span>
                            </div>
                            <p className="mt-4 text-2xl font-bold tracking-tight">{s.value}</p>
                            <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {QUICK_ACTIONS.map((a) => (
                        <Link
                            key={a.href}
                            href={a.href}
                            className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                        >
                            <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow", a.color)}>
                                <a.icon className="h-5 w-5" />
                            </span>
                            <span className="text-xs font-medium">{a.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Charts + activity */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Revenue area chart */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">Production vs Collection</h3>
                                <p className="text-xs text-muted-foreground">Billed and collected per month (this year)</p>
                            </div>
                            <Link href="/dashboard/reports" className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                                View reports <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={revenueByMonth}>
                                <defs>
                                    <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="billed" name="Billed" stroke="#06b6d4" strokeWidth={2} fill="url(#billedGrad)" />
                                <Area type="monotone" dataKey="collected" name="Collected" stroke="#14b8a6" strokeWidth={2} fill="url(#collectedGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent activity */}
                <Card>
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-teal-600" />
                            <h3 className="font-semibold">Recent Activity</h3>
                        </div>
                        {activity.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No recent activity.</p>
                        ) : (
                            <div className="space-y-4">
                                {activity.slice(0, 7).map((a) => (
                                    <div key={a._id} className="flex gap-3">
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm leading-snug">{a.message || a.actionType}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Status breakdowns */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <h3 className="mb-4 font-semibold">Appointments by Status</h3>
                        {appointmentStatus.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No appointment data yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={appointmentStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                                        {appointmentStatus.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <h3 className="mb-4 font-semibold">Treatment Plans by Status</h3>
                        {planStatus.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No treatment plan data yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={planStatus}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Plans" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
