import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { getAllProcedures } from "@/lib/actions/procedure.actions";
import { InvoiceBuilder } from "../_components/InvoiceBuilder";

const page = async () => {
    const procedures = (await getAllProcedures()) || [];
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="New Invoice" description="Build an invoice for a patient from the procedure catalog or manually." />
                <Link href={`/dashboard/billing/invoices`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />
            <div className="pt-4">
                <InvoiceBuilder procedures={procedures} />
            </div>
        </>
    );
};

export default page;
