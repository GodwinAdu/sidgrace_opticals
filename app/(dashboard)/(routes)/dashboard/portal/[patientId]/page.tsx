import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarDays, ClipboardList, FileText, ShieldCheck, ImageIcon } from "lucide-react";
import Link from "next/link";
import Heading from "@/app/components/Heading";
import { fetchPatientId } from "@/lib/actions/patient.actions";
import { getAppointmentsByPatient } from "@/lib/actions/portal.actions";
import { getPlansByPatient } from "@/lib/actions/treatment-plan.actions";
import { getInvoicesByPatient } from "@/lib/actions/invoice.actions";
import { getImagingByPatient } from "@/lib/actions/imaging.actions";
import { getClaimsByPatient, getInsuranceByPatient } from "@/lib/actions/insurance.actions";
import { getConsentsByPatient } from "@/lib/actions/waitlist.actions";
import { getPatientTimeline } from "@/lib/actions/portal.actions";
import { getPrescriptionsByPatient } from "@/lib/actions/prescription.actions";
import { PatientTimeline } from "../_components/PatientTimeline";

type Props = Promise<{ patientId: string }>;

const page = async ({ params }: { params: Props }) => {
    const { patientId } = await params;

    const [patient, appointments, plans, invoices, imaging, insurance, claims, consents, timeline, prescriptions] = await Promise.all([
        fetchPatientId(patientId),
        getAppointmentsByPatient(patientId),
        getPlansByPatient(patientId),
        getInvoicesByPatient(patientId),
        getImagingByPatient(patientId),
        getInsuranceByPatient(patientId),
        getClaimsByPatient(patientId),
        getConsentsByPatient(patientId),
        getPatientTimeline(patientId),
        getPrescriptionsByPatient(patientId),
    ]);

    const totalBilled = (invoices || []).reduce((s: number, i: { total?: number }) => s + (Number(i.total) || 0), 0);
    const totalBalance = (invoices || []).reduce((s: number, i: { balance?: number }) => s + (Number(i.balance) || 0), 0);

    const summary = [
        { label: "Appointments", value: (appointments || []).length, icon: CalendarDays },
        { label: "Treatment Plans", value: (plans || []).length, icon: ClipboardList },
        { label: "Invoices", value: (invoices || []).length, icon: FileText },
        { label: "Imaging", value: (imaging || []).length, icon: ImageIcon },
    ];

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title={`360 View — ${patient?.fullName || "Patient"}`} description="A consolidated read-only summary of this patient's records." />
                <Link href={`/dashboard/portal`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Link>
            </div>
            <Separator />

            {/* Patient header */}
            <Card className="mt-4">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                    <div>
                        <p className="text-lg font-bold">{patient?.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                            {patient?.patientId ? `ID: ${patient.patientId}` : ""}
                            {patient?.phone ? ` • ${patient.phone}` : ""}
                            {patient?.gender ? ` • ${patient.gender}` : ""}
                        </p>
                    </div>
                    <div className="flex gap-6 text-right">
                        <div><p className="text-xs text-muted-foreground">Total Billed</p><p className="text-lg font-bold">{totalBilled.toFixed(2)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-red-600">{totalBalance.toFixed(2)}</p></div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-4 grid gap-4 sm:grid-cols-4">
                {summary.map((s) => (
                    <Card key={s.label}>
                        <CardContent className="flex items-center gap-3 pt-6">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"><s.icon className="h-5 w-5" /></span>
                            <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="pt-6">
                <Tabs defaultValue="timeline">
                    <TabsList className="flex flex-wrap">
                        <TabsTrigger value="timeline">Visit History</TabsTrigger>
                        <TabsTrigger value="appointments">Appointments</TabsTrigger>
                        <TabsTrigger value="plans">Treatment Plans</TabsTrigger>
                        <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                        <TabsTrigger value="invoices">Invoices</TabsTrigger>
                        <TabsTrigger value="insurance">Insurance & Claims</TabsTrigger>
                        <TabsTrigger value="imaging">Imaging</TabsTrigger>
                        <TabsTrigger value="consents">Consents</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="pt-4">
                        <PatientTimeline events={timeline || []} />
                    </TabsContent>

                    <TabsContent value="appointments" className="space-y-2 pt-4">
                        {(appointments || []).length === 0 && <p className="text-sm text-muted-foreground">No appointments.</p>}
                        {(appointments || []).map((a: { _id: string; date?: string; timeSlot?: string; appointmentType?: string; status?: string }) => (
                            <div key={a._id} className="flex items-center justify-between rounded border px-4 py-2 text-sm">
                                <span>{a.date ? new Date(a.date).toLocaleDateString() : ""} {a.timeSlot} • {a.appointmentType}</span>
                                <Badge variant="outline">{a.status}</Badge>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="plans" className="space-y-2 pt-4">
                        {(plans || []).length === 0 && <p className="text-sm text-muted-foreground">No treatment plans.</p>}
                        {(plans || []).map((p: { _id: string; title: string; status: string; totalCost: number }) => (
                            <div key={p._id} className="flex items-center justify-between rounded border px-4 py-2 text-sm">
                                <span>{p.title} <Badge variant="outline" className="ml-2">{p.status}</Badge></span>
                                <span className="font-semibold">{Number(p.totalCost).toFixed(2)}</span>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="prescriptions" className="space-y-3 pt-4">
                        {(prescriptions || []).length === 0 && <p className="text-sm text-muted-foreground">No prescriptions.</p>}
                        {(prescriptions || []).map((rx: { _id: string; status: string; createdAt?: string; prescribedBy?: { fullName?: string } | null; items?: { drugName?: string; dosage?: string; frequency?: string; duration?: string; quantity?: number }[] }) => (
                            <Card key={rx._id}>
                                <CardContent className="pt-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {rx.createdAt ? new Date(rx.createdAt).toLocaleString() : ""}
                                            {rx.prescribedBy?.fullName ? ` • ${rx.prescribedBy.fullName}` : ""}
                                        </span>
                                        <Badge variant="outline" className="capitalize">{rx.status}</Badge>
                                    </div>
                                    <ul className="mt-2 space-y-1 text-sm">
                                        {(rx.items || []).map((it, i) => (
                                            <li key={i} className="flex items-center justify-between">
                                                <span>{it.drugName}{[it.dosage, it.frequency, it.duration].filter(Boolean).length ? ` — ${[it.dosage, it.frequency, it.duration].filter(Boolean).join(", ")}` : ""}</span>
                                                <span className="text-muted-foreground">qty {it.quantity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="invoices" className="space-y-2 pt-4">
                        {(invoices || []).length === 0 && <p className="text-sm text-muted-foreground">No invoices.</p>}
                        {(invoices || []).map((inv: { _id: string; invoiceNumber: string; total: number; balance: number; status: string }) => (
                            <Link key={inv._id} href={`/dashboard/billing/invoices/${inv._id}`} className="flex items-center justify-between rounded border px-4 py-2 text-sm hover:bg-muted">
                                <span>{inv.invoiceNumber} <Badge variant="outline" className="ml-2">{inv.status}</Badge></span>
                                <span>Total {Number(inv.total).toFixed(2)} • Bal {Number(inv.balance).toFixed(2)}</span>
                            </Link>
                        ))}
                    </TabsContent>

                    <TabsContent value="insurance" className="space-y-3 pt-4">
                        <div>
                            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Policies</p>
                            {(insurance || []).length === 0 && <p className="text-sm text-muted-foreground">No insurance on file.</p>}
                            {(insurance || []).map((ins: { _id: string; insurer: string; policyNumber: string; coveragePercent: number }) => (
                                <div key={ins._id} className="flex items-center justify-between rounded border px-4 py-2 text-sm">
                                    <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" />{ins.insurer} — {ins.policyNumber}</span>
                                    <Badge variant="secondary">{ins.coveragePercent}%</Badge>
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Claims</p>
                            {(claims || []).length === 0 && <p className="text-sm text-muted-foreground">No claims.</p>}
                            {(claims || []).map((c: { _id: string; claimNumber: string; amountClaimed: number; status: string }) => (
                                <div key={c._id} className="flex items-center justify-between rounded border px-4 py-2 text-sm">
                                    <span>{c.claimNumber}</span>
                                    <span>{Number(c.amountClaimed).toFixed(2)} <Badge variant="outline" className="ml-1">{c.status}</Badge></span>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="imaging" className="pt-4">
                        {(imaging || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No imaging.</p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {(imaging || []).map((img: { _id: string; fileUrl: string; title: string; type: string }) => (
                                    <Card key={img._id} className="overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.fileUrl} alt={img.title} className="h-32 w-full object-cover" />
                                        <CardContent className="pt-2"><p className="truncate text-xs font-medium">{img.title}</p><p className="text-xs text-muted-foreground">{img.type}</p></CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="consents" className="space-y-2 pt-4">
                        {(consents || []).length === 0 && <p className="text-sm text-muted-foreground">No consent forms.</p>}
                        {(consents || []).map((c: { _id: string; procedureName: string; signed: boolean; signatureName?: string }) => (
                            <div key={c._id} className="flex items-center justify-between rounded border px-4 py-2 text-sm">
                                <span>{c.procedureName}</span>
                                {c.signed ? <Badge className="bg-green-600">Signed by {c.signatureName}</Badge> : <Badge variant="outline">Unsigned</Badge>}
                            </div>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default page;
