import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { fetchPatientId } from "@/lib/actions/patient.actions";
import { getInsuranceByPatient } from "@/lib/actions/insurance.actions";
import { InsuranceManager } from "../_components/InsuranceManager";

type Props = Promise<{ patientId: string }>;

const page = async ({ params }: { params: Props }) => {
    const { patientId } = await params;
    const [patient, records] = await Promise.all([
        fetchPatientId(patientId),
        getInsuranceByPatient(patientId),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title={`Insurance — ${patient?.fullName || "Patient"}`} description="Manage insurance policies for this patient." />
                <Link href={`/dashboard/billing/insurance`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />
            <div className="pt-4">
                <InsuranceManager patientId={patientId} records={records || []} />
            </div>
        </>
    );
};

export default page;
