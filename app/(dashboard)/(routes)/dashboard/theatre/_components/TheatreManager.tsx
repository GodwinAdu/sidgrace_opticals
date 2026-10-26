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
    Stethoscope,
    PlusCircle,
    Trash2,
    CalendarClock,
    DoorOpen,
} from "lucide-react";
import { format } from "date-fns";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import {
    createTheatre,
    deleteTheatre,
    bookSurgery,
    setSurgeryStatus,
    recordSurgeryNote,
} from "@/lib/actions/theatre.actions";
import { SURGERY_STATUSES } from "@/lib/clinical/theatre";

interface PatientLite { _id: string; fullName?: string; patientId?: string }
interface TheatreRow { _id: string; name?: string; location?: string }
interface ProcedureRow { _id: string; name?: string; code?: string; price?: number }
interface StaffRow { _id: string; fullName?: string }
interface CaseRow {
    _id: string;
    caseNumber?: string;
    patientId?: { _id?: string; fullName?: string; patientId?: string } | string;
    procedureName?: string;
    surgeons?: ({ _id?: string; fullName?: string } | string)[];
    theatreId?: { _id?: string; name?: string; location?: string } | string;
    scheduledAt?: string;
    durationMinutes?: number;
    status?: string;
    preOpNote?: string;
    postOpNote?: string;
    cost?: number;
    billed?: boolean;
    completedAt?: string;
}

const statusTone = (status?: string) => {
    switch (status) {
        case "in-progress": return "bg-amber-100 text-amber-800 border-amber-200";
        case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "cancelled": return "bg-slate-100 text-slate-600 border-slate-200";
        default: return "bg-sky-100 text-sky-800 border-sky-200";
    }
};

const name = (p: CaseRow["patientId"]) => (typeof p === "object" && p ? p.fullName || "" : "");
const theatreName = (t: CaseRow["theatreId"]) => (typeof t === "object" && t ? t.name || "" : "");
const surgeonNames = (s: CaseRow["surgeons"]) =>
    (s || [])
        .map((x) => (typeof x === "object" && x ? x.fullName : ""))
        .filter(Boolean)
        .join(", ");

export function TheatreManager({
    theatres,
    schedule,
    past = [],
    procedures,
    staff,
}: {
    theatres: TheatreRow[];
    schedule: CaseRow[];
    past?: CaseRow[];
    procedures: ProcedureRow[];
    staff: StaffRow[];
}) {
    const router = useRouter();
    const path = usePathname();

    // Theatre (room) management
    const [theatreName_, setTheatreName_] = useState("");
    const [theatreLoc, setTheatreLoc] = useState("");
    const [addingTheatre, setAddingTheatre] = useState(false);

    // Booking flow
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [patient, setPatient] = useState<PatientLite | null>(null);
    const [procedureId, setProcedureId] = useState("");
    const [theatreId, setTheatreId] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [cost, setCost] = useState("");
    const [surgeonId, setSurgeonId] = useState("");
    const [preOpNote, setPreOpNote] = useState("");
    const [searching, setSearching] = useState(false);
    const [booking, setBooking] = useState(false);

    // Row action state
    const [busyId, setBusyId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

    const selectedProcedure = useMemo(
        () => procedures.find((p) => p._id === procedureId),
        [procedures, procedureId],
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

    const addTheatre = async () => {
        if (!theatreName_.trim()) return toast.error("Enter a theatre name");
        try {
            setAddingTheatre(true);
            await createTheatre({ name: theatreName_, location: theatreLoc }, path);
            toast.success("Theatre added");
            setTheatreName_(""); setTheatreLoc("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setAddingTheatre(false);
        }
    };

    const removeTheatre = async (id: string) => {
        try {
            setBusyId(id);
            await deleteTheatre(id);
            toast.success("Theatre removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const onPickProcedure = (id: string) => {
        setProcedureId(id);
        const proc = procedures.find((p) => p._id === id);
        if (proc && (!cost || Number(cost) === 0)) setCost(String(proc.price ?? ""));
    };

    const book = async () => {
        if (!patient) return toast.error("Select a patient");
        if (!theatreId) return toast.error("Select a theatre");
        if (!scheduledAt) return toast.error("Pick a date/time");
        try {
            setBooking(true);
            await bookSurgery(
                {
                    patientId: patient._id,
                    procedureId: procedureId || null,
                    procedureName: selectedProcedure?.name || "",
                    surgeons: surgeonId ? [surgeonId] : [],
                    theatreId,
                    scheduledAt,
                    durationMinutes: Number(durationMinutes) || 60,
                    cost: Number(cost) || 0,
                    preOpNote,
                },
                path,
            );
            toast.success("Surgery booked");
            setPatient(null); setResults([]); setTerm("");
            setProcedureId(""); setTheatreId(""); setScheduledAt("");
            setDurationMinutes("60"); setCost(""); setSurgeonId(""); setPreOpNote("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBooking(false);
        }
    };

    const changeStatus = async (id: string, status: "scheduled" | "in-progress" | "completed" | "cancelled") => {
        try {
            setBusyId(id);
            await setSurgeryStatus(id, status, path);
            toast.success(status === "completed" ? "Case completed and billed" : "Status updated");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const saveNote = async (id: string, kind: "preOp" | "postOp") => {
        const value = noteDraft[`${id}:${kind}`];
        if (!value?.trim()) return toast.error("Enter a note");
        try {
            setBusyId(id);
            await recordSurgeryNote(id, kind, value.trim(), path);
            toast.success(kind === "preOp" ? "Pre-op note saved" : "Post-op note saved");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    // Group the schedule by theatre for the per-theatre board.
    const byTheatre = useMemo(() => {
        const groups: Record<string, CaseRow[]> = {};
        for (const c of schedule || []) {
            const key = theatreName(c.theatreId) || "Unassigned";
            (groups[key] ||= []).push(c);
        }
        return groups;
    }, [schedule]);

    return (
        <div className="space-y-6">
            {/* Theatres (rooms) */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Operating Theatres</h3>
                    <div className="flex flex-wrap items-end gap-2">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Theatre name</label>
                            <Input value={theatreName_} onChange={(e) => setTheatreName_(e.target.value)} placeholder="e.g. OR 1" className="w-44" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Location (optional)</label>
                            <Input value={theatreLoc} onChange={(e) => setTheatreLoc(e.target.value)} placeholder="e.g. 2nd floor" className="w-44" />
                        </div>
                        <Button type="button" variant="secondary" onClick={addTheatre} disabled={addingTheatre}>
                            {addingTheatre ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-1 h-4 w-4" />}
                            Add
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(!theatres || theatres.length === 0) && <p className="text-sm text-muted-foreground">No theatres yet. Add one to start scheduling.</p>}
                        {theatres?.map((t) => (
                            <span key={t._id} className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-sm">
                                <DoorOpen className="h-4 w-4 text-teal-600" /> {t.name}
                                {t.location ? <span className="text-xs text-muted-foreground">· {t.location}</span> : null}
                                <button onClick={() => removeTheatre(t._id)} disabled={busyId === t._id} className="text-muted-foreground hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Book surgery */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Book Surgery</h3>

                    {!patient ? (
                        <div>
                            <div className="flex gap-2">
                                <Input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search patient..." className="max-w-sm" />
                                <Button type="button" onClick={search} disabled={searching}>
                                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="mt-2 space-y-1">
                                {results.map((p) => (
                                    <button key={p._id} onClick={() => { setPatient(p); setResults([]); }} className="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm hover:bg-muted">
                                        <User2 className="h-4 w-4 text-teal-600" /> {p.fullName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 px-3 py-2 text-sm">
                                <User2 className="h-4 w-4 text-teal-600" /> {patient.fullName}
                                <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Procedure</label>
                                    <Select value={procedureId} onValueChange={onPickProcedure}>
                                        <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                                        <SelectContent>
                                            {procedures.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Theatre</label>
                                    <Select value={theatreId} onValueChange={setTheatreId}>
                                        <SelectTrigger><SelectValue placeholder="Select theatre" /></SelectTrigger>
                                        <SelectContent>
                                            {theatres.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Surgeon</label>
                                    <Select value={surgeonId} onValueChange={setSurgeonId}>
                                        <SelectTrigger><SelectValue placeholder="Select surgeon" /></SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s) => <SelectItem key={s._id} value={s._id}>{s.fullName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Scheduled date/time</label>
                                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Duration (minutes)</label>
                                    <Input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Cost</label>
                                    <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <label className="mb-1 block text-xs text-muted-foreground">Pre-op note (optional)</label>
                                    <Textarea rows={2} value={preOpNote} onChange={(e) => setPreOpNote(e.target.value)} placeholder="Pre-operative assessment, consent, fasting status…" />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={book} disabled={booking}>
                                    {booking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                                    Book Surgery
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* OR Schedule (per theatre) */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">OR Schedule</h3>
                {(!schedule || schedule.length === 0) && <p className="text-sm text-muted-foreground">No upcoming surgery cases.</p>}
                {Object.entries(byTheatre).map(([theatre, cases]) => (
                    <div key={theatre} className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-semibold"><DoorOpen className="h-4 w-4 text-teal-600" /> {theatre}</p>
                        {cases.map((c) => (
                            <Card key={c._id}>
                                <CardContent className="pt-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">
                                                {name(c.patientId)}
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">{c.caseNumber}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {c.procedureName || "Procedure"}
                                                {c.scheduledAt ? ` · ${format(new Date(c.scheduledAt), "PP p")}` : ""}
                                                {c.durationMinutes ? ` · ${c.durationMinutes} min` : ""}
                                                {surgeonNames(c.surgeons) ? ` · ${surgeonNames(c.surgeons)}` : ""}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className={statusTone(c.status)}>{c.status}</Badge>
                                    </div>

                                    {/* Status actions */}
                                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                                        {c.status === "scheduled" && (
                                            <Button size="sm" variant="secondary" onClick={() => changeStatus(c._id, "in-progress")} disabled={busyId === c._id}>
                                                <Stethoscope className="mr-1 h-4 w-4" /> Start
                                            </Button>
                                        )}
                                        {(c.status === "scheduled" || c.status === "in-progress") && (
                                            <>
                                                <Button size="sm" onClick={() => changeStatus(c._id, "completed")} disabled={busyId === c._id}>
                                                    {busyId === c._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                                    Complete &amp; Bill
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => changeStatus(c._id, "cancelled")} disabled={busyId === c._id}>
                                                    Cancel
                                                </Button>
                                            </>
                                        )}
                                        {c.cost ? <span className="ml-auto text-xs text-muted-foreground">Cost: {c.cost}</span> : null}
                                    </div>

                                    {/* Pre/post-op notes */}
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs text-muted-foreground">Pre-op note</label>
                                            <Textarea
                                                rows={2}
                                                defaultValue={c.preOpNote || ""}
                                                onChange={(e) => setNoteDraft((p) => ({ ...p, [`${c._id}:preOp`]: e.target.value }))}
                                                placeholder="Pre-operative note"
                                            />
                                            <Button size="sm" variant="outline" className="mt-1" onClick={() => saveNote(c._id, "preOp")} disabled={busyId === c._id}>
                                                Save pre-op
                                            </Button>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs text-muted-foreground">Post-op note</label>
                                            <Textarea
                                                rows={2}
                                                defaultValue={c.postOpNote || ""}
                                                onChange={(e) => setNoteDraft((p) => ({ ...p, [`${c._id}:postOp`]: e.target.value }))}
                                                placeholder="Post-operative note"
                                            />
                                            <Button size="sm" variant="outline" className="mt-1" onClick={() => saveNote(c._id, "postOp")} disabled={busyId === c._id}>
                                                Save post-op
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ))}
            </div>

            {/* Past cases */}
            {past.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Cases</h3>
                    {past.map((c) => (
                        <Card key={c._id}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                                <div>
                                    <p className="font-semibold">
                                        {name(c.patientId)}
                                        <span className="ml-2 text-xs font-normal text-muted-foreground">{c.caseNumber}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {c.procedureName || "Procedure"} · {theatreName(c.theatreId)}
                                        {c.completedAt ? ` · ${format(new Date(c.completedAt), "PP p")}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {c.billed ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Billed</Badge> : null}
                                    <Badge variant="outline" className={statusTone(c.status)}>{c.status}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
