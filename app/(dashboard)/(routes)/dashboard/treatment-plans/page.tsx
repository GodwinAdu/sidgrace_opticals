import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { PatientSearch } from "../clinical/_components/PatientSearch";

const page = async () => {
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Treatment Plans"
                    description="Search a patient to build and manage multi-phase treatment plans."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <PatientSearch basePath="/dashboard/treatment-plans" cta="Open Plans" />
            </div>
        </>
    );
};

export default page;
