import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getEmergencyBoard, getDisposedEmergencyCases } from "@/lib/actions/emergency.actions";
import { EmergencyManager } from "./_components/EmergencyManager";

const page = async () => {
    const [board, disposed] = await Promise.all([
        getEmergencyBoard(),
        getDisposedEmergencyCases(),
    ]);

    return (
        <>
            <Heading title="Emergency / A&E" description="Triage arrivals, run the ER board, and set dispositions." />
            <Separator />
            <div className="pt-4">
                <EmergencyManager board={board || []} disposed={disposed || []} />
            </div>
        </>
    );
};

export default page;
