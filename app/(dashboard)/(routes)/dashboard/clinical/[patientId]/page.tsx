import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPatientId } from "@/lib/actions/patient.actions";
import { getChartByPatient } from "@/lib/actions/dental-chart.actions";
import { getPerioChartsByPatient, getNotesByPatient } from "@/lib/actions/clinical.actions";
import { getImagingByPatient } from "@/lib/actions/imaging.actions";
import { getAppointmentsByPatient } from "@/lib/actions/portal.actions";
import { Odontogram } from "../_components/Odontogram";
import { PerioChart } from "../_components/PerioChart";
import { ClinicalNotes } from "../_components/ClinicalNotes";
import { Imaging } from "../_components/Imaging";

type ClinicalProps = Promise<{ patientId: string }>;

const page = async ({ params }: { params: ClinicalProps }) => {
    const { patientId } = await params;

    const [patient, chart, perioCharts, notes, images, appointments] = await Promise.all([
        fetchPatientId(patientId),
        getChartByPatient(patientId),
        getPerioChartsByPatient(patientId),
        getNotesByPatient(patientId),
        getImagingByPatient(patientId),
        getAppointmentsByPatient(patientId),
    ]);

    const patientName = patient?.fullName || "Patient";

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title={`Clinical Record — ${patientName}`}
                    description="Dental chart, treatment plan, periodontal chart, notes and imaging."
                />
                <div className="flex items-center gap-2">
                    <Link href={`/dashboard/portal/${patientId}`} className={cn(buttonVariants())}>
                        <History className="w-4 h-4 mr-2" />
                        Full Visit History
                    </Link>
                    <Link href={`/dashboard/clinical`} className={cn(buttonVariants({ variant: "outline" }))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Link>
                </div>
            </div>
            <Separator />

            <div className="pt-4">
                <Tabs defaultValue="chart" className="w-full">
                    <TabsList className="flex flex-wrap">
                        <TabsTrigger value="chart">Dental Chart</TabsTrigger>
                        <TabsTrigger value="treatment">Treatment Plan</TabsTrigger>
                        <TabsTrigger value="perio">Perio Chart</TabsTrigger>
                        <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
                        <TabsTrigger value="imaging">Imaging</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chart" className="pt-4">
                        <Odontogram
                            patientId={patientId}
                            initialConditions={chart?.conditions || []}
                            initialNotes={chart?.generalNotes || ""}
                        />
                    </TabsContent>

                    <TabsContent value="treatment" className="pt-4">
                        <p className="text-sm text-muted-foreground">Treatment plan module — available in the Treatment Plans section.</p>
                        <Link href={`/dashboard/treatment-plans/${patientId}`} className={cn(buttonVariants(), "mt-3")}>
                            Open Treatment Plans
                        </Link>
                    </TabsContent>
                    <TabsContent value="perio" className="pt-4">
                        <PerioChart patientId={patientId} charts={perioCharts || []} appointments={appointments || []} />
                    </TabsContent>
                    <TabsContent value="notes" className="pt-4">
                        <ClinicalNotes patientId={patientId} notes={notes || []} appointments={appointments || []} />
                    </TabsContent>
                    <TabsContent value="imaging" className="pt-4">
                        <Imaging patientId={patientId} images={images || []} appointments={appointments || []} />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default page;
