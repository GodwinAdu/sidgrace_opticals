import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getActiveAdmissions, getAwaitingAdmission } from "@/lib/actions/admission.actions";
import { getAllWards } from "@/lib/actions/ward.actions";
import { AdmissionManager } from "./_components/AdmissionManager";

interface WardLite { _id: string; name: string }

const page = async () => {
    const [wards, admissions, awaiting] = await Promise.all([
        getAllWards(),
        getActiveAdmissions(),
        getAwaitingAdmission(),
    ]);
    const wardList: WardLite[] = (wards || []).map((w: { _id: string; name: string }) => ({ _id: w._id, name: w.name }));

    return (
        <>
            <Heading title="Admissions" description="Admit, transfer and discharge inpatients." />
            <Separator />
            <div className="pt-4">
                <AdmissionManager wards={wardList} admissions={admissions || []} awaiting={awaiting || []} />
            </div>
        </>
    );
};

export default page;
