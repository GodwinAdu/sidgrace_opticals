import { Separator } from "@/components/ui/separator";
import { fetchDrugProducts } from "@/lib/actions/inventory-product.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { currentUser } from "@/lib/helpers/user.actions";
import PharmacyPOS from "./_components/PharmacyPOS";

const page = async () => {
    const [products, settings] = await Promise.all([
        fetchDrugProducts(),
        getClinicSettings(),
    ]);
    const clinicName = settings?.clinicName || "Clinic";
    const user = await currentUser();
    const cashierName = user?.fullName || "Cashier";

    return (
        <main className="min-h-screen bg-background py-6 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">Pharmacy Point of Sale</h1>
                    <p className="text-muted-foreground mb-6">
                        Over-the-counter drug sales for walk-in customers
                    </p>
                </div>
                <Separator />
                <div className="py-4">
                    <PharmacyPOS products={products} clinicName={clinicName} cashierName={cashierName} />
                </div>
            </div>
        </main>
    );
};

export default page;
