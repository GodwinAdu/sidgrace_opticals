import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { ORDER_SETS } from "@/lib/clinical/cpoe";
import { CpoeManager } from "./_components/CpoeManager";

const page = async () => {
    return (
        <>
            <Heading
                title="Order Entry (CPOE)"
                description="Place lab, radiology, and drug orders from one screen, with order sets and allergy checks."
            />
            <Separator />
            <div className="pt-4">
                <CpoeManager orderSets={ORDER_SETS} />
            </div>
        </>
    );
};

export default page;
