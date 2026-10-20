import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { GeneralLedger } from "./_components/GeneralLedger";

const page = async () => {
    const [accounts, settings] = await Promise.all([
        listChartAccounts(),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="General Ledger"
                    description="Opening balance, posted activity and running balance for any account over a date range."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <GeneralLedger accounts={accounts || []} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;