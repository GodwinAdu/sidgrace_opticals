"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Wallet, Stethoscope, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateClinicSettings } from "@/lib/actions/clinic-settings.actions";

interface Settings {
    defaultConsultationFee?: number;
    currency?: string;
}

export function SettingsForm({ settings }: { settings: Settings }) {
    const router = useRouter();
    const path = usePathname();
    const [fee, setFee] = useState<string>(settings?.defaultConsultationFee ? String(settings.defaultConsultationFee) : "");
    const [currency, setCurrency] = useState<string>(settings?.currency || "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        try {
            setSaving(true);
            await updateClinicSettings(
                { defaultConsultationFee: Number(fee) || 0, currency: currency.trim() },
                path
            );
            toast.success("Settings saved");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Wallet className="h-5 w-5 text-teal-600" /> Billing Defaults
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">Default Consultation Fee</label>
                        <Input
                            type="number"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                            placeholder="0.00"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Pre-fills the consultation fee on each visit. Can still be edited per patient.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Currency Label</label>
                        <Input
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            placeholder="e.g. GHS, USD, ₦"
                            maxLength={6}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Shown alongside amounts in billing and reports.
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {saving ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Stethoscope className="h-5 w-5 text-teal-600" /> Service &amp; Procedure Pricing
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Prices for procedures and services (crowns, fillings, scaling, extractions, and so on)
                        are managed in the Procedure Catalog. Treatment plans and invoices pull their prices
                        from there.
                    </p>
                    <Link href="/dashboard/procedures" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                        Manage Procedure Pricing <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
