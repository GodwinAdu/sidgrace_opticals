import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { fetchDrugProducts } from "@/lib/actions/inventory-product.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { DrugList } from "../_components/DrugList";

const page = async () => {
    const [drugs, settings] = await Promise.all([fetchDrugProducts(), getClinicSettings()]);

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title="Drug Inventory" description="Medications in stock. Mark inventory products as drugs to list them here." />
                <Link href="/dashboard/pharmacy" className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Pharmacy
                </Link>
            </div>
            <Separator />
            <div className="pt-4">
                <DrugList drugs={drugs || []} currency={settings?.currency || ""} />
            </div>
        </>
    );
};

export default page;
