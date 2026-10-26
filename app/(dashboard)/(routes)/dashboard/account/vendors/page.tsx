import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import VendorManager from "./_components/VendorManager";
import { listVendors } from "@/lib/actions/accounting/vendor.actions";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";

const page = async () => {
    const [vendors, accounts] = await Promise.all([
        listVendors(),
        listChartAccounts(true),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Vendors"
                    description="Manage the vendor master that expenses and purchases reference for payables and spend reporting."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <VendorManager vendors={vendors || []} accounts={accounts || []} />
            </div>
        </>
    );
};

export default page;
