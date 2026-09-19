import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { columns } from "./_components/column";
import { DataTable } from "@/components/table/data-table";
import { getAllInvoices } from "@/lib/actions/invoice.actions";
import Heading from "@/app/components/Heading";

const page = async () => {
    const invoices = (await getAllInvoices()) || [];
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Invoices" description="Create, view and manage patient invoices." />
                <Link href={`/dashboard/billing/invoices/new`} className={cn(buttonVariants())}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Invoice
                </Link>
            </div>
            <Separator />
            <DataTable searchKey="invoiceNumber" columns={columns} data={invoices} />
        </>
    );
};

export default page;
