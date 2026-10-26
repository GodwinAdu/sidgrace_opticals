"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    Droplet,
    FlaskConical,
    ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import {
    registerBloodUnit,
    issueBloodUnit,
    discardBloodUnit,
    deleteBloodUnit,
    createSpecimen,
    updateSpecimenStatus,
    deleteSpecimen,
} from "@/lib/actions/blood-bank.actions";
import {
    BLOOD_GROUPS,
    BLOOD_COMPONENTS,
    SPECIMEN_STATUSES,
    effectiveStatus,
    type BloodUnitStatus,
    type SpecimenStatus,
} from "@/lib/clinical/blood-bank";

interface PatientLite { _id: string; fullName?: string; patientId?: string; bloodGroup?: string }
interface UnitRow {
    _id: string;
    unitNumber?: string;
    bloodGroup?: string;
    component?: string;
    volumeMl?: number | null;
    expiry?: string;
    status?: BloodUnitStatus;
    source?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string | null;
    crossmatchResult?: string;
}
interface OrderRow {
    _id: string;
    orderNumber?: string;
    category?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string;
}
interface SpecimenEventRow { status?: string; at?: string; note?: string }
interface SpecimenRow {
    _id: string;
    specimenNumber?: string;
    specimenType?: string;
    container?: string;
    status?: SpecimenStatus;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string;
    labOrderId?: { _id?: string; orderNumber?: string; category?: string } | string;
    events?: SpecimenEventRow[];
}

const pName = (p: UnitRow["patientId"] | OrderRow["patientId"]) =>
    typeof p === "object" && p ? p.fullName || "" : "";
const oNumber = (o: SpecimenRow["labOrderId"]) =>
    typeof o === "object" && o ? o.orderNumber || "" : "";

const unitTone = (status?: string) => {
    switch (status) {
        case "issued": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "reserved": return "bg-amber-100 text-amber-800 border-amber-200";
        case "discarded": return "bg-slate-100 text-slate-600 border-slate-200";
        case "expired": return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-rose-100 text-rose-800 border-rose-200";
    }
};
const specimenTone = (status?: string) => {
    switch (status) {
        case "processed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "received": return "bg-sky-100 text-sky-800 border-sky-200";
        case "in-transit": return "bg-amber-100 text-amber-800 border-amber-200";
        case "rejected": return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
};

// The next lifecycle status a specimen may advance to (first non-terminal).
const nextSpecimenStatus = (status?: string): SpecimenStatus | null => {
    const order: SpecimenStatus[] = ["collected", "in-transit", "received", "processed"];
    const i = order.indexOf((status as SpecimenStatus) ?? "collected");
    if (i < 0 || i >= order.length - 1) return null;
    return order[i + 1];
};

export function BloodBankManager({
    units,
    specimens,
    labOrders,
}: {
    units: UnitRow[];
    specimens: SpecimenRow[];
    labOrders: OrderRow[];
}) {
    const router = useRouter();
    const path = usePathname();

    // Register blood unit form
    const [bloodGroup, setBloodGroup] = useState("O+");
    const [component, setComponent] = useState("whole-blood");
    const [volumeMl, setVolumeMl] = useState("");
    const [expiry, setExpiry] = useState("");
    const [source, setSource] = useState("");
    const [registering, setRegistering] = useState(false);

    // Issue dialog state
    const [issueUnit, setIssueUnit] = useState<UnitRow | null>(null);
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [searching, setSearching] = useState(false);
    const [issuePatient, setIssuePatient] = useState<PatientLite | null>(null);
    const [recipientGroup, setRecipientGroup] = useState("");
    const [issuing, setIssuing] = useState(false);

    // Specimen form
    const [labOrderId, setLabOrderId] = useState("");
    const [specimenType, setSpecimenType] = useState("");
    const [container, setContainer] = useState("");
    const [creatingSpecimen, setCreatingSpecimen] = useState(false);

    const [busyId, setBusyId] = useState<string | null>(null);

    const availableCount = useMemo(
        () => units.filter((u) => effectiveStatus((u.status as BloodUnitStatus) ?? "available", u.expiry) === "available").length,
        [units],
    );

    const search = async () => {
        try {
            setSearching(true);
            setResults((await fetchPatientBySearch(term)) || []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    const doRegister = async () => {
        if (!expiry) return toast.error("Expiry date is required");
        try {
            setRegistering(true);
            await registerBloodUnit(
                {
                    bloodGroup,
                    component: component as never,
                    volumeMl: volumeMl ? Number(volumeMl) : null,
                    expiry,
                    source,
                },
                path,
            );
            toast.success("Blood unit registered");
            setBloodGroup("O+"); setComponent("whole-blood"); setVolumeMl(""); setExpiry(""); setSource("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setRegistering(false);
        }
    };

    const openIssue = (unit: UnitRow) => {
        setIssueUnit(unit);
        setIssuePatient(null); setRecipientGroup(""); setResults([]); setTerm("");
    };

    const doIssue = async (target: "reserved" | "issued") => {
        if (!issueUnit || !issuePatient) return toast.error("Select a recipient patient");
        try {
            setIssuing(true);
            await issueBloodUnit(
                issueUnit._id,
                { patientId: issuePatient._id, recipientGroup: recipientGroup || issuePatient.bloodGroup || "", target },
                path,
            );
            toast.success(`Unit ${target}`);
            setIssueUnit(null); setIssuePatient(null); setRecipientGroup("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setIssuing(false);
        }
    };

    const doDiscard = async (id: string) => {
        const reason = window.prompt("Reason for discarding this unit?") || "";
        try {
            setBusyId(id);
            await discardBloodUnit(id, reason, path);
            toast.success("Unit discarded");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const removeUnit = async (id: string) => {
        try {
            setBusyId(id);
            await deleteBloodUnit(id);
            toast.success("Unit removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doCreateSpecimen = async () => {
        if (!labOrderId) return toast.error("Select a lab order");
        try {
            setCreatingSpecimen(true);
            await createSpecimen({ labOrderId, specimenType, container }, path);
            toast.success("Specimen collected");
            setLabOrderId(""); setSpecimenType(""); setContainer("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreatingSpecimen(false);
        }
    };

    const advanceSpecimen = async (s: SpecimenRow, to?: SpecimenStatus) => {
        const next = to ?? nextSpecimenStatus(s.status);
        if (!next) return;
        try {
            setBusyId(s._id);
            await updateSpecimenStatus(s._id, next, "", path);
            toast.success(`Specimen ${next}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const removeSpecimen = async (id: string) => {
        try {
            setBusyId(id);
            await deleteSpecimen(id);
            toast.success("Specimen removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Register blood unit */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Register Blood Unit</h3>
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            <Droplet className="mr-1 h-3 w-3" /> {availableCount} available
                        </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Blood group</label>
                            <Select value={bloodGroup} onValueChange={setBloodGroup}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Component</label>
                            <Select value={component} onValueChange={setComponent}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {BLOOD_COMPONENTS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Volume (ml)</label>
                            <Input type="number" min={0} value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} placeholder="e.g. 450" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Expiry</label>
                            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Source (optional)</label>
                            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Donor / supplier ref" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={doRegister} disabled={registering}>
                            {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Register Unit
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Issue panel */}
            {issueUnit && (
                <Card className="border-rose-200">
                    <CardContent className="space-y-3 pt-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">
                                Crossmatch / issue {issueUnit.unitNumber}{" "}
                                <Badge variant="outline" className={unitTone(issueUnit.status)}>{issueUnit.bloodGroup}</Badge>
                            </h3>
                            <Button size="sm" variant="ghost" onClick={() => setIssueUnit(null)}>Cancel</Button>
                        </div>
                        {!issuePatient ? (
                            <div>
                                <div className="flex gap-2">
                                    <Input
                                        value={term}
                                        onChange={(e) => setTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && search()}
                                        placeholder="Search recipient patient..."
                                        className="max-w-sm"
                                    />
                                    <Button type="button" onClick={search} disabled={searching}>
                                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    {results.map((p) => (
                                        <button
                                            key={p._id}
                                            onClick={() => { setIssuePatient(p); setRecipientGroup(p.bloodGroup || ""); setResults([]); }}
                                            className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted"
                                        >
                                            <User2 className="h-4 w-4 text-rose-600" /> {p.fullName}
                                            {p.bloodGroup ? <span className="text-xs text-muted-foreground">({p.bloodGroup})</span> : null}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded-lg border bg-rose-50/50 px-3 py-2 text-sm">
                                    <User2 className="h-4 w-4 text-rose-600" /> {issuePatient.fullName}
                                    <Button size="sm" variant="ghost" onClick={() => setIssuePatient(null)}>Change</Button>
                                </div>
                                <div className="max-w-xs">
                                    <label className="mb-1 block text-xs text-muted-foreground">Recipient blood group (for crossmatch)</label>
                                    <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                                        <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                                        <SelectContent>
                                            {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => doIssue("reserved")} disabled={issuing}>
                                        {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Reserve
                                    </Button>
                                    <Button onClick={() => doIssue("issued")} disabled={issuing}>
                                        {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Issue
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Blood inventory */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Blood Inventory</h3>
                {(!units || units.length === 0) && <p className="text-sm text-muted-foreground">No blood units registered.</p>}
                {units.map((u) => {
                    const eff = effectiveStatus((u.status as BloodUnitStatus) ?? "available", u.expiry);
                    const canIssue = eff === "available";
                    const canDiscard = u.status !== "discarded";
                    return (
                        <Card key={u._id}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            <Droplet className="mr-1 inline h-4 w-4 text-rose-600" />
                                            {u.bloodGroup} · {u.component}
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">{u.unitNumber}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {u.volumeMl ? `${u.volumeMl}ml · ` : ""}
                                            {u.expiry ? `expires ${format(new Date(u.expiry), "PP")}` : ""}
                                            {u.source ? ` · ${u.source}` : ""}
                                            {pName(u.patientId) ? ` · → ${pName(u.patientId)}` : ""}
                                            {u.crossmatchResult ? ` · ${u.crossmatchResult}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={unitTone(eff)}>{eff}</Badge>
                                        {canIssue && (
                                            <Button size="sm" variant="outline" onClick={() => openIssue(u)}>Crossmatch</Button>
                                        )}
                                        {canDiscard && (
                                            <Button size="sm" variant="ghost" onClick={() => doDiscard(u._id)} disabled={busyId === u._id}>Discard</Button>
                                        )}
                                        <button onClick={() => removeUnit(u._id)} disabled={busyId === u._id} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Collect specimen */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Collect Specimen</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Lab order</label>
                            <Select value={labOrderId} onValueChange={setLabOrderId}>
                                <SelectTrigger><SelectValue placeholder="Select lab order" /></SelectTrigger>
                                <SelectContent>
                                    {labOrders.map((o) => (
                                        <SelectItem key={o._id} value={o._id}>
                                            {o.orderNumber} — {pName(o.patientId) || "patient"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Specimen type</label>
                            <Input value={specimenType} onChange={(e) => setSpecimenType(e.target.value)} placeholder="e.g. blood, urine" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Container</label>
                            <Input value={container} onChange={(e) => setContainer(e.target.value)} placeholder="e.g. EDTA tube" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={doCreateSpecimen} disabled={creatingSpecimen}>
                            {creatingSpecimen ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                            Collect Specimen
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Specimen lifecycle */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Specimens</h3>
                {(!specimens || specimens.length === 0) && <p className="text-sm text-muted-foreground">No specimens tracked.</p>}
                {specimens.map((s) => {
                    const next = nextSpecimenStatus(s.status);
                    const terminal = s.status === "processed" || s.status === "rejected";
                    return (
                        <Card key={s._id}>
                            <CardContent className="pt-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            <FlaskConical className="mr-1 inline h-4 w-4 text-sky-600" />
                                            {pName(s.patientId) || "Patient"}
                                            <span className="ml-2 text-xs font-normal text-muted-foreground">{s.specimenNumber}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {oNumber(s.labOrderId) ? `order ${oNumber(s.labOrderId)}` : ""}
                                            {s.specimenType ? ` · ${s.specimenType}` : ""}
                                            {s.container ? ` · ${s.container}` : ""}
                                        </p>
                                        {s.events && s.events.length > 0 && (
                                            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                                {s.events.map((e, i) => (
                                                    <span key={i} className="inline-flex items-center">
                                                        {i > 0 && <ArrowRight className="mx-1 h-3 w-3" />}
                                                        {e.status}
                                                        {e.at ? ` (${format(new Date(e.at), "p")})` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={specimenTone(s.status)}>{s.status}</Badge>
                                        {next && (
                                            <Button size="sm" variant="outline" onClick={() => advanceSpecimen(s, next)} disabled={busyId === s._id}>
                                                {busyId === s._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Mark {next}</>}
                                            </Button>
                                        )}
                                        {!terminal && (
                                            <Button size="sm" variant="ghost" onClick={() => advanceSpecimen(s, "rejected")} disabled={busyId === s._id}>Reject</Button>
                                        )}
                                        <button onClick={() => removeSpecimen(s._id)} disabled={busyId === s._id} className="text-muted-foreground hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
