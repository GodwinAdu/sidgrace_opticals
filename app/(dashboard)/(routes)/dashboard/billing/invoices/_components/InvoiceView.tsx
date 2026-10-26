"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, Printer, ReceiptText, Zap } from "lucide-react";
import { toast } from "sonner";
import { buildEposReceiptXml, eposEndpoint, sendToEposPrinter } from "@/lib/clinical/epos-receipt";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "@/lib/utils";

interface Item { description: string; tooth?: number | null; quantity: number; unitPrice: number; amount: number; }
interface Invoice {
    _id: string;
    invoiceNumber: string;
    patientId?: { fullName?: string; patientId?: string; phone?: string; email?: string; address?: string } | string;
    items: Item[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    amountPaid: number;
    balance: number;
    status: string;
    notes?: string;
    createdAt?: string;
    dueDate?: string | null;
}
interface Payment {
    _id?: string;
    amount?: number;
    method?: string;
    reference?: string;
    receivedBy?: { fullName?: string } | null;
    createdAt?: string;
}

const CLINIC_NAME = "Dapfam Dental Clinic";

const STATUS: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-gray-200 text-gray-600",
};

interface ClinicInfo {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
}

interface EposConfig {
    enabled?: boolean;
    printerUrl?: string;
    deviceId?: string;
    openDrawer?: boolean;
}

export function InvoiceView({
    invoice,
    payments = [],
    currency = "",
    clinicName,
    clinic,
    epos,
}: {
    invoice: Invoice;
    payments?: Payment[];
    currency?: string;
    clinicName?: string;
    clinic?: ClinicInfo;
    epos?: EposConfig;
}) {
    const CLINIC = clinic?.name || clinicName || CLINIC_NAME;
    const patient = typeof invoice.patientId === "object" ? invoice.patientId : null;
    const m = (n: number) => formatMoney(n, currency);

    /**
     * Print the compact 80mm receipt (Epson / thermal). We toggle a body class so
     * the receipt-only print CSS applies, print, then remove it on the next tick
     * (and defensively on afterprint) so the normal page/print is unaffected.
     */
    const printReceipt = () => {
        const body = document.body;
        body.classList.add("printing-receipt");
        const cleanup = () => body.classList.remove("printing-receipt");
        window.addEventListener("afterprint", cleanup, { once: true });
        window.print();
        // Fallback cleanup in case afterprint does not fire (some browsers).
        setTimeout(cleanup, 1000);
    };

    /**
     * One-click, driverless print straight to a networked Epson ePOS printer.
     * Builds the ePOS XML from the invoice and POSTs it to the printer's own web
     * service. On ANY failure (printer off, wrong IP, CORS/mixed-content) it
     * falls back to the browser receipt print so the cashier always gets a slip.
     */
    const quickPrintEpson = async () => {
        if (!epos?.enabled || !epos.printerUrl) {
            // Not configured → just use the browser receipt print.
            printReceipt();
            return;
        }
        const t = toast.loading("Printing to Epson…");
        try {
            const xml = buildEposReceiptXml({
                clinicName: CLINIC,
                clinicAddress: clinic?.address,
                clinicPhone: clinic?.phone,
                title: "RECEIPT",
                invoiceNumber: invoice.invoiceNumber,
                dateText: invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : new Date().toLocaleString(),
                patientName: patient?.fullName || "Patient",
                patientId: patient?.patientId,
                lines: invoice.items.map((it) => ({
                    name: it.description,
                    detail: `${it.quantity} x ${m(Number(it.unitPrice))}`,
                    amount: m(Number(it.amount)),
                })),
                totals: [
                    { label: "Subtotal", value: m(invoice.subtotal) },
                    ...(invoice.tax ? [{ label: "Tax", value: m(invoice.tax) }] : []),
                    ...(invoice.discount ? [{ label: "Discount", value: `-${m(invoice.discount)}` }] : []),
                    { label: "TOTAL", value: m(invoice.total), bold: true },
                    { label: "Paid", value: m(invoice.amountPaid) },
                    { label: "Balance", value: m(invoice.balance), bold: true },
                ],
                footer: `Thank you for choosing ${CLINIC}.`,
                // Only kick the drawer when configured AND something was paid.
                openDrawer: !!epos.openDrawer && invoice.amountPaid > 0,
                width: 42,
            });
            const endpoint = eposEndpoint(epos.printerUrl, epos.deviceId || "local_printer");
            const result = await sendToEposPrinter(endpoint, xml);
            if (result.ok) {
                toast.success("Receipt sent to Epson printer", { id: t });
            } else {
                toast.error("Epson print failed — using browser print", {
                    id: t,
                    description: result.error,
                });
                printReceipt();
            }
        } catch (err) {
            toast.error("Epson print failed — using browser print", {
                id: t,
                description: err instanceof Error ? err.message : undefined,
            });
            printReceipt();
        }
    };

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(CLINIC, 14, 20);
        doc.setFontSize(11);
        doc.text(`Invoice: ${invoice.invoiceNumber}`, 14, 30);
        doc.text(`Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : ""}`, 14, 36);
        doc.text(`Patient: ${patient?.fullName || ""}`, 14, 42);
        if (patient?.phone) doc.text(`Phone: ${patient.phone}`, 14, 48);

        autoTable(doc, {
            startY: 56,
            head: [["Description", "Qty", "Unit Price", "Amount"]],
            body: invoice.items.map((it) => [
                it.description,
                String(it.quantity),
                m(Number(it.unitPrice)),
                m(Number(it.amount)),
            ]),
        });

        // @ts-expect-error lastAutoTable is added by the autotable plugin at runtime
        const y = (doc.lastAutoTable?.finalY || 80) + 8;
        doc.text(`Subtotal: ${m(invoice.subtotal)}`, 140, y);
        doc.text(`Tax: ${m(invoice.tax)}`, 140, y + 6);
        doc.text(`Discount: ${m(invoice.discount)}`, 140, y + 12);
        doc.setFontSize(13);
        doc.text(`Total: ${m(invoice.total)}`, 140, y + 20);
        doc.setFontSize(11);
        doc.text(`Paid: ${m(invoice.amountPaid)}`, 140, y + 26);
        doc.text(`Balance: ${m(invoice.balance)}`, 140, y + 32);

        doc.save(`${invoice.invoiceNumber}.pdf`);
    };

    const print = () => window.print();

    return (
        <>
        <Card className="print:border-0 print:shadow-none">
            <CardContent className="pt-6" id="invoice-print-area">
                {/* Clinic header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-teal-700">{CLINIC}</h1>
                        <p className="text-sm text-muted-foreground">Invoice / Receipt</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold">{invoice.invoiceNumber}</h2>
                        <p className="text-sm text-muted-foreground">
                            {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : ""}
                        </p>
                        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium uppercase ${STATUS[invoice.status] || ""}`}>
                            {invoice.status}
                        </span>
                    </div>
                </div>

                {/* Bill-to */}
                <div className="flex flex-wrap justify-between gap-4 py-4 text-sm">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill To</p>
                        <p className="font-semibold">{patient?.fullName || "Patient"}</p>
                        {patient?.patientId && <p className="text-muted-foreground">ID: {patient.patientId}</p>}
                        {patient?.phone && <p className="text-muted-foreground">{patient.phone}</p>}
                        {patient?.address && <p className="text-muted-foreground">{patient.address}</p>}
                    </div>
                    {invoice.dueDate && (
                        <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date</p>
                            <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>

                {/* Items */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                                <th className="px-2 py-2">Description</th>
                                <th className="px-2 py-2 text-center">Qty</th>
                                <th className="px-2 py-2 text-right">Unit Price</th>
                                <th className="px-2 py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((it, i) => (
                                <tr key={i} className="border-b">
                                    <td className="px-2 py-2">{it.description}</td>
                                    <td className="px-2 py-2 text-center">{it.quantity}</td>
                                    <td className="px-2 py-2 text-right">{m(Number(it.unitPrice))}</td>
                                    <td className="px-2 py-2 text-right">{m(Number(it.amount))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-xs space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{m(invoice.subtotal)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{m(invoice.tax)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{m(invoice.discount)}</span></div>
                        <div className="flex justify-between border-t pt-1.5 text-base font-bold"><span>Total</span><span>{m(invoice.total)}</span></div>
                        <div className="flex justify-between text-green-600"><span>Paid</span><span>{m(invoice.amountPaid)}</span></div>
                        <div className="flex justify-between border-t pt-1.5 font-bold">
                            <span>Balance Due</span>
                            <span className={invoice.balance > 0 ? "text-red-600" : "text-green-600"}>{m(invoice.balance)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment history */}
                {payments.length > 0 && (
                    <div className="mt-6">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment History</p>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="py-1.5">Date</th>
                                    <th className="py-1.5">Method</th>
                                    <th className="py-1.5">Received By</th>
                                    <th className="py-1.5 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, i) => (
                                    <tr key={p._id || i} className="border-b">
                                        <td className="py-1.5">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}</td>
                                        <td className="py-1.5 capitalize">{p.method}</td>
                                        <td className="py-1.5">{p.receivedBy?.fullName || "—"}</td>
                                        <td className="py-1.5 text-right">{m(Number(p.amount) || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {invoice.notes && <p className="mt-4 text-sm text-muted-foreground">Notes: {invoice.notes}</p>}

                <p className="mt-8 text-center text-xs text-muted-foreground print:mt-16">
                    Thank you for choosing {CLINIC}.
                </p>

                {/* Actions — hidden when printing */}
                <div className="mt-6 flex justify-end gap-2 print:hidden">
                    {epos?.enabled && epos.printerUrl ? (
                        <Button onClick={quickPrintEpson}>
                            <Zap className="mr-2 h-4 w-4" /> Quick Print (Epson)
                        </Button>
                    ) : null}
                    <Button variant="outline" onClick={printReceipt}>
                        <ReceiptText className="mr-2 h-4 w-4" /> Print Receipt
                    </Button>
                    <Button variant="outline" onClick={print}>
                        <Printer className="mr-2 h-4 w-4" /> Print A4
                    </Button>
                    <Button variant="outline" onClick={exportPdf}>
                        <FileDown className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* ───────── 80mm thermal receipt (screen-hidden; printed via "Print Receipt") ───────── */}
        <div id="receipt-print-area" style={{ width: "72mm", fontSize: "11px", lineHeight: 1.35 }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{CLINIC}</div>
                {clinic?.address ? <div>{clinic.address}</div> : null}
                {clinic?.phone ? <div>Tel: {clinic.phone}</div> : null}
                <div style={{ marginTop: 4 }}>RECEIPT</div>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>No:</span><span>{invoice.invoiceNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Date:</span>
                <span>{invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : ""}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Patient:</span><span>{patient?.fullName || "Patient"}</span>
            </div>
            {patient?.patientId ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>ID:</span><span>{patient.patientId}</span>
                </div>
            ) : null}

            <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            {invoice.items.map((it, i) => (
                <div key={i} style={{ marginBottom: 3 }}>
                    <div>{it.description}</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{it.quantity} x {m(Number(it.unitPrice))}</span>
                        <span>{m(Number(it.amount))}</span>
                    </div>
                </div>
            ))}

            <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span><span>{m(invoice.subtotal)}</span>
            </div>
            {invoice.tax ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tax</span><span>{m(invoice.tax)}</span>
                </div>
            ) : null}
            {invoice.discount ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Discount</span><span>-{m(invoice.discount)}</span>
                </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "13px", marginTop: 2 }}>
                <span>TOTAL</span><span>{m(invoice.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Paid</span><span>{m(invoice.amountPaid)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Balance</span><span>{m(invoice.balance)}</span>
            </div>

            <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            <div style={{ textAlign: "center", marginTop: 4 }}>
                Thank you for choosing {CLINIC}.
            </div>
            <div style={{ textAlign: "center", fontSize: "9px", marginTop: 2 }}>
                {new Date().toLocaleString()}
            </div>
        </div>
        </>
    );
}
