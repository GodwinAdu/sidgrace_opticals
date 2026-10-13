import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getReferrals } from "@/lib/actions/referral.actions";
import { ReferralManager } from "./_components/ReferralManager";

const page = async () => {
    const referrals = await getReferrals();

    return (
        <>
            <Heading
                title="Referrals"
                description="Refer patients in from, or out to, other facilities and providers, and track each referral through its workflow."
            />
            <Separator />
            <div className="pt-4">
                <ReferralManager referrals={referrals || []} />
            </div>
        </>
    );
};

export default page;
