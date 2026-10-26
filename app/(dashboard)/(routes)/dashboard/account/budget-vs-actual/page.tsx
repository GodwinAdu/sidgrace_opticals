import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import BudgetVsActual from "./_components/BudgetVsActual";
import { budgetVsActual } from "@/lib/actions/accounting/budget.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const fiscalYear = new Date().getFullYear();

    const [data, settings] = await Promise.all([
        budgetVsActual(fiscalYear, null, "accrual"),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Budget vs Actual"
                    description="Compare budgeted targets against actuals derived from posted journal entries."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <BudgetVsActual
                    initial={data}
                    fiscalYear={fiscalYear}
                    currency={settings?.currency || ""}
                />
            </div>
        </>
    );
};

export default page;
