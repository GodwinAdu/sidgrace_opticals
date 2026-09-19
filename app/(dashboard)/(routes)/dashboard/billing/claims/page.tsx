import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAllClaims } from "@/lib/actions/insurance.actions";
import { ClaimsManager } from "./_components/ClaimsManager";

const page = async () => {
    const claims = (await getAllClaims()) || [];
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Insurance Claims" description="Create claims, track approvals and manage claim status." />
            </div>
            <Separator />
            <div className="pt-4">
                <ClaimsManager claims={claims} />
            </div>
        </>
    );
};

export default page;
