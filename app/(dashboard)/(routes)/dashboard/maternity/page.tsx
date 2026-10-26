import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAncRecords, getDeliveries } from "@/lib/actions/maternity.actions";
import { fetchAllStaffs } from "@/lib/actions/staff.actions";
import { MaternityManager } from "./_components/MaternityManager";

const page = async () => {
    const [ancRecords, deliveries, staff] = await Promise.all([
        getAncRecords(),
        getDeliveries(),
        fetchAllStaffs(),
    ]);

    return (
        <>
            <Heading
                title="Maternity"
                description="Open antenatal-care episodes, record ANC visits and gestational age, log deliveries, and register newborns."
            />
            <Separator />
            <div className="pt-4">
                <MaternityManager
                    ancRecords={ancRecords || []}
                    deliveries={deliveries || []}
                    staff={staff || []}
                />
            </div>
        </>
    );
};

export default page;
