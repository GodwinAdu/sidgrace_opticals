import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { PatientSearch } from "../../clinical/_components/PatientSearch";

const page = async () => {
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Insurance"
                    description="Search a patient to manage their insurance policies."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <PatientSearch basePath="/dashboard/billing/insurance" cta="Manage Insurance" />
            </div>
        </>
    );
};

export default page;
