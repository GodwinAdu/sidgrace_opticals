import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { fetchPatientId } from "@/lib/actions/patient.actions";
import { getConsentsByPatient } from "@/lib/actions/waitlist.actions";
import { ConsentManager } from "../_components/ConsentManager";

type Props = Promise<{ patientId: string }>;

const page = async ({ params }: { params: Props }) => {
    const { patientId } = await params;
    const [patient, consents] = await Promise.all([
        fetchPatientId(patientId),
        getConsentsByPatient(patientId),
    ]);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title={`Consent — ${patient?.fullName || "Patient"}`} description="Create and capture signed consent forms." />
                <Link href={`/dashboard/consent`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />
            <div className="pt-4">
                <ConsentManager patientId={patientId} consents={consents || []} />
            </div>
        </>
    );
};

export default page;
