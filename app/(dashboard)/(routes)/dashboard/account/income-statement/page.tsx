import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getIncomeStatement } from "@/lib/actions/accounting-reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { IncomeStatement } from "./_components/IncomeStatement";

const page = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    const [initial, settings] = await Promise.all([getIncomeStatement(from, to), getClinicSettings()]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Income Statement" description="Profit & loss — revenue vs expenses by category." />
            </div>
            <Separator />
            <div className="pt-4">
                <IncomeStatement initial={initial} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
