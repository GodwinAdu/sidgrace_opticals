import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import VendorSpend from "./_components/VendorSpend";
import { vendorSpendReport } from "@/lib/actions/accounting/vendor.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";

const page = async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const [data, settings] = await Promise.all([
        vendorSpendReport({ from, to }),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Vendor Spend"
                    description="Total posted expense amounts grouped by vendor for the selected period."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <VendorSpend
                    initial={data}
                    from={from}
                    to={to}
                    currency={settings?.currency || ""}
                />
            </div>
        </>
    );
};

export default page;
