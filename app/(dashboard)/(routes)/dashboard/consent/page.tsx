import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { PatientSearch } from "../clinical/_components/PatientSearch";

const page = async () => {
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Consent Forms" description="Search a patient to create and capture signed consent forms." />
            </div>
            <Separator />
            <div className="pt-4">
                <PatientSearch basePath="/dashboard/consent" cta="Manage Consent" />
            </div>
        </>
    );
};

export default page;
