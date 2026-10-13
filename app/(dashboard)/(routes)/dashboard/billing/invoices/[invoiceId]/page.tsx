import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { Stethoscope } from "lucide-react";
import { getInvoiceById, getPatientOutstanding } from "@/lib/actions/invoice.actions";
import { getPaymentsByInvoice } from "@/lib/actions/payment.actions";
import { getClaimsByInvoice } from "@/lib/actions/insurance.actions";
import { refreshBedCharge } from "@/lib/actions/admission.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { InvoiceView } from "../_components/InvoiceView";
import { PaymentPanel } from "../_components/PaymentPanel";
import { InvoiceItemsEditor } from "../_components/InvoiceItemsEditor";
import { InvoiceClaimPanel } from "../_components/InvoiceClaimPanel";

type InvoiceProps = Promise<{ invoiceId: string }>;

const page = async ({ params }: { params: InvoiceProps }) => {
    const { invoiceId } = await params;

    // Keep an admitted patient's bed-day charge current before reading the
    // invoice (no-op for outpatient / discharged visits).
    const pre = await getInvoiceById(invoiceId);
    if (pre?.attendanceId) {
        await refreshBedCharge(String(pre.attendanceId));
    }

    const [invoice, payments, claims, settings] = await Promise.all([
        getInvoiceById(invoiceId),
        getPaymentsByInvoice(invoiceId),
        getClaimsByInvoice(invoiceId),
        getClinicSettings(),
    ]);
    const currency = settings?.currency || "";

    // Patient's PREVIOUS outstanding (excluding this invoice) for the settle UI.
    const patientId =
        invoice && typeof invoice.patientId === "object" && invoice.patientId
            ? invoice.patientId._id
            : (invoice?.patientId as string | undefined);
    const outstanding = patientId
        ? await getPatientOutstanding(String(patientId), invoiceId)
        : { total: 0, count: 0 };

    const attendanceId = invoice?.attendanceId ? String(invoice.attendanceId) : null;

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Invoice" description="View invoice details, edit charges, record payments and export a PDF." />
                <div className="flex gap-2">
                    {attendanceId && (
                        <Link href={`/dashboard/attendance/${attendanceId}`} className={cn(buttonVariants({ variant: "outline" }))}>
                            <Stethoscope className="w-4 h-4 mr-2" />
                            View Visit
                        </Link>
                    )}
                    <Link href={`/dashboard/billing/invoices`} className={cn(buttonVariants({ variant: "outline" }))}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Link>
                </div>
            </div>
            <Separator />
            <div className="grid gap-6 pt-4 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    <InvoiceView invoice={invoice} payments={payments || []} currency={currency} clinicName={settings?.clinicName} />
                    <InvoiceItemsEditor invoice={invoice} currency={currency} />
                    <InvoiceClaimPanel invoiceId={invoiceId} claims={claims || []} currency={currency} />
                </div>
                <PaymentPanel invoice={invoice} payments={payments || []} outstanding={outstanding} currency={currency} />
            </div>
        </>
    );
};

export default page;
