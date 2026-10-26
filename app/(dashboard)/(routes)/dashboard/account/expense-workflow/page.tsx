import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import ExpenseWorkflow from "./_components/ExpenseWorkflow";
import { list } from "@/lib/actions/accounting/expense.actions";
import { listVendors } from "@/lib/actions/accounting/vendor.actions";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const [expenses, accounts, vendors, settings] = await Promise.all([
        list(),
        listChartAccounts(true),
        listVendors(true),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Expense Workflow"
                    description="Capture expenses as double-entry postings and submit them through the approval chain."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <ExpenseWorkflow
                    expenses={expenses || []}
                    accounts={accounts || []}
                    vendors={vendors || []}
                    currency={settings?.currency || ""}
                />
            </div>
        </>
    );
};

export default page;
