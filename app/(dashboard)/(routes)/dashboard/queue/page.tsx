import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getQueueTickets } from "@/lib/actions/queue.actions";
import { getBedTransfers } from "@/lib/actions/admission.actions";
import { QueueManager } from "./_components/QueueManager";

const page = async () => {
    const [tickets, transfers] = await Promise.all([
        getQueueTickets(),
        getBedTransfers("pending-approval"),
    ]);

    return (
        <>
            <Heading
                title="Queue & Transfers"
                description="Issue service tokens for OPD, pharmacy and lab, run the called/serving display, and approve pending bed transfers."
            />
            <Separator />
            <div className="pt-4">
                <QueueManager tickets={tickets || []} transfers={transfers || []} />
            </div>
        </>
    );
};

export default page;
