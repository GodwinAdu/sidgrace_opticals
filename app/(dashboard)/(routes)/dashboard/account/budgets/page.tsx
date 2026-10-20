import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import BudgetManager from "./_components/BudgetManager";
import { listBudgets } from "@/lib/actions/accounting/budget.actions";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const fiscalYear = new Date().getFullYear();

    const [budgets, accounts, settings] = await Promise.all([
        listBudgets({ fiscalYear }),
        listChartAccounts(true),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Budgets"
                    description="Set budget targets per account and fiscal period to drive budget-vs-actual reporting and over-budget guards."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <BudgetManager
                    budgets={budgets || []}
                    accounts={accounts || []}
                    fiscalYear={fiscalYear}
                    currency={settings?.currency || ""}
                />
            </div>
        </>
    );
};

export default page;
