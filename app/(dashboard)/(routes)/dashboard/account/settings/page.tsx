import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import AccountingSettings from "./_components/AccountingSettings";
import { getSettings } from "@/lib/actions/accounting/accounting-settings.actions";
import { list as listPeriods } from "@/lib/actions/accounting/accounting-period.actions";
import { listApprovalRules } from "@/lib/actions/accounting/approval-rule.actions";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";
import { fetchAllStaffs } from "@/lib/actions/staff.actions";

const page = async () => {
    const fiscalYear = new Date().getFullYear();

    const [settings, periods, rules, accounts, staffsRaw] = await Promise.all([
        getSettings(),
        listPeriods({ status: "all" }),
        listApprovalRules(),
        listChartAccounts(true),
        fetchAllStaffs(),
    ]);

    // Trim staff down to the fields the approver picker needs.
    const staffs = (staffsRaw || []).map((s: { _id: string; fullName?: string; role?: string }) => ({
        _id: String(s._id),
        fullName: s.fullName || "",
        role: s.role || "",
    }));

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Accounting Settings"
                    description="Fiscal periods, approval rules, default account mappings, and posting policy for the double-entry ledger."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <AccountingSettings
                    settings={settings}
                    periods={periods || []}
                    rules={rules || []}
                    accounts={accounts || []}
                    staffs={staffs}
                    fiscalYear={fiscalYear}
                />
            </div>
        </>
    );
};

export default page;
