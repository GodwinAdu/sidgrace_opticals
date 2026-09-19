import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAllRosters } from "@/lib/actions/roster.actions";
import { fetchAllStaffs } from "@/lib/actions/staff.actions";
import { RosterManager } from "./_components/RosterManager";

const page = async () => {
    const [rosters, staff] = await Promise.all([getAllRosters(), fetchAllStaffs()]);
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Staff Roster" description="Schedule and view staff shifts by chair/room and date." />
            </div>
            <Separator />
            <div className="pt-4">
                <RosterManager staff={staff || []} rosters={rosters || []} />
            </div>
        </>
    );
};

export default page;
