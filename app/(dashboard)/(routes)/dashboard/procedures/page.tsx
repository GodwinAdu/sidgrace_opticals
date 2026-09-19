import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAllProcedures } from "@/lib/actions/procedure.actions";
import { ProcedureManager } from "./_components/ProcedureManager";

const page = async () => {
    const procedures = await getAllProcedures();

    return (
        <>
            <Heading
                title="Procedure Catalog"
                description="Manage the price list for procedures and services. Treatment plans and invoices use these prices."
            />
            <Separator />
            <div className="pt-4">
                <ProcedureManager procedures={procedures || []} />
            </div>
        </>
    );
};

export default page;
