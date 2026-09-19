import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import BalanceSheet from "./_components/BalanceSheet";
import { getBalanceSheet } from "@/lib/actions/accounting-reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const [data, settings] = await Promise.all([getBalanceSheet(), getClinicSettings()]);
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Balance Sheet" description="Assets, liabilities and equity computed from live account balances." />
            </div>
            <Separator />
            <div className="pt-4">
                <BalanceSheet data={data} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
