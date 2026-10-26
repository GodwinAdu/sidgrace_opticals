import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import BalanceSheet from "./_components/BalanceSheet";
import { balanceSheet } from "@/lib/actions/accounting/reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const [data, settings] = await Promise.all([
        balanceSheet({ from, to }, "accrual"),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Balance Sheet" description="Assets, liabilities and equity derived from posted journal entries." />
            </div>
            <Separator />
            <div className="pt-4">
                <BalanceSheet initial={data} from={from} to={to} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
