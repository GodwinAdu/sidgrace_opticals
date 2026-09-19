import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAllLabCases } from "@/lib/actions/lab-case.actions";
import { LabCaseManager } from "./_components/LabCaseManager";

const page = async () => {
    const cases = (await getAllLabCases()) || [];
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Lab Cases" description="Track dental lab cases (crowns, dentures, bridges) sent to external labs." />
            </div>
            <Separator />
            <div className="pt-4">
                <LabCaseManager cases={cases} />
            </div>
        </>
    );
};

export default page;
