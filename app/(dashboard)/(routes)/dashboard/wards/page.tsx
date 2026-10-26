import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getBedBoard } from "@/lib/actions/bed.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { WardBedBoard } from "./_components/WardBedBoard";

const page = async () => {
    const [board, settings] = await Promise.all([getBedBoard(), getClinicSettings()]);
    const currency = settings?.currency || "";

    return (
        <>
            <Heading title="Wards & Beds" description="Manage wards, beds and view live bed occupancy." />
            <Separator />
            <div className="pt-4">
                <WardBedBoard board={board || []} currency={currency} />
            </div>
        </>
    );
};

export default page;
