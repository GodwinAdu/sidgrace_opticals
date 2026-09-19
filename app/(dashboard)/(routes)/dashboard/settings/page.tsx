import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { SettingsForm } from "./_components/SettingsForm";

const page = async () => {
    const settings = await getClinicSettings();

    return (
        <>
            <Heading
                title="Settings"
                description="Clinic-wide billing defaults and service pricing."
            />
            <Separator />
            <div className="pt-4">
                <SettingsForm settings={settings || {}} />
            </div>
        </>
    );
};

export default page;
