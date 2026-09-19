import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAllRecalls } from "@/lib/actions/recall.actions";
import { RecallManager } from "./_components/RecallManager";

const page = async () => {
    const recalls = (await getAllRecalls()) || [];
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Recalls & Reminders" description="Schedule periodic patient recalls and send SMS reminders." />
            </div>
            <Separator />
            <div className="pt-4">
                <RecallManager recalls={recalls} />
            </div>
        </>
    );
};

export default page;
