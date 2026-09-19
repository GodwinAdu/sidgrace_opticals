import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import Heading from "@/app/components/Heading";
import { getWaitlist, getNoShowStats } from "@/lib/actions/waitlist.actions";
import { WaitlistManager } from "./_components/WaitlistManager";

interface NoShowStats {
    total: number;
    noShows: number;
    rate: number;
    byPatient: { fullName?: string; patientId?: string; count: number }[];
}

const page = async () => {
    const [entries, stats] = await Promise.all([getWaitlist(), getNoShowStats()]);
    const s = (stats || { total: 0, noShows: 0, rate: 0, byPatient: [] }) as NoShowStats;

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Waitlist & No-Shows" description="Fill cancellations from the waitlist and monitor no-show rates." />
            </div>
            <Separator />

            <div className="grid gap-4 pt-4 sm:grid-cols-3">
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Appointments</p><p className="text-3xl font-bold">{s.total}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">No-shows</p><p className="text-3xl font-bold">{s.noShows}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">No-show Rate</p><p className="text-3xl font-bold">{s.rate}%</p></CardContent></Card>
            </div>

            {s.byPatient?.length > 0 && (
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Frequent No-Shows</p>
                        <div className="space-y-1.5">
                            {s.byPatient.map((p, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span>{p.fullName || "Unknown"}</span>
                                    <span className="font-semibold text-red-600">{p.count} no-shows</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="pt-6">
                <WaitlistManager entries={entries || []} />
            </div>
        </>
    );
};

export default page;
