import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditProcedure } from "../_components/EditProcedure";
import { getProcedureById } from "@/lib/actions/procedure.actions";
import Heading from "@/app/components/Heading";

type ProcedureProps = Promise<{ procedureId: string }>;

const page = async ({ params }: { params: ProcedureProps }) => {
    const { procedureId } = await params;
    const initialData = await getProcedureById(procedureId);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Update Procedure" description="Edit this procedure's details." />
                <Link href={`/dashboard/procedures`} className={cn(buttonVariants())}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />
            <div className="pt-4 w-full">
                <EditProcedure initialData={initialData} />
            </div>
        </>
    );
};

export default page;
