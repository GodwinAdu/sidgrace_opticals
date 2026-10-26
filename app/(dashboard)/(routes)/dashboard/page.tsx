import { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard-page/dashboard-overview";
import { RecentPanels } from "@/components/dashboard-page/recent-panels";
import { getReportData } from "@/lib/actions/reports.actions";
import { incomeStatement as getIncomeStatement } from "@/lib/actions/accounting/reports.actions";
import { fetchAllHistories } from "@/lib/actions/history.actions";
import { getRecentPatients, getRecentAppointments } from "@/lib/actions/portal.actions";
import { currentUser } from "@/lib/helpers/current-user";

export const metadata: Metadata = {
    title: "Dashboard | Dapfam Dental Clinic",
    description: "Dashboard for Dapfam Dental Clinic",
};

const page = async () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const [report, incomeStatement, activity, recentPatients, recentAppointments, user] = await Promise.all([
        getReportData(),
        getIncomeStatement({ from: yearStart, to: today }, "accrual"),
        fetchAllHistories(null, 10),
        getRecentPatients(6),
        getRecentAppointments(6),
        currentUser().catch(() => null),
    ]);

    const userName = user?.fullName || "there";
    const margin =
        incomeStatement.revenue > 0
            ? Math.round((incomeStatement.netIncome / incomeStatement.revenue) * 1000) / 10
            : 0;
    const accounting = {
        totalRevenue: incomeStatement.revenue,
        totalExpenses: incomeStatement.expenses,
        netProfit: incomeStatement.netIncome,
        margin,
    };

    return (
        <main className="flex-1 overflow-auto py-4">
            <div className="space-y-6">
                <DashboardOverview userName={userName} report={report} activity={activity || []} accounting={accounting} />
                <RecentPanels patients={recentPatients || []} appointments={recentAppointments || []} />
            </div>
        </main>
    );
};

export default page;
