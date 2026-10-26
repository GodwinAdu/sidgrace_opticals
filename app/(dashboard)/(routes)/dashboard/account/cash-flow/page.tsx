import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import CashFlow from "./_components/CashFlow";
import { cashFlow } from "@/lib/actions/accounting/reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const [data, settings] = await Promise.all([
        cashFlow({ from, to }, "accrual"),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Cash Flow" description="Net change in cash by operating, investing and financing activity." />
            </div>
            <Separator />
            <div className="pt-4">
                <CashFlow initial={data} from={from} to={to} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
