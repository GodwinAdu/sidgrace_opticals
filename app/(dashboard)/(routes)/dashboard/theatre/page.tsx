import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import {
    getTheatres,
    getSurgerySchedule,
    getPastSurgeryCases,
} from "@/lib/actions/theatre.actions";
import { getAllProcedures } from "@/lib/actions/procedure.actions";
import { fetchAllStaffs } from "@/lib/actions/staff.actions";
import { TheatreManager } from "./_components/TheatreManager";

const page = async () => {
    const [theatres, schedule, past, procedures, staff] = await Promise.all([
        getTheatres(),
        getSurgerySchedule(),
        getPastSurgeryCases(),
        getAllProcedures(),
        fetchAllStaffs(),
    ]);

    return (
        <>
            <Heading
                title="Operating Theatre"
                description="Schedule surgery, run the OR board, record pre/post-op notes, and bill completed cases."
            />
            <Separator />
            <div className="pt-4">
                <TheatreManager
                    theatres={theatres || []}
                    schedule={schedule || []}
                    past={past || []}
                    procedures={procedures || []}
                    staff={staff || []}
                />
            </div>
        </>
    );
};

export default page;
