import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getAssets } from "@/lib/actions/asset.actions";
import { AssetManager } from "./_components/AssetManager";

const page = async () => {
    const assets = await getAssets();

    return (
        <>
            <Heading
                title="Equipment & Biomedical Assets"
                description="Register equipment with a tag, location and status, schedule preventive maintenance, and track service history with due / overdue alerts."
            />
            <Separator />
            <div className="pt-4">
                <AssetManager assets={assets || []} />
            </div>
        </>
    );
};

export default page;
