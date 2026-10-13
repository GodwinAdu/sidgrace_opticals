"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2,
    Search,
    User2,
    FlaskConical,
    ScanLine,
    Pill,
    Plus,
    X,
    AlertTriangle,
    ClipboardList,
    Stethoscope,
} from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { placeUnifiedOrder, searchIcd10Codes } from "@/lib/actions/cpoe.actions";
import type { OrderSet, AllergyWarning } from "@/lib/clinical/cpoe";
import type { Icd10Code } from "@/lib/clinical/icd10";

interface PatientLite { _id: string; fullName?: string; patientId?: string }
interface DrugLine {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: string;
}

const emptyDrug = (): DrugLine => ({ drugName: "", dosage: "", frequency: "", duration: "", quantity: "1" });

const severityTone = (s: string) => {
    const k = s.toLowerCase();
    if (k === "severe") return "bg-red-100 text-red-800 border-red-200";
    if (k === "moderate") return "bg-orange-100 text-orange-800 border-orange-200";
    if (k === "mild") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
};

export function CpoeManager({ orderSets }: { orderSets: OrderSet[] }) {
    const router = useRouter();
    const path = usePathname();

    // Patient selection
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [searching, setSearching] = useState(false);

    // Order lines
    const [labTests, setLabTests] = useState<string[]>([]);
    const [radiologyTests, setRadiologyTests] = useState<string[]>([]);
    const [drugs, setDrugs] = useState<DrugLine[]>([]);
    const [labInput, setLabInput] = useState("");
    const [radInput, setRadInput] = useState("");
    const [note, setNote] = useState("");

    // ICD-10 lookup
    const [icdQuery, setIcdQuery] = useState("");
    const [icdResults, setIcdResults] = useState<Icd10Code[]>([]);
    const [icdSelected, setIcdSelected] = useState<Icd10Code | null>(null);
    const [icdSearching, setIcdSearching] = useState(false);

    // Submission + allergy confirm
    const [placing, setPlacing] = useState(false);
    const [warnings, setWarnings] = useState<AllergyWarning[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const searchPatients = async () => {
        try {
            setSearching(true);
            setResults((await fetchPatientBySearch(term)) || []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const runIcdSearch = async (q: string) => {
        setIcdQuery(q);
        try {
            setIcdSearching(true);
            setIcdResults((await searchIcd10Codes(q, 15)) || []);
        } catch {
            setIcdResults([]);
        } finally {
            setIcdSearching(false);
        }
    };

    const addLab = () => {
        if (!labInput.trim()) return;
        setLabTests((p) => [...p, labInput.trim()]);
        setLabInput("");
    };
    const addRad = () => {
        if (!radInput.trim()) return;
        setRadiologyTests((p) => [...p, radInput.trim()]);
        setRadInput("");
    };
    const addDrug = () => setDrugs((p) => [...p, emptyDrug()]);
    const updateDrug = (i: number, field: keyof DrugLine, value: string) =>
        setDrugs((p) => p.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
    const removeDrug = (i: number) => setDrugs((p) => p.filter((_, idx) => idx !== i));

    const applyOrderSet = (id: string) => {
        const set = orderSets.find((s) => s.id === id);
        if (!set) return;
        const labs: string[] = [];
        const rads: string[] = [];
        const meds: DrugLine[] = [];
        for (const item of set.items) {
            if (item.type === "lab") labs.push(item.name);
            else if (item.type === "radiology") rads.push(item.name);
            else meds.push({ drugName: item.name, dosage: item.dosage || "", frequency: item.frequency || "", duration: item.duration || "", quantity: "1" });
        }
        setLabTests((p) => [...p, ...labs]);
        setRadiologyTests((p) => [...p, ...rads]);
        setDrugs((p) => [...p, ...meds]);
        toast.success(`Applied order set: ${set.name}`);
    };

    const buildPayload = (acknowledge: boolean) => ({
        patientId: patient!._id,
        labTests: labTests.map((name) => ({ name })),
        radiologyTests: radiologyTests.map((name) => ({ name })),
        drugs: drugs
            .filter((d) => d.drugName.trim())
            .map((d) => ({
                drugName: d.drugName.trim(),
                dosage: d.dosage,
                frequency: d.frequency,
                duration: d.duration,
                quantity: Number(d.quantity) || 1,
            })),
        note,
        acknowledgeAllergyWarnings: acknowledge,
    });

    const reset = () => {
        setLabTests([]); setRadiologyTests([]); setDrugs([]);
        setLabInput(""); setRadInput(""); setNote("");
        setWarnings([]);
    };

    const place = async (acknowledge = false) => {
        if (!patient) return toast.error("Select a patient");
        const hasOrders = labTests.length || radiologyTests.length || drugs.some((d) => d.drugName.trim());
        if (!hasOrders) return toast.error("Add at least one lab, radiology, or drug order");
        try {
            setPlacing(true);
            const res = await placeUnifiedOrder(buildPayload(acknowledge), path);
            if (res.blocked) {
                setWarnings(res.allergyWarnings || []);
                setConfirmOpen(true);
                return;
            }
            toast.success("Orders placed");
            setConfirmOpen(false);
            reset();
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setPlacing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Patient */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Patient</h3>
                    {!patient ? (
                        <div>
                            <div className="flex gap-2">
                                <Input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPatients()} placeholder="Search patient..." className="max-w-sm" />
                                <Button type="button" onClick={searchPatients} disabled={searching}>
                                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {results.map((p) => (
                                    <button key={p._id} onClick={() => { setPatient(p); setResults([]); }} className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted">
                                        <User2 className="h-4 w-4 text-teal-600" /> {p.fullName}
                                        {p.patientId ? <span className="text-xs text-muted-foreground">· {p.patientId}</span> : null}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 px-3 py-2 text-sm">
                            <User2 className="h-4 w-4 text-teal-600" /> {patient.fullName}
                            <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Order set + diagnosis coding */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="space-y-3 pt-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            <ClipboardList className="h-4 w-4" /> Order Set
                        </h3>
                        <Select onValueChange={applyOrderSet}>
                            <SelectTrigger><SelectValue placeholder="Apply a named bundle…" /></SelectTrigger>
                            <SelectContent>
                                {orderSets.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Selecting a set pre-fills its orders below. You can still edit them.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="space-y-3 pt-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            <Stethoscope className="h-4 w-4" /> ICD-10 Diagnosis (optional)
                        </h3>
                        <Input value={icdQuery} onChange={(e) => runIcdSearch(e.target.value)} placeholder="Search code or description…" />
                        {icdSelected && (
                            <div className="flex items-center gap-2 rounded border bg-teal-50/50 px-2 py-1 text-xs">
                                <Badge variant="outline">{icdSelected.code}</Badge> {icdSelected.description}
                                <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={() => setIcdSelected(null)}>Clear</Button>
                            </div>
                        )}
                        {!icdSelected && (icdSearching ? (
                            <p className="text-xs text-muted-foreground">Searching…</p>
                        ) : (
                            <div className="max-h-40 space-y-1 overflow-auto">
                                {icdResults.map((c) => (
                                    <button key={c.code} onClick={() => { setIcdSelected(c); setIcdResults([]); }} className="flex w-full items-start gap-2 rounded border px-2 py-1 text-left text-xs hover:bg-muted">
                                        <Badge variant="outline">{c.code}</Badge> {c.description}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Labs */}
            <Card>
                <CardContent className="space-y-3 pt-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <FlaskConical className="h-4 w-4" /> Lab Orders
                    </h3>
                    <div className="flex gap-2">
                        <Input value={labInput} onChange={(e) => setLabInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLab())} placeholder="e.g. Full Blood Count" />
                        <Button type="button" variant="secondary" onClick={addLab}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {labTests.map((t, i) => (
                            <Badge key={`${t}-${i}`} variant="secondary" className="gap-1">
                                {t}
                                <button onClick={() => setLabTests((p) => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Radiology */}
            <Card>
                <CardContent className="space-y-3 pt-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <ScanLine className="h-4 w-4" /> Radiology Orders
                    </h3>
                    <div className="flex gap-2">
                        <Input value={radInput} onChange={(e) => setRadInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRad())} placeholder="e.g. Chest X-ray" />
                        <Button type="button" variant="secondary" onClick={addRad}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {radiologyTests.map((t, i) => (
                            <Badge key={`${t}-${i}`} variant="secondary" className="gap-1">
                                {t}
                                <button onClick={() => setRadiologyTests((p) => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Drugs */}
            <Card>
                <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            <Pill className="h-4 w-4" /> Drug Orders
                        </h3>
                        <Button type="button" size="sm" variant="secondary" onClick={addDrug}><Plus className="mr-1 h-4 w-4" /> Add drug</Button>
                    </div>
                    {drugs.length === 0 && <p className="text-sm text-muted-foreground">No drugs added.</p>}
                    {drugs.map((d, i) => (
                        <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-6">
                            <Input className="sm:col-span-2" value={d.drugName} onChange={(e) => updateDrug(i, "drugName", e.target.value)} placeholder="Drug name" />
                            <Input value={d.dosage} onChange={(e) => updateDrug(i, "dosage", e.target.value)} placeholder="Dosage" />
                            <Input value={d.frequency} onChange={(e) => updateDrug(i, "frequency", e.target.value)} placeholder="Frequency" />
                            <Input value={d.duration} onChange={(e) => updateDrug(i, "duration", e.target.value)} placeholder="Duration" />
                            <div className="flex gap-1">
                                <Input type="number" min={1} value={d.quantity} onChange={(e) => updateDrug(i, "quantity", e.target.value)} placeholder="Qty" />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeDrug(i)}><X className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Note + place */}
            <Card>
                <CardContent className="space-y-3 pt-6">
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order note (optional)" />
                    <div className="flex justify-end">
                        <Button onClick={() => place(false)} disabled={placing || !patient}>
                            {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                            Place Orders
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Allergy confirm dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" /> Allergy warning
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                                <p>This patient has recorded allergies that match drugs you are prescribing:</p>
                                <ul className="space-y-1">
                                    {warnings.map((w, i) => (
                                        <li key={i} className="rounded border p-2">
                                            <span className="font-medium">{w.drugName}</span> matches allergy{" "}
                                            <span className="font-medium">{w.substance}</span>{" "}
                                            <span className={`ml-1 rounded border px-1 text-xs ${severityTone(w.severity)}`}>{w.severity}</span>
                                            {w.reaction ? <span className="block text-xs text-muted-foreground">Reaction: {w.reaction}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                                <p>Do you want to place these orders anyway?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={placing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); place(true); }} disabled={placing} className="bg-red-600 hover:bg-red-700">
                            {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Place anyway
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
