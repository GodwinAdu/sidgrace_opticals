import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { fetchPatientId } from "@/lib/actions/patient.actions";
import { getPlansByPatient } from "@/lib/actions/treatment-plan.actions";
import { getAllProcedures } from "@/lib/actions/procedure.actions";
import { TreatmentPlanBuilder } from "../_components/TreatmentPlanBuilder";
import { ExistingPlans } from "../_components/ExistingPlans";

type PlanProps = Promise<{ patientId: string }>;

const page = async ({ params }: { params: PlanProps }) => {
    const { patientId } = await params;

    const [patient, plans, procedures] = await Promise.all([
        fetchPatientId(patientId),
        getPlansByPatient(patientId),
        getAllProcedures(),
    ]);

    const patientName = patient?.fullName || "Patient";

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title={`Treatment Plans — ${patientName}`}
                    description="Build multi-phase plans from the procedure catalog and track patient acceptance."
                />
                <Link href={`/dashboard/treatment-plans`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />

            <div className="grid gap-6 pt-4 lg:grid-cols-2">
                <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">New Plan</h2>
                    <TreatmentPlanBuilder patientId={patientId} procedures={procedures || []} />
                </div>
                <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Existing Plans</h2>
                    <ExistingPlans plans={plans || []} />
                </div>
            </div>
        </>
    );
};

export default page;
