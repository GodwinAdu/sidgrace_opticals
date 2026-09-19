import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { PatientSearch } from "./_components/PatientSearch";

const page = async () => {
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Clinical Records"
                    description="Search a patient to open their dental chart, treatment plan, perio chart, clinical notes and imaging."
                />
            </div>
            <Separator />
            <div className="pt-4">
                <PatientSearch basePath="/dashboard/clinical" cta="Open Record" />
            </div>
        </>
    );
};

export default page;
