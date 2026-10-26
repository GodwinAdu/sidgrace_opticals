import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import TrialBalance from "./_components/TrialBalance";
import { trialBalance } from "@/lib/actions/accounting/reports.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const [data, settings] = await Promise.all([
        trialBalance({ from, to }, "accrual"),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Trial Balance" description="Per-account debit and credit positions from posted journal entries." />
            </div>
            <Separator />
            <div className="pt-4">
                <TrialBalance initial={data} from={from} to={to} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
