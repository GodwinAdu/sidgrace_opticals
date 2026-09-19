import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { getInvoiceById } from "@/lib/actions/invoice.actions";
import { getPaymentsByInvoice } from "@/lib/actions/payment.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { InvoiceView } from "../_components/InvoiceView";
import { PaymentPanel } from "../_components/PaymentPanel";

type InvoiceProps = Promise<{ invoiceId: string }>;

const page = async ({ params }: { params: InvoiceProps }) => {
    const { invoiceId } = await params;
    const [invoice, payments, settings] = await Promise.all([
        getInvoiceById(invoiceId),
        getPaymentsByInvoice(invoiceId),
        getClinicSettings(),
    ]);
    const currency = settings?.currency || "";

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Invoice" description="View invoice details, record payments and export a PDF." />
                <Link href={`/dashboard/billing/invoices`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />
            <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_360px]">
                <InvoiceView invoice={invoice} payments={payments || []} currency={currency} />
                <PaymentPanel invoice={invoice} payments={payments || []} />
            </div>
        </>
    );
};

export default page;
