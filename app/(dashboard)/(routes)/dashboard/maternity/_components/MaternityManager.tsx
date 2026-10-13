"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2,
    Search,
    User2,
    PlusCircle,
    Trash2,
    Baby,
    HeartPulse,
    Stethoscope,
} from "lucide-react";
import { format } from "date-fns";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import {
    createAncRecord,
    addAncVisit,
    deleteAncRecord,
    recordDelivery,
    deleteDelivery,
} from "@/lib/actions/maternity.actions";
import {
    DELIVERY_MODES,
    DELIVERY_OUTCOMES,
    formatGestationalAge,
} from "@/lib/clinical/maternity";

interface PatientLite { _id: string; fullName?: string; patientId?: string }
interface StaffRow { _id: string; fullName?: string }
interface AncVisitRow {
    _id?: string;
    visitDate?: string;
    gestationalWeeks?: number | null;
    weightKg?: number | null;
    bloodPressure?: string;
    fundalHeightCm?: number | null;
    fetalHeartRate?: number | null;
    notes?: string;
}
interface AncRow {
    _id: string;
    episodeNumber?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string;
    lmp?: string | null;
    edd?: string | null;
    gravida?: number | null;
    para?: number | null;
    bloodGroup?: string;
    riskFactors?: string;
    status?: string;
    visits?: AncVisitRow[];
}
interface BabyRow {
    sex?: string;
    birthWeightGrams?: number | null;
    status?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string | null;
}
interface DeliveryRow {
    _id: string;
    deliveryNumber?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string;
    deliveredAt?: string;
    mode?: string;
    outcome?: string;
    notes?: string;
    babies?: BabyRow[];
}

const pName = (p: AncRow["patientId"]) => (typeof p === "object" && p ? p.fullName || "" : "");

const statusTone = (status?: string) => {
    switch (status) {
        case "delivered": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "closed": return "bg-slate-100 text-slate-600 border-slate-200";
        default: return "bg-pink-100 text-pink-800 border-pink-200";
    }
};

export function MaternityManager({
    ancRecords,
    deliveries,
    staff,
}: {
    ancRecords: AncRow[];
    deliveries: DeliveryRow[];
    staff: StaffRow[];
}) {
    const router = useRouter();
    const path = usePathname();

    // Patient search (shared by ANC + delivery forms)
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [searching, setSearching] = useState(false);

    // ANC episode form
    const [ancPatient, setAncPatient] = useState<PatientLite | null>(null);
    const [lmp, setLmp] = useState("");
    const [gravida, setGravida] = useState("");
    const [para, setPara] = useState("");
    const [bloodGroup, setBloodGroup] = useState("");
    const [riskFactors, setRiskFactors] = useState("");
    const [creatingAnc, setCreatingAnc] = useState(false);

    // Delivery form
    const [delPatient, setDelPatient] = useState<PatientLite | null>(null);
    const [ancRecordId, setAncRecordId] = useState("");
    const [deliveredAt, setDeliveredAt] = useState("");
    const [mode, setMode] = useState("vaginal");
    const [outcome, setOutcome] = useState("live-birth");
    const [attendantId, setAttendantId] = useState("");
    const [delNotes, setDelNotes] = useState("");
    const [babySex, setBabySex] = useState("unknown");
    const [babyWeight, setBabyWeight] = useState("");
    const [registerBaby, setRegisterBaby] = useState(true);
    const [recording, setRecording] = useState(false);

    // Row state
    const [busyId, setBusyId] = useState<string | null>(null);
    const [visitDraft, setVisitDraft] = useState<Record<string, { weeks: string; bp: string; weight: string; notes: string }>>({});
    const [whichSearch, setWhichSearch] = useState<"anc" | "delivery">("anc");

    const search = async (target: "anc" | "delivery") => {
        setWhichSearch(target);
        try {
            setSearching(true);
            setResults((await fetchPatientBySearch(term)) || []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const createEpisode = async () => {
        if (!ancPatient) return toast.error("Select a patient");
        try {
            setCreatingAnc(true);
            await createAncRecord(
                {
                    patientId: ancPatient._id,
                    lmp: lmp || null,
                    gravida: gravida ? Number(gravida) : null,
                    para: para ? Number(para) : null,
                    bloodGroup,
                    riskFactors,
                },
                path,
            );
            toast.success("ANC episode opened");
            setAncPatient(null); setLmp(""); setGravida(""); setPara("");
            setBloodGroup(""); setRiskFactors(""); setResults([]); setTerm("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreatingAnc(false);
        }
    };

    const removeEpisode = async (id: string) => {
        try {
            setBusyId(id);
            await deleteAncRecord(id);
            toast.success("ANC episode removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const saveVisit = async (id: string) => {
        const d = visitDraft[id];
        if (!d || (!d.weeks && !d.bp && !d.weight && !d.notes)) return toast.error("Enter at least one observation");
        try {
            setBusyId(id);
            await addAncVisit(
                id,
                {
                    gestationalWeeks: d.weeks ? Number(d.weeks) : null,
                    bloodPressure: d.bp,
                    weightKg: d.weight ? Number(d.weight) : null,
                    notes: d.notes,
                },
                path,
            );
            toast.success("Visit recorded");
            setVisitDraft((p) => ({ ...p, [id]: { weeks: "", bp: "", weight: "", notes: "" } }));
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const submitDelivery = async () => {
        if (!delPatient) return toast.error("Select the mother");
        try {
            setRecording(true);
            const liveBirth = outcome === "live-birth";
            await recordDelivery(
                {
                    patientId: delPatient._id,
                    ancRecordId: ancRecordId || null,
                    deliveredAt: deliveredAt || undefined,
                    mode: mode as never,
                    outcome: outcome as never,
                    attendants: attendantId ? [attendantId] : [],
                    notes: delNotes,
                    babies: liveBirth || babyWeight || babySex !== "unknown"
                        ? [
                            {
                                sex: babySex as never,
                                birthWeightGrams: babyWeight ? Number(babyWeight) : null,
                                status: liveBirth ? "alive" : "stillbirth",
                                registerAsPatient: registerBaby && liveBirth,
                            },
                        ]
                        : [],
                },
                path,
            );
            toast.success("Delivery recorded");
            setDelPatient(null); setAncRecordId(""); setDeliveredAt("");
            setMode("vaginal"); setOutcome("live-birth"); setAttendantId("");
            setDelNotes(""); setBabySex("unknown"); setBabyWeight(""); setRegisterBaby(true);
            setResults([]); setTerm("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setRecording(false);
        }
    };

    const removeDelivery = async (id: string) => {
        try {
            setBusyId(id);
            await deleteDelivery(id);
            toast.success("Delivery removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const PatientPicker = ({ onPick, target }: { onPick: (p: PatientLite) => void; target: "anc" | "delivery" }) => (
        <div>
            <div className="flex gap-2">
                <Input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search(target)}
                    placeholder="Search patient..."
                    className="max-w-sm"
                />
                <Button type="button" onClick={() => search(target)} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
            </div>
            {whichSearch === target && (
                <div className="mt-2 space-y-1">
                    {results.map((p) => (
                        <button
                            key={p._id}
                            onClick={() => { onPick(p); setResults([]); }}
                            className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                            <User2 className="h-4 w-4 text-pink-600" /> {p.fullName}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Open ANC episode */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Open ANC Episode</h3>
                    {!ancPatient ? (
                        <PatientPicker target="anc" onPick={setAncPatient} />
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-lg border bg-pink-50/50 px-3 py-2 text-sm">
                                <User2 className="h-4 w-4 text-pink-600" /> {ancPatient.fullName}
                                <Button size="sm" variant="ghost" onClick={() => setAncPatient(null)}>Change</Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">LMP (last menstrual period)</label>
                                    <Input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Gravida</label>
                                    <Input type="number" min={0} value={gravida} onChange={(e) => setGravida(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Para</label>
                                    <Input type="number" min={0} value={para} onChange={(e) => setPara(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Blood group</label>
                                    <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="e.g. O+" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs text-muted-foreground">Risk factors (optional)</label>
                                    <Input value={riskFactors} onChange={(e) => setRiskFactors(e.target.value)} placeholder="e.g. hypertension, previous C-section" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={createEpisode} disabled={creatingAnc}>
                                    {creatingAnc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Open Episode
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active ANC episodes */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Antenatal Episodes</h3>
                {(!ancRecords || ancRecords.length === 0) && <p className="text-sm text-muted-foreground">No active ANC episodes.</p>}
                {ancRecords.map((r) => {
                    const ga = formatGestationalAge(r.lmp || undefined);
                    const draft = visitDraft[r._id] || { weeks: "", bp: "", weight: "", notes: "" };
                    return (
                        <Card key={r._id}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            {pName(r.patientId)}
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">{r.episodeNumber}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {ga ? `GA ${ga}` : "GA —"}
                                            {r.edd ? ` · EDD ${format(new Date(r.edd), "PP")}` : ""}
                                            {r.gravida != null ? ` · G${r.gravida}` : ""}
                                            {r.para != null ? `P${r.para}` : ""}
                                            {r.bloodGroup ? ` · ${r.bloodGroup}` : ""}
                                        </p>
                                        {r.riskFactors ? <p className="mt-1 text-xs text-amber-700">⚠ {r.riskFactors}</p> : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                                        <button onClick={() => removeEpisode(r._id)} disabled={busyId === r._id} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Visits timeline */}
                                {r.visits && r.visits.length > 0 && (
                                    <div className="mt-3 space-y-1 border-t pt-3">
                                        {r.visits.map((v, i) => (
                                            <p key={v._id || i} className="text-xs text-muted-foreground">
                                                <HeartPulse className="mr-1 inline h-3 w-3 text-pink-600" />
                                                {v.visitDate ? format(new Date(v.visitDate), "PP") : ""}
                                                {v.gestationalWeeks != null ? ` · ${v.gestationalWeeks}w` : ""}
                                                {v.bloodPressure ? ` · BP ${v.bloodPressure}` : ""}
                                                {v.weightKg != null ? ` · ${v.weightKg}kg` : ""}
                                                {v.notes ? ` · ${v.notes}` : ""}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {/* Add visit */}
                                <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-5">
                                    <Input placeholder="Weeks" type="number" value={draft.weeks} onChange={(e) => setVisitDraft((p) => ({ ...p, [r._id]: { ...draft, weeks: e.target.value } }))} />
                                    <Input placeholder="BP 120/80" value={draft.bp} onChange={(e) => setVisitDraft((p) => ({ ...p, [r._id]: { ...draft, bp: e.target.value } }))} />
                                    <Input placeholder="Weight kg" type="number" value={draft.weight} onChange={(e) => setVisitDraft((p) => ({ ...p, [r._id]: { ...draft, weight: e.target.value } }))} />
                                    <Input placeholder="Notes" value={draft.notes} onChange={(e) => setVisitDraft((p) => ({ ...p, [r._id]: { ...draft, notes: e.target.value } }))} className="sm:col-span-1" />
                                    <Button size="sm" variant="outline" onClick={() => saveVisit(r._id)} disabled={busyId === r._id}>
                                        {busyId === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add visit"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Record delivery */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Record Delivery</h3>
                    {!delPatient ? (
                        <PatientPicker target="delivery" onPick={setDelPatient} />
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-lg border bg-pink-50/50 px-3 py-2 text-sm">
                                <User2 className="h-4 w-4 text-pink-600" /> {delPatient.fullName} <span className="text-xs text-muted-foreground">(mother)</span>
                                <Button size="sm" variant="ghost" onClick={() => setDelPatient(null)}>Change</Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Linked ANC episode (optional)</label>
                                    <Select value={ancRecordId} onValueChange={setAncRecordId}>
                                        <SelectTrigger><SelectValue placeholder="Select episode" /></SelectTrigger>
                                        <SelectContent>
                                            {ancRecords
                                                .filter((r) => pName(r.patientId) === delPatient.fullName)
                                                .map((r) => <SelectItem key={r._id} value={r._id}>{r.episodeNumber}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Delivered at</label>
                                    <Input type="datetime-local" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Attendant</label>
                                    <Select value={attendantId} onValueChange={setAttendantId}>
                                        <SelectTrigger><SelectValue placeholder="Select attendant" /></SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s) => <SelectItem key={s._id} value={s._id}>{s.fullName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Mode</label>
                                    <Select value={mode} onValueChange={setMode}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {DELIVERY_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Outcome</label>
                                    <Select value={outcome} onValueChange={setOutcome}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {DELIVERY_OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Newborn */}
                            <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Baby className="h-4 w-4 text-pink-600" /> Newborn</p>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Sex</label>
                                        <Select value={babySex} onValueChange={setBabySex}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="unknown">Unknown</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-muted-foreground">Birth weight (g)</label>
                                        <Input type="number" min={0} value={babyWeight} onChange={(e) => setBabyWeight(e.target.value)} placeholder="e.g. 3200" />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Checkbox id="registerBaby" checked={registerBaby} onCheckedChange={(v) => setRegisterBaby(Boolean(v))} />
                                        <label htmlFor="registerBaby" className="pb-2 text-xs text-muted-foreground">Register newborn as a patient</label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Notes (optional)</label>
                                <Textarea rows={2} value={delNotes} onChange={(e) => setDelNotes(e.target.value)} placeholder="Delivery notes, complications…" />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={submitDelivery} disabled={recording}>
                                    {recording ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
                                    Record Delivery
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent deliveries */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Deliveries</h3>
                {(!deliveries || deliveries.length === 0) && <p className="text-sm text-muted-foreground">No deliveries recorded.</p>}
                {deliveries.map((d) => (
                    <Card key={d._id}>
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold">
                                        {pName(d.patientId)}
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">{d.deliveryNumber}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {d.mode ? d.mode : ""}
                                        {d.outcome ? ` · ${d.outcome}` : ""}
                                        {d.deliveredAt ? ` · ${format(new Date(d.deliveredAt), "PP p")}` : ""}
                                        {d.babies?.length ? ` · ${d.babies.length} baby/babies` : ""}
                                    </p>
                                    {d.babies && d.babies.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {d.babies.map((b, i) => (
                                                <Badge key={i} variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                                                    <Baby className="mr-1 h-3 w-3" />
                                                    {b.sex || "baby"}{b.birthWeightGrams ? ` · ${b.birthWeightGrams}g` : ""}
                                                    {typeof b.patientId === "object" && b.patientId ? " · patient" : ""}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeDelivery(d._id)} disabled={busyId === d._id} className="text-muted-foreground hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
