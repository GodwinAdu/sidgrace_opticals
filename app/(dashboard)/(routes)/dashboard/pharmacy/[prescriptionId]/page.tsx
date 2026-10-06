import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { getPrescriptionById } from "@/lib/actions/prescription.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { DispenseView } from "../_components/DispenseView";

type Props = Promise<{ prescriptionId: string }>;

const page = async ({ params }: { params: Props }) => {
    const { prescriptionId } = await params;
    const [prescription, settings] = await Promise.all([
        getPrescriptionById(prescriptionId),
        getClinicSettings(),
    ]);

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title="Dispense Prescription" description="Fulfil the prescribed drugs against stock and bill the patient's visit." />
                <Link href="/dashboard/pharmacy" className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to queue
                </Link>
            </div>
            <Separator />
            <div className="pt-4">
                {prescription ? (
                    <DispenseView prescription={prescription} currency={settings?.currency || ""} />
                ) : (
                    <p className="text-sm text-muted-foreground">Prescription not found.</p>
                )}
            </div>
        </>
    );
};

export default page;
