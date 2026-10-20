import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { incomeStatement } from "@/lib/actions/accounting/reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { IncomeStatement } from "./_components/IncomeStatement";

const page = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const [initial, settings] = await Promise.all([
        incomeStatement({ from, to }, "accrual"),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Income Statement" description="Profit & loss — revenue vs expenses from posted journal entries." />
            </div>
            <Separator />
            <div className="pt-4">
                <IncomeStatement initial={initial} from={from} to={to} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
