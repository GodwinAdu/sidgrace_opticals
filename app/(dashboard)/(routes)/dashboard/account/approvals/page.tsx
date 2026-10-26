import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import ApprovalsInbox from "./_components/ApprovalsInbox";
import { list } from "@/lib/actions/accounting/expense.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const [expenses, settings] = await Promise.all([
        list({ status: "submitted" }),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Approvals"
                    description="Review submitted expenses and approve or reject the steps assigned to your role."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <ApprovalsInbox expenses={expenses || []} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
