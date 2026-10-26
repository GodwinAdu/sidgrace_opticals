import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EditAccount } from "../_components/EditAccount";
import { listChartAccounts } from "@/lib/actions/accounting/chart-account.actions";
import Heading from "@/app/components/Heading";

type AccountProps = Promise<{ accountId: string }>;

const page = async ({ params }: { params: AccountProps }) => {
    const { accountId } = await params;
    const accounts = (await listChartAccounts()) || [];
    const initialData = accounts.find((a: { _id: string }) => String(a._id) === String(accountId));

    if (!initialData) {
        redirect("/dashboard/account/account-list");
    }

    // Candidate parents: same type, not itself (a child's type must match its parent).
    const parentOptions = accounts.filter(
        (a: { _id: string; type: string }) =>
            String(a._id) !== String(accountId) && a.type === initialData.type,
    );

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Edit Account" description="Update this chart of accounts entry." />
                <Link href={`/dashboard/account/account-list`} className={cn(buttonVariants())}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
            </div>
            <Separator />
            <div className="pt-4 w-full">
                <EditAccount initialData={initialData} parentOptions={parentOptions} />
            </div>
        </>
    );
};

export default page;