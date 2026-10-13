import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import {
    getBloodUnits,
    getSpecimens,
    getLabOrdersForSpecimen,
} from "@/lib/actions/blood-bank.actions";
import { BloodBankManager } from "./_components/BloodBankManager";

const page = async () => {
    const [units, specimens, labOrders] = await Promise.all([
        getBloodUnits(),
        getSpecimens(),
        getLabOrdersForSpecimen(),
    ]);

    return (
        <>
            <Heading
                title="Blood Bank & Specimens"
                description="Register blood units, crossmatch and issue them to patients, and track lab specimens through their lifecycle."
            />
            <Separator />
            <div className="pt-4">
                <BloodBankManager
                    units={units || []}
                    specimens={specimens || []}
                    labOrders={labOrders || []}
                />
            </div>
        </>
    );
};

export default page;
