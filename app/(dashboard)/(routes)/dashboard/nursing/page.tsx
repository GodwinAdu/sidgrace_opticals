import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BedDouble, Stethoscope } from "lucide-react";
import Heading from "@/app/components/Heading";
import { getActiveAdmissions } from "@/lib/actions/admission.actions";

interface AdmissionRow {
    _id: string;
    patientId?: { fullName?: string; patientId?: string } | string;
    attendanceId?: string;
    wardId?: { name?: string } | string;
    bedId?: { label?: string } | string;
    admittingStaff?: { fullName?: string } | string;
    admittedAt?: string;
    reason?: string;
}

const dayOfStay = (from?: string) => {
    if (!from) return 1;
    return Math.max(1, Math.ceil((Date.now() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)));
};

const page = async () => {
    const admissions: AdmissionRow[] = (await getActiveAdmissions()) || [];

    return (
        <>
            <Heading title="Nursing" description="Your inpatient worklist. Open a patient to record vitals, notes, medication and intake/output." />
            <Separator />

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Inpatients</p>
                        <p className="mt-1 text-2xl font-bold">{admissions.length}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3 pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Inpatients</h3>
                {admissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No admitted patients right now.</p>
                ) : (
                    admissions.map((a) => {
                        const pName = typeof a.patientId === "object" && a.patientId ? a.patientId.fullName : "";
                        const ward = typeof a.wardId === "object" && a.wardId ? a.wardId.name : "";
                        const bed = typeof a.bedId === "object" && a.bedId ? a.bedId.label : "";
                        const doc = typeof a.admittingStaff === "object" && a.admittingStaff ? a.admittingStaff.fullName : "";
                        return (
                            <Card key={a._id}>
                                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                            <BedDouble className="h-5 w-5" />
                                        </span>
                                        <div>
                                            <p className="font-semibold">{pName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {ward}{bed ? ` · Bed ${bed}` : ""} · Day {dayOfStay(a.admittedAt)}
                                                {doc ? ` · Dr ${doc}` : ""}
                                            </p>
                                            {a.reason && <p className="mt-0.5 text-xs text-muted-foreground">Reason: {a.reason}</p>}
                                        </div>
                                    </div>
                                    {a.attendanceId && (
                                        <Link href={`/dashboard/attendance/${a.attendanceId}`}>
                                            <Button size="sm" variant="outline">
                                                <Stethoscope className="mr-1 h-4 w-4" /> Open Chart
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </>
    );
};

export default page;
