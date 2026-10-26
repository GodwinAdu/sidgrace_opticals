import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import {
    getRequisitions,
    getPurchaseOrders,
    getGrns,
} from "@/lib/actions/procurement.actions";
import { fetchAllSuppliers } from "@/lib/actions/inventory-supplier.actions";
import { fetchAllProducts } from "@/lib/actions/inventory-product.actions";
import { ProcurementManager } from "./_components/ProcurementManager";

const page = async () => {
    const [requisitions, purchaseOrders, grns, suppliers, products] = await Promise.all([
        getRequisitions(),
        getPurchaseOrders(),
        getGrns(),
        fetchAllSuppliers(),
        fetchAllProducts(),
    ]);

    return (
        <>
            <Heading
                title="Procurement"
                description="Raise requisitions, approve them, issue purchase orders to suppliers, and receive goods against each order to update stock."
            />
            <Separator />
            <div className="pt-4">
                <ProcurementManager
                    requisitions={requisitions || []}
                    purchaseOrders={purchaseOrders || []}
                    grns={grns || []}
                    suppliers={suppliers || []}
                    products={products || []}
                />
            </div>
        </>
    );
};

export default page;
