import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getLabOrders } from "@/lib/actions/lab-order.actions";
import { LabWorklist } from "./_components/LabWorklist";

const page = async () => {
    const orders = (await getLabOrders()) || [];
    return (
        <>
            <Heading title="Lab & Radiology" description="Work the order queue: collect specimens and enter results." />
            <Separator />
            <div className="pt-4">
                <LabWorklist orders={orders} />
            </div>
        </>
    );
};

export default page;
