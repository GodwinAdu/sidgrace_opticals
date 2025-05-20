
import { Separator } from "@/components/ui/separator"
import { EditStore } from "../_components/EditStore"
import { fetchStoreById } from "@/lib/actions/inventory-store.actions"
import Heading from "@/app/components/Heading"


const page = async ({ params }: { params: { storeId: string } }) => {

    const data = await fetchStoreById(params.storeId as string)
    return (
        <>
            <div className="flex justify-between items-center">
                <Heading
                    title="Update Store"
                    description=" categories list "
                />

            </div>
            <Separator />
            <div className="py-4">
                <EditStore initialData={data} />
            </div>
        </>
    )
}

export default page
