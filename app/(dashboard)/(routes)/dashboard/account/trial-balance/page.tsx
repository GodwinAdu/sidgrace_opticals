import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import TrialBalance from "./_components/TrialBalance";
import { getTrialBalance } from "@/lib/actions/accounting-reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const [data, settings] = await Promise.all([getTrialBalance(), getClinicSettings()]);
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Trial Balance" description="Account balances with debit and credit totals from real ledger activity." />
            </div>
            <Separator />
            <div className="pt-4">
                <TrialBalance data={data} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
