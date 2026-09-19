"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from "recharts";

interface ReportData {
    revenueByMonth: { month: string; billed: number; collected: number }[];
    appointmentStatus: { name: string; value: number }[];
    planStatus: { name: string; value: number }[];
    kpis: {
        totalBilled: number;
        totalCollected: number;
        collectionRate: number;
        totalPatients: number;
        newPatientsThisYear: number;
        noShowRate: number;
    };
}

const PIE_COLORS = ["#14b8a6", "#06b6d4", "#f59e0b", "#ef4444", "#6366f1", "#10b981", "#8b5cf6"];

export function ReportCharts({ data }: { data: ReportData }) {
    const { revenueByMonth, appointmentStatus, planStatus, kpis } = data;

    const kpiCards = [
        { label: "Total Billed (YTD)", value: kpis.totalBilled.toLocaleString() },
        { label: "Total Collected (YTD)", value: kpis.totalCollected.toLocaleString() },
        { label: "Collection Rate", value: `${kpis.collectionRate}%` },
        { label: "Total Patients", value: kpis.totalPatients.toLocaleString() },
        { label: "New Patients (YTD)", value: kpis.newPatientsThisYear.toLocaleString() },
        { label: "No-show Rate", value: `${kpis.noShowRate}%` },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {kpiCards.map((k) => (
                    <Card key={k.label}>
                        <CardContent className="pt-6">
                            <p className="text-xs text-muted-foreground">{k.label}</p>
                            <p className="text-2xl font-bold">{k.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Production vs Collection (This Year)</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={revenueByMonth}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="billed" name="Billed" stroke="#06b6d4" strokeWidth={2} />
                            <Line type="monotone" dataKey="collected" name="Collected" stroke="#14b8a6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Appointments by Status</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={appointmentStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                                    {appointmentStatus.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Treatment Plans by Status</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={planStatus}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" fontSize={11} />
                                <YAxis fontSize={12} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" name="Plans" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
