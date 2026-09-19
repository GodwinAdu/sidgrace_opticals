import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getReportData } from "@/lib/actions/reports.actions";
import { ReportCharts } from "./_components/ReportCharts";

const page = async () => {
    const data = await getReportData();
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Reports & Analytics" description="Revenue, collections, appointments and treatment plan insights." />
            </div>
            <Separator />
            <div className="pt-4">
                <ReportCharts data={data} />
            </div>
        </>
    );
};

export default page;
