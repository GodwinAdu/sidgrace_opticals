import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import Heading from "@/app/components/Heading";
import { formatMoney } from "@/lib/utils";
import { getBedOccupancy, getRevenueByMethod, getDrugConsumption } from "@/lib/actions/ops-dashboard.actions";

interface WardOcc { ward: string; total: number; occupied: number }
interface MethodRow { method: string; total: number; count: number }
interface DrugRow { name: string; quantity: number; value: number }

const page = async () => {
    const [occ, revenue, drugs] = await Promise.all([
        getBedOccupancy(),
        getRevenueByMethod(30),
        getDrugConsumption(30),
    ]);

    return (
        <>
            <Heading title="Operations" description="Live operational overview: bed occupancy, revenue and drug consumption." />
            <Separator />

            {/* Top stats */}
            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bed Occupancy</p>
                        <p className="mt-1 text-2xl font-bold">{occ.occupancyRate}%</p>
                        <p className="text-xs text-muted-foreground">{occ.occupied}/{occ.total} beds occupied</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Collected (30 days)</p>
                        <p className="mt-1 text-2xl font-bold">{formatMoney(revenue.total)}</p>
                        <p className="text-xs text-muted-foreground">across {revenue.byMethod.reduce((s: number, m: MethodRow) => s + m.count, 0)} payments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vacant Beds</p>
                        <p className="mt-1 text-2xl font-bold">{occ.vacant}</p>
                        <p className="text-xs text-muted-foreground">available now</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2">
                {/* Occupancy by ward */}
                <Card>
                    <CardContent className="space-y-3 pt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Occupancy by Ward</h3>
                        {occ.wards.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No wards configured.</p>
                        ) : (
                            occ.wards.map((w: WardOcc) => {
                                const rate = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
                                return (
                                    <div key={w.ward}>
                                        <div className="flex justify-between text-sm">
                                            <span>{w.ward}</span>
                                            <span className="text-muted-foreground">{w.occupied}/{w.total}</span>
                                        </div>
                                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                                            <div className="h-2 rounded-full bg-teal-500" style={{ width: `${rate}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Revenue by method */}
                <Card>
                    <CardContent className="space-y-2 pt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue by Method (30 days)</h3>
                        {revenue.byMethod.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No payments in this period.</p>
                        ) : (
                            revenue.byMethod.map((m: MethodRow) => (
                                <div key={m.method} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <span className="capitalize">{m.method}</span>
                                    <span className="font-medium">{formatMoney(m.total)} <span className="text-xs text-muted-foreground">({m.count})</span></span>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Drug consumption */}
            <div className="pt-6">
                <Card>
                    <CardContent className="space-y-2 pt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Drug / Product Consumption (30 days)</h3>
                        {drugs.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No products dispensed in this period.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {drugs.items.map((d: DrugRow) => (
                                    <div key={d.name} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                        <span>{d.name}</span>
                                        <span className="text-muted-foreground">qty {d.quantity} · {formatMoney(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default page;
