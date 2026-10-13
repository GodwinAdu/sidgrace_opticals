"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, BedDouble } from "lucide-react";
import { getAllWards } from "@/lib/actions/ward.actions";
import { getVacantBeds } from "@/lib/actions/bed.actions";
import { admitPatient } from "@/lib/actions/admission.actions";

interface WardLite { _id: string; name: string }
interface BedLite { _id: string; label: string }

/**
 * Inline "Admit" control for the attendance detail header. Lets the clinician
 * admit the current patient/visit to a ward + bed without leaving the chart.
 * Only rendered when the visit has no active admission.
 */
export function AdmitButton({
    patientId,
    attendanceId,
}: {
    patientId: string;
    attendanceId: string;
}) {
    const router = useRouter();
    const path = usePathname();

    const [open, setOpen] = useState(false);
    const [wards, setWards] = useState<WardLite[]>([]);
    const [beds, setBeds] = useState<BedLite[]>([]);
    const [wardId, setWardId] = useState("");
    const [bedId, setBedId] = useState("");
    const [reason, setReason] = useState("");
    const [loadingWards, setLoadingWards] = useState(false);
    const [admitting, setAdmitting] = useState(false);

    const onOpenChange = async (next: boolean) => {
        setOpen(next);
        if (next && wards.length === 0) {
            try {
                setLoadingWards(true);
                const w = await getAllWards();
                setWards((w || []).map((x: { _id: string; name: string }) => ({ _id: x._id, name: x.name })));
            } catch {
                setWards([]);
            } finally {
                setLoadingWards(false);
            }
        }
    };

    const pickWard = async (id: string) => {
        setWardId(id);
        setBedId("");
        try {
            setBeds((await getVacantBeds(id)) || []);
        } catch {
            setBeds([]);
        }
    };

    const admit = async () => {
        if (!wardId || !bedId) return toast.error("Select a ward and bed");
        try {
            setAdmitting(true);
            await admitPatient({ patientId, attendanceId, wardId, bedId, reason }, path);
            toast.success("Patient admitted");
            setOpen(false);
            setWardId(""); setBedId(""); setReason("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setAdmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                    <BedDouble className="h-4 w-4" /> Admit
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Admit Patient</DialogTitle>
                </DialogHeader>

                {loadingWards ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading wards...
                    </div>
                ) : wards.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">
                        No wards found. Create wards and beds under Inpatient → Wards &amp; Beds first.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Ward</label>
                            <Select value={wardId} onValueChange={pickWard}>
                                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                                <SelectContent>
                                    {wards.map((w) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Bed</label>
                            <Select value={bedId} onValueChange={setBedId} disabled={!wardId}>
                                <SelectTrigger><SelectValue placeholder="Select vacant bed" /></SelectTrigger>
                                <SelectContent>
                                    {beds.length === 0 ? (
                                        <SelectItem value="none" disabled>No vacant beds in this ward</SelectItem>
                                    ) : beds.map((b) => <SelectItem key={b._id} value={b._id}>{b.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Reason (optional)</label>
                            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Admission reason" />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={admit} disabled={admitting || !wardId || !bedId}>
                        {admitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BedDouble className="mr-2 h-4 w-4" />}
                        {admitting ? "Admitting..." : "Admit Patient"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
