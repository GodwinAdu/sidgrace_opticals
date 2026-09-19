import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getTransactions } from "@/lib/actions/transaction.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { ExpenseManager } from "./_components/ExpenseManager";

const page = async () => {
    const [expenses, settings] = await Promise.all([
        getTransactions({ type: "expense", limit: 100 }),
        getClinicSettings(),
    ]);
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Expenses" description="Record and track clinic operating expenses." />
            </div>
            <Separator />
            <div className="pt-4">
                <ExpenseManager expenses={expenses || []} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
