"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, AlertTriangle, Activity, Syringe, HeartPulse } from "lucide-react";
import {
    getEmrByPatient,
    createProblem, deleteProblem,
    createAllergy, deleteAllergy,
    createImmunization, deleteImmunization,
} from "@/lib/actions/emr.actions";

/* ── shared record shapes (serialized from the server) ── */
interface ProblemRow {
    _id: string;
    condition: string;
    icd10Code?: string;
    status?: "active" | "resolved";
    onsetDate?: string | null;
    note?: string;
    createdAt?: string;
}
interface AllergyRow {
    _id: string;
    substance: string;
    reaction?: string;
    severity?: "mild" | "moderate" | "severe" | "unknown";
    status?: "active" | "inactive";
    note?: string;
    createdAt?: string;
}
interface ImmunizationRow {
    _id: string;
    vaccine: string;
    dose?: string;
    administeredDate?: string | null;
    route?: string;
    site?: string;
    batchNumber?: string;
    note?: string;
    createdAt?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
    severe: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
    moderate: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    mild: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
    unknown: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
    return (
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon className="h-4 w-4" /> {children}
        </h3>
    );
}

export function StructuredEmr({ patientId, canEdit = true }: { patientId: string; canEdit?: boolean }) {
    const path = usePathname();
    const [loading, setLoading] = useState(true);
    const [problems, setProblems] = useState<ProblemRow[]>([]);
    const [allergies, setAllergies] = useState<AllergyRow[]>([]);
    const [immunizations, setImmunizations] = useState<ImmunizationRow[]>([]);

    // form state
    const [pForm, setPForm] = useState({ condition: "", icd10Code: "", status: "active", onsetDate: "", note: "" });
    const [aForm, setAForm] = useState({ substance: "", reaction: "", severity: "unknown", note: "" });
    const [iForm, setIForm] = useState({ vaccine: "", dose: "", administeredDate: "", route: "", site: "", batchNumber: "", note: "" });
    const [savingP, setSavingP] = useState(false);
    const [savingA, setSavingA] = useState(false);
    const [savingI, setSavingI] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!patientId) return;
        setLoading(true);
        getEmrByPatient(patientId)
            .then((emr) => {
                if (!active) return;
                setProblems(emr?.problems || []);
                setAllergies(emr?.allergies || []);
                setImmunizations(emr?.immunizations || []);
            })
            .catch(() => active && toast.error("Failed to load EMR"))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [patientId]);

    const addProblem = async () => {
        if (!pForm.condition.trim()) return toast.error("Enter a condition");
        try {
            setSavingP(true);
            const row = await createProblem(patientId, {
                condition: pForm.condition,
                icd10Code: pForm.icd10Code,
                status: pForm.status as "active" | "resolved",
                onsetDate: pForm.onsetDate || null,
                note: pForm.note,
            }, path);
            setProblems((p) => [row, ...p]);
            setPForm({ condition: "", icd10Code: "", status: "active", onsetDate: "", note: "" });
            toast.success("Problem added");
        } catch { toast.error("Something went wrong"); } finally { setSavingP(false); }
    };

    const addAllergy = async () => {
        if (!aForm.substance.trim()) return toast.error("Enter a substance");
        try {
            setSavingA(true);
            const row = await createAllergy(patientId, {
                substance: aForm.substance,
                reaction: aForm.reaction,
                severity: aForm.severity as AllergyRow["severity"],
                note: aForm.note,
            }, path);
            setAllergies((p) => [row, ...p]);
            setAForm({ substance: "", reaction: "", severity: "unknown", note: "" });
            toast.success("Allergy added");
        } catch { toast.error("Something went wrong"); } finally { setSavingA(false); }
    };

    const addImmunization = async () => {
        if (!iForm.vaccine.trim()) return toast.error("Enter a vaccine");
        try {
            setSavingI(true);
            const row = await createImmunization(patientId, {
                vaccine: iForm.vaccine,
                dose: iForm.dose,
                administeredDate: iForm.administeredDate || null,
                route: iForm.route,
                site: iForm.site,
                batchNumber: iForm.batchNumber,
                note: iForm.note,
            }, path);
            setImmunizations((p) => [row, ...p]);
            setIForm({ vaccine: "", dose: "", administeredDate: "", route: "", site: "", batchNumber: "", note: "" });
            toast.success("Immunization recorded");
        } catch { toast.error("Something went wrong"); } finally { setSavingI(false); }
    };

    const removeRow = async (
        id: string,
        fn: (id: string) => Promise<unknown>,
        setter: React.Dispatch<React.SetStateAction<{ _id: string }[]>>,
    ) => {
        try {
            setBusyId(id);
            await fn(id);
            setter((p) => p.filter((r) => r._id !== id));
            toast.success("Moved to trash");
        } catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ───────── ALLERGIES (safety first) ───────── */}
            <section className="space-y-4">
                <SectionHeading icon={AlertTriangle}>Allergies</SectionHeading>
                {canEdit && (
                    <Card>
                        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                            <div className="min-w-[180px] flex-1">
                                <label className="mb-1 block text-xs text-muted-foreground">Substance *</label>
                                <Input value={aForm.substance} onChange={(e) => setAForm((p) => ({ ...p, substance: e.target.value }))} placeholder="e.g. Penicillin" />
                            </div>
                            <div className="min-w-[160px] flex-1">
                                <label className="mb-1 block text-xs text-muted-foreground">Reaction</label>
                                <Input value={aForm.reaction} onChange={(e) => setAForm((p) => ({ ...p, reaction: e.target.value }))} placeholder="e.g. Rash, anaphylaxis" />
                            </div>
                            <div className="w-40">
                                <label className="mb-1 block text-xs text-muted-foreground">Severity</label>
                                <Select value={aForm.severity} onValueChange={(v) => setAForm((p) => ({ ...p, severity: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["mild", "moderate", "severe", "unknown"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={addAllergy} disabled={savingA}>
                                {savingA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {allergies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No structured allergies recorded.</p>
                ) : (
                    <div className="space-y-2">
                        {allergies.map((a) => (
                            <div key={a._id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{a.substance}</span>
                                    <Badge className={SEVERITY_STYLES[a.severity || "unknown"]} variant="secondary">{a.severity || "unknown"}</Badge>
                                    {a.reaction && <span className="text-muted-foreground">· {a.reaction}</span>}
                                    {a.status === "inactive" && <Badge variant="outline">inactive</Badge>}
                                </div>
                                {canEdit && (
                                    <button onClick={() => removeRow(a._id, deleteAllergy, setAllergies as never)} disabled={busyId === a._id} className="text-red-500 hover:text-red-700">
                                        {busyId === a._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ───────── PROBLEM LIST ───────── */}
            <section className="space-y-4">
                <SectionHeading icon={Activity}>Problem List</SectionHeading>
                {canEdit && (
                    <Card>
                        <CardContent className="space-y-3 pt-6">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="min-w-[180px] flex-1">
                                    <label className="mb-1 block text-xs text-muted-foreground">Condition *</label>
                                    <Input value={pForm.condition} onChange={(e) => setPForm((p) => ({ ...p, condition: e.target.value }))} placeholder="e.g. Type 2 Diabetes" />
                                </div>
                                <div className="w-32">
                                    <label className="mb-1 block text-xs text-muted-foreground">ICD-10</label>
                                    <Input value={pForm.icd10Code} onChange={(e) => setPForm((p) => ({ ...p, icd10Code: e.target.value }))} placeholder="E11" />
                                </div>
                                <div className="w-36">
                                    <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                                    <Select value={pForm.status} onValueChange={(v) => setPForm((p) => ({ ...p, status: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-40">
                                    <label className="mb-1 block text-xs text-muted-foreground">Onset</label>
                                    <Input type="date" value={pForm.onsetDate} onChange={(e) => setPForm((p) => ({ ...p, onsetDate: e.target.value }))} />
                                </div>
                                <Button onClick={addProblem} disabled={savingP}>
                                    {savingP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {problems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No structured problems recorded.</p>
                ) : (
                    <div className="space-y-2">
                        {problems.map((p) => (
                            <div key={p._id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{p.condition}</span>
                                    {p.icd10Code && <Badge variant="outline">{p.icd10Code}</Badge>}
                                    <Badge variant={p.status === "resolved" ? "secondary" : "default"} className="capitalize">{p.status || "active"}</Badge>
                                    {p.onsetDate && <span className="text-muted-foreground">· onset {new Date(p.onsetDate).toLocaleDateString()}</span>}
                                </div>
                                {canEdit && (
                                    <button onClick={() => removeRow(p._id, deleteProblem, setProblems as never)} disabled={busyId === p._id} className="text-red-500 hover:text-red-700">
                                        {busyId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ───────── IMMUNIZATIONS ───────── */}
            <section className="space-y-4">
                <SectionHeading icon={Syringe}>Immunizations</SectionHeading>
                {canEdit && (
                    <Card>
                        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                            <div className="min-w-[180px] flex-1">
                                <label className="mb-1 block text-xs text-muted-foreground">Vaccine *</label>
                                <Input value={iForm.vaccine} onChange={(e) => setIForm((p) => ({ ...p, vaccine: e.target.value }))} placeholder="e.g. Tetanus (Td)" />
                            </div>
                            <div className="w-28">
                                <label className="mb-1 block text-xs text-muted-foreground">Dose</label>
                                <Input value={iForm.dose} onChange={(e) => setIForm((p) => ({ ...p, dose: e.target.value }))} placeholder="1st" />
                            </div>
                            <div className="w-40">
                                <label className="mb-1 block text-xs text-muted-foreground">Date given</label>
                                <Input type="date" value={iForm.administeredDate} onChange={(e) => setIForm((p) => ({ ...p, administeredDate: e.target.value }))} />
                            </div>
                            <div className="w-32">
                                <label className="mb-1 block text-xs text-muted-foreground">Batch</label>
                                <Input value={iForm.batchNumber} onChange={(e) => setIForm((p) => ({ ...p, batchNumber: e.target.value }))} />
                            </div>
                            <Button onClick={addImmunization} disabled={savingI}>
                                {savingI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {immunizations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No immunizations recorded.</p>
                ) : (
                    <div className="space-y-2">
                        {immunizations.map((im) => (
                            <div key={im._id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{im.vaccine}</span>
                                    {im.dose && <Badge variant="outline">{im.dose}</Badge>}
                                    {im.administeredDate && <span className="text-muted-foreground">· {new Date(im.administeredDate).toLocaleDateString()}</span>}
                                    {im.batchNumber && <span className="text-muted-foreground">· batch {im.batchNumber}</span>}
                                </div>
                                {canEdit && (
                                    <button onClick={() => removeRow(im._id, deleteImmunization, setImmunizations as never)} disabled={busyId === im._id} className="text-red-500 hover:text-red-700">
                                        {busyId === im._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
