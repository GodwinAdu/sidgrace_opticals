import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { getPendingPrescriptions } from "@/lib/actions/prescription.actions";
import { PharmacyQueue } from "./_components/PharmacyQueue";

const page = async () => {
    const prescriptions = await getPendingPrescriptions();

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title="Pharmacy"
                    description="Prescriptions awaiting dispensing. Fulfil against drug stock and bill the patient's visit."
                />
                <Link href="/dashboard/pharmacy/drugs" className={cn(buttonVariants({ variant: "outline" }))}>
                    <Pill className="mr-2 h-4 w-4" /> Drug Inventory
                </Link>
            </div>
            <Separator />
            <div className="pt-4">
                <PharmacyQueue prescriptions={prescriptions || []} />
            </div>
        </>
    );
};

export default page;
