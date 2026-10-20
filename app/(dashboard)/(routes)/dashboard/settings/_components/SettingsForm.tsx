"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Wallet, Stethoscope, ArrowUpRight, Printer, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { updateClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { buildEposTestXml, eposEndpoint, sendToEposPrinter } from "@/lib/clinical/epos-receipt";

interface Settings {
    defaultConsultationFee?: number;
    currency?: string;
    clinicName?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicEmail?: string;
    eposEnabled?: boolean;
    eposPrinterUrl?: string;
    eposDeviceId?: string;
    eposOpenDrawer?: boolean;
}

export function SettingsForm({ settings }: { settings: Settings }) {
    const router = useRouter();
    const path = usePathname();
    const [fee, setFee] = useState<string>(settings?.defaultConsultationFee ? String(settings.defaultConsultationFee) : "");
    const [currency, setCurrency] = useState<string>(settings?.currency || "");
    const [clinicName, setClinicName] = useState<string>(settings?.clinicName || "");
    const [clinicAddress, setClinicAddress] = useState<string>(settings?.clinicAddress || "");
    const [clinicPhone, setClinicPhone] = useState<string>(settings?.clinicPhone || "");
    const [eposEnabled, setEposEnabled] = useState<boolean>(!!settings?.eposEnabled);
    const [eposPrinterUrl, setEposPrinterUrl] = useState<string>(settings?.eposPrinterUrl || "");
    const [eposDeviceId, setEposDeviceId] = useState<string>(settings?.eposDeviceId || "local_printer");
    const [eposOpenDrawer, setEposOpenDrawer] = useState<boolean>(!!settings?.eposOpenDrawer);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const save = async () => {
        try {
            setSaving(true);
            await updateClinicSettings(
                {
                    defaultConsultationFee: Number(fee) || 0,
                    currency: currency.trim(),
                    clinicName: clinicName.trim(),
                    clinicAddress: clinicAddress.trim(),
                    clinicPhone: clinicPhone.trim(),
                    eposEnabled,
                    eposPrinterUrl: eposPrinterUrl.trim(),
                    eposDeviceId: eposDeviceId.trim() || "local_printer",
                    eposOpenDrawer,
                },
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

    /**
     * Fire a one-line ESC/POS test slip to the Epson using the CURRENT form
     * values (so staff can verify the IP/device id before saving). Resolves to a
     * clear success/failure toast; never throws.
     */
    const testPrinter = async () => {
        const url = eposPrinterUrl.trim();
        if (!url) {
            toast.error("Enter the printer address (IP) first");
            return;
        }
        setTesting(true);
        const t = toast.loading("Sending test slip to the printer…");
        try {
            const xml = buildEposTestXml(clinicName.trim() || "Clinic");
            const endpoint = eposEndpoint(url, eposDeviceId.trim() || "local_printer");
            const result = await sendToEposPrinter(endpoint, xml);
            if (result.ok) {
                toast.success("Test slip printed — the printer is reachable", { id: t });
            } else {
                toast.error("Could not print the test slip", {
                    id: t,
                    description: result.error || result.code || "Check the IP, device id, and that ePOS-Print is enabled on the printer.",
                });
            }
        } catch (err) {
            toast.error("Could not reach the printer", {
                id: t,
                description: err instanceof Error ? err.message : undefined,
            });
        } finally {
            setTesting(false);
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="h-5 w-5 text-teal-600" /> Clinic Identity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Shown on invoices, receipts and report headers.
                    </p>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Clinic Name</label>
                        <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g. SidGrace Opticals" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Address</label>
                        <Input value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} placeholder="Street, City" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Phone</label>
                        <Input value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} placeholder="Contact number on the receipt" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Printer className="h-5 w-5 text-teal-600" /> Receipt Printer (Epson)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <p className="text-sm font-medium">Enable one-click Epson printing</p>
                            <p className="text-xs text-muted-foreground">
                                Prints receipts straight to a networked Epson ePOS printer — no dialog.
                            </p>
                        </div>
                        <Switch checked={eposEnabled} onCheckedChange={setEposEnabled} />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Printer Address (IP)</label>
                        <Input value={eposPrinterUrl} onChange={(e) => setEposPrinterUrl(e.target.value)} placeholder="http://192.168.1.50" disabled={!eposEnabled} />
                        <p className="mt-1 text-xs text-muted-foreground">
                            The printer&apos;s IP (ePOS-Print enabled in its settings). Use http unless it serves a trusted https cert.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Device ID</label>
                        <Input value={eposDeviceId} onChange={(e) => setEposDeviceId(e.target.value)} placeholder="local_printer" disabled={!eposEnabled} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <p className="text-sm font-medium">Open cash drawer on paid receipt</p>
                            <p className="text-xs text-muted-foreground">Kicks the drawer after a receipt with a payment.</p>
                        </div>
                        <Switch checked={eposOpenDrawer} onCheckedChange={setEposOpenDrawer} disabled={!eposEnabled} />
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={testPrinter} disabled={testing || !eposPrinterUrl.trim()}>
                            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                            {testing ? "Testing…" : "Test printer"}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Prints a short test slip using the values above (no need to save first). If the printer is
                        unreachable, the invoice falls back to the browser receipt print automatically.
                    </p>
                </CardContent>
            </Card>

            <div className="lg:col-span-2 flex justify-end">
                <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {saving ? "Saving..." : "Save Settings"}
                </Button>
            </div>
        </div>
    );
}
