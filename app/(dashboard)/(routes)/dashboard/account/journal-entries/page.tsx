import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { list } from "@/lib/actions/accounting/journal-entry.actions";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { JournalEntries } from "./_components/JournalEntries";

const page = async () => {
    const [entries, accounts, settings] = await Promise.all([
        list({ status: "all", limit: 200 }),
        listChartAccounts(true),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Journal Entries"
                    description="Create, post and reverse double-entry journal entries. Posted entries are immutable."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <JournalEntries
                    initialEntries={entries || []}
                    accounts={accounts || []}
                    currency={settings?.currency || ""}
                />
            </div>
        </>
    );
};

export default page;