import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAllBranches } from "@/lib/actions/branch.actions";
import { BranchManager } from "./_components/BranchManager";

const page = async () => {
    const branches = (await getAllBranches()) || [];
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Branches" description="Manage clinic locations for multi-branch operations." />
            </div>
            <Separator />
            <div className="pt-4">
                <BranchManager branches={branches} />
            </div>
        </>
    );
};

export default page;
