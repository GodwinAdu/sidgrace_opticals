import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { columns } from "./_components/column";
import { DataTable } from "@/components/table/data-table";
import { getAllInvoices } from "@/lib/actions/invoice.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Heading from "@/app/components/Heading";

interface InvoiceLite {
    total?: number;
    amountPaid?: number;
    balance?: number;
    status?: string;
}

const page = async () => {
    const [invoices, settings] = await Promise.all([
        getAllInvoices(),
        getClinicSettings(),
    ]);
    const list = invoices || [];
    const currency = settings?.currency || "";

    // Summary stats from real data (exclude cancelled from money totals).
    const active = (list as InvoiceLite[]).filter((i) => i.status !== "cancelled");
    const totalBilled = active.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalCollected = active.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);
    const totalOutstanding = active.reduce((s, i) => s + (Number(i.balance) || 0), 0);

    const stats = [
        { label: "Total Billed", value: totalBilled },
        { label: "Collected", value: totalCollected },
        { label: "Outstanding", value: totalOutstanding },
    ];

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
            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
                {stats.map((s) => (
                    <Card key={s.label}>
                        <CardContent className="pt-6">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                            <p className="mt-1 text-2xl font-bold">{formatMoney(s.value, currency)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <DataTable searchKey="invoiceNumber" columns={columns} data={list} />
        </>
    );
};

export default page;
