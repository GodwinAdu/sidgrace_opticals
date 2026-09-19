import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Heading from "@/app/components/Heading";
import { fetchAllHistories } from "@/lib/actions/history.actions";

interface HistoryItem {
    _id: string;
    actionType: string;
    message?: string;
    entityType?: string;
    performedBy?: { fullName?: string } | null;
    createdAt?: string;
}

const page = async () => {
    const histories = ((await fetchAllHistories(null, 100)) || []) as HistoryItem[];

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Audit Log" description="A chronological record of actions performed across the system." />
            </div>
            <Separator />

            <Card className="mt-4">
                <CardContent className="pt-6">
                    {histories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                    ) : (
                        <div className="divide-y">
                            {histories.map((h) => (
                                <div key={h._id} className="flex items-start justify-between gap-4 py-3">
                                    <div className="flex-1">
                                        <p className="text-sm">{h.message || h.actionType}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {h.performedBy?.fullName ? `${h.performedBy.fullName} • ` : ""}
                                            {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="shrink-0">{h.actionType}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default page;
