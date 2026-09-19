import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { PatientSearch } from "../clinical/_components/PatientSearch";

const page = async () => {
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Patient Portal (360 View)" description="Search a patient to see a consolidated summary of their care, billing and records." />
            </div>
            <Separator />
            <div className="pt-4">
                <PatientSearch basePath="/dashboard/portal" cta="Open 360 View" />
            </div>
        </>
    );
};

export default page;
