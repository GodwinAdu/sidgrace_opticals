"use client";

/**
 * Clinical tab panels for the attendance/consulting page.
 *
 * Per-visit records (dental notes, perio exam, imaging) are written directly
 * onto the Attendance document via the visit-clinical actions AND mirrored to
 * the standalone collections, so each visit is a self-contained snapshot while
 * the clinical hub / timeline / reports keep working.
 *
 * Cross-visit living records (odontogram, treatment plans, lab cases) are
 * rendered via self-fetching wrappers around the real, shared components.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Loader2, Plus, FileText, Activity, ImageIcon, Wallet, CheckCircle2, Save, X, ReceiptText, ArrowUpRight } from "lucide-react";

import { Odontogram } from "../../clinical/_components/Odontogram";
import { TreatmentPlanBuilder } from "../../treatment-plans/_components/TreatmentPlanBuilder";
import { ExistingPlans } from "../../treatment-plans/_components/ExistingPlans";
import { LabCaseManager } from "../../lab-cases/_components/LabCaseManager";

import { getPlansByPatient } from "@/lib/actions/treatment-plan.actions";
import { getAllProcedures } from "@/lib/actions/procedure.actions";
import { fetchAllProducts } from "@/lib/actions/inventory-product.actions";
import { getLabCasesByPatient } from "@/lib/actions/lab-case.actions";
import { getChartByPatient } from "@/lib/actions/dental-chart.actions";
import {
    addVisitDentalNote, saveVisitPerioExam, addVisitImaging,
    setConsultationFee, saveVisitProcedures, recordVisitPayment,
    createInvoiceFromVisit, getVisitInvoice, setVisitOtherCharges,
    dispenseVisitProducts,
} from "@/lib/actions/visit-clinical.actions";
import { getPatientOutstanding } from "@/lib/actions/invoice.actions";
import { settlePatientOutstanding } from "@/lib/actions/payment.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { formatMoney } from "@/lib/utils";

function Spinner() {
    return (
        <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
    );
}

/* ═══════════ DENTAL NOTES (embedded, per-visit) ═══════════ */
interface EmbNote {
    _id?: string;
    teeth?: number[];
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    createdAt?: string;
}
export function VisitDentalNotesPanel({
    attendanceId, patientId, notes = [], readOnly,
}: {
    attendanceId?: string; patientId: string; notes?: EmbNote[]; readOnly?: boolean;
}) {
    const path = usePathname();
    const [list, setList] = useState<EmbNote[]>(notes);
    const [form, setForm] = useState({ teeth: "", subjective: "", objective: "", assessment: "", plan: "" });
    const [saving, setSaving] = useState(false);
    const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

    useEffect(() => { setList(notes); }, [notes]);

    const save = async () => {
        if (!attendanceId) return toast.error("Save the visit first, then add notes");
        if (!form.subjective && !form.objective && !form.assessment && !form.plan) return toast.error("Fill at least one SOAP field");
        try {
            setSaving(true);
            const teeth = form.teeth.split(",").map((t) => Number(t.trim())).filter((n) => !Number.isNaN(n));
            const { teeth: _teethStr, ...soap } = form;
            void _teethStr;
            const res = await addVisitDentalNote(attendanceId, patientId, { teeth, ...soap }, path);
            setList(res.dentalNotes || []); // update from server return (no full refresh)
            setForm({ teeth: "", subjective: "", objective: "", assessment: "", plan: "" });
            toast.success("Dental note added to this visit");
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {!readOnly && (
                <Card>
                    <CardContent className="space-y-4 pt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New SOAP Note (this visit)</h3>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Teeth involved (comma separated)</label>
                            <Input value={form.teeth} onChange={(e) => set("teeth", e.target.value)} placeholder="e.g. 14, 15, 16" />
                        </div>
                        {(["subjective", "objective", "assessment", "plan"] as const).map((f) => (
                            <div key={f}>
                                <label className="mb-1 block text-xs font-medium capitalize">{f}</label>
                                <Textarea value={form[f]} onChange={(e) => set(f, e.target.value)} rows={2} placeholder={`${f}...`} />
                            </div>
                        ))}
                        <div className="flex justify-end">
                            <Button onClick={save} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {saving ? "Saving..." : "Add Note"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-4 w-4" /> Notes This Visit
                </h3>
                {list.length === 0 && <p className="text-sm text-muted-foreground">No dental notes recorded on this visit yet.</p>}
                {list.map((n, i) => (
                    <Card key={n._id || i}>
                        <CardContent className="pt-5">
                            <div className="text-xs text-muted-foreground">
                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                                {n.teeth && n.teeth.length ? ` • Teeth: ${n.teeth.join(", ")}` : ""}
                            </div>
                            <dl className="mt-2 space-y-1 text-sm">
                                {n.subjective && <div><span className="font-semibold">S:</span> {n.subjective}</div>}
                                {n.objective && <div><span className="font-semibold">O:</span> {n.objective}</div>}
                                {n.assessment && <div><span className="font-semibold">A:</span> {n.assessment}</div>}
                                {n.plan && <div><span className="font-semibold">P:</span> {n.plan}</div>}
                            </dl>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

/* ═══════════ PERIO EXAM (embedded, per-visit) ═══════════ */
interface EmbPerioM { tooth: number; pocketDepth?: number[]; bleeding?: boolean; recession?: number; mobility?: number }
export function VisitPerioPanel({
    attendanceId, patientId, perioExam, readOnly,
}: {
    attendanceId?: string; patientId: string; perioExam?: { measurements?: EmbPerioM[]; note?: string; recordedAt?: string | null } | null; readOnly?: boolean;
}) {
    const path = usePathname();
    const [rows, setRows] = useState<EmbPerioM[]>(perioExam?.measurements || []);
    const [note, setNote] = useState(perioExam?.note || "");
    const [tooth, setTooth] = useState("");
    const [pd, setPd] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { setRows(perioExam?.measurements || []); setNote(perioExam?.note || ""); }, [perioExam]);

    const addRow = () => {
        const t = Number(tooth);
        if (Number.isNaN(t)) return toast.error("Enter a tooth number");
        const depths = pd.split(/[,\s]+/).map((x) => Number(x)).filter((n) => !Number.isNaN(n));
        setRows((p) => [...p, { tooth: t, pocketDepth: depths, bleeding: false, recession: 0, mobility: 0 }]);
        setTooth(""); setPd("");
    };

    const save = async () => {
        if (!attendanceId) return toast.error("Save the visit first, then record perio");
        if (rows.length === 0) return toast.error("Add at least one tooth measurement");
        try {
            setSaving(true);
            const res = await saveVisitPerioExam(attendanceId, patientId, rows, note, path);
            if (res?.perioExam) {
                setRows(res.perioExam.measurements || rows);
                setNote(res.perioExam.note ?? note);
            }
            toast.success("Perio exam saved to this visit");
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-4 w-4" /> Periodontal Exam (this visit)
                </h3>
                {!readOnly && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="w-24">
                            <label className="mb-1 block text-xs text-muted-foreground">Tooth #</label>
                            <Input value={tooth} onChange={(e) => setTooth(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="mb-1 block text-xs text-muted-foreground">Pocket depths (e.g. 3 2 4 3 2 3)</label>
                            <Input value={pd} onChange={(e) => setPd(e.target.value)} />
                        </div>
                        <Button type="button" variant="secondary" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add tooth</Button>
                    </div>
                )}
                {rows.length > 0 && (
                    <div className="space-y-1.5">
                        {rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <span><Badge variant="outline" className="mr-2">Tooth {r.tooth}</Badge> PD: {r.pocketDepth?.join(" ") || "—"}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Note</label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} readOnly={readOnly} />
                </div>
                {!readOnly && (
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {saving ? "Saving..." : "Save Perio Exam"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ═══════════ IMAGING (embedded, per-visit) ═══════════ */
interface EmbImg { _id?: string; type?: string; title?: string; fileUrl?: string; note?: string; tooth?: number | null; takenAt?: string }
const IMG_TYPES = ["radiograph", "intraoral-photo", "panoramic", "cbct", "other"];
export function VisitImagingPanel({
    attendanceId, patientId, images = [], readOnly,
}: {
    attendanceId?: string; patientId: string; images?: EmbImg[]; readOnly?: boolean;
}) {
    const path = usePathname();
    const [list, setList] = useState<EmbImg[]>(images);
    const [type, setType] = useState(IMG_TYPES[0]);
    const [title, setTitle] = useState("");
    const [tooth, setTooth] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { setList(images); }, [images]);

    const onFile = (file?: File) => {
        if (!file) return;
        if (file.size > 1.5 * 1024 * 1024) return toast.error("Image too large (max 1.5MB). Paste a URL instead.");
        const reader = new FileReader();
        reader.onload = () => setFileUrl(String(reader.result || ""));
        reader.readAsDataURL(file);
    };

    const save = async () => {
        if (!attendanceId) return toast.error("Save the visit first, then add imaging");
        if (!fileUrl) return toast.error("Upload a file or paste an image URL");
        try {
            setSaving(true);
            const res = await addVisitImaging(attendanceId, patientId, { type, title: title || type, tooth: tooth ? Number(tooth) : null, fileUrl }, path);
            setList(res.dentalImaging || []); // update from server return (no full refresh)
            setTitle(""); setTooth(""); setFileUrl("");
            toast.success("Imaging added to this visit");
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-5">
            {!readOnly && (
                <Card>
                    <CardContent className="space-y-4 pt-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            <ImageIcon className="h-4 w-4" /> Add Imaging (this visit)
                        </h3>
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                    <SelectContent>{IMG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="w-20">
                                <label className="mb-1 block text-xs text-muted-foreground">Tooth</label>
                                <Input value={tooth} onChange={(e) => setTooth(e.target.value)} />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Periapical #14" />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Upload</label>
                                <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                                <label className="mb-1 block text-xs text-muted-foreground">or paste URL</label>
                                <Input value={fileUrl.startsWith("data:") ? "" : fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
                            </div>
                            <Button onClick={save} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Add
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {list.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No imaging on this visit yet.</p>}
                {list.map((img, i) => (
                    <div key={img._id || i} className="overflow-hidden rounded-lg border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.fileUrl} alt={img.title || "image"} className="h-28 w-full object-cover" />
                        <p className="truncate p-1.5 text-xs">{img.title || img.type}{img.tooth ? ` • #${img.tooth}` : ""}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════ DENTAL CHART / ODONTOGRAM (living, per-patient) ═══════════ */
export function DentalChartTabPanel({ patientId }: { patientId: string }) {
    const [chart, setChart] = useState<{ conditions?: unknown[]; generalNotes?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        if (!patientId) return;
        setLoading(true);
        getChartByPatient(patientId)
            .then((c) => active && setChart(c || null))
            .catch(() => active && setChart(null))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [patientId]);
    if (loading) return <Spinner />;
    return (
        <Odontogram
            patientId={patientId}
            initialConditions={(chart?.conditions as never) || []}
            initialNotes={chart?.generalNotes || ""}
        />
    );
}

/* ═══════════ CONSULTATION FEE (sets a charge on the visit bill) ═══════════ */
const PAY_METHODS = ["cash", "card", "mobile-money", "bank-transfer", "insurance", "other"] as const;
export function ConsultationBillingPanel({
    attendanceId,
    consultation,
    currency = "",
    onBillingChange,
    readOnly,
}: {
    attendanceId?: string;
    consultation?: { amount?: number };
    currency?: string;
    onBillingChange?: (billing: Record<string, unknown>) => void;
    readOnly?: boolean;
}) {
    const path = usePathname();
    const [amount, setAmount] = useState<string>(consultation?.amount ? String(consultation.amount) : "");
    const [cur, setCur] = useState(currency);
    const [saving, setSaving] = useState(false);
    const [loadingDefault, setLoadingDefault] = useState(!consultation?.amount);

    // Pre-fill the default consultation fee from clinic settings when nothing
    // has been set yet; also pick up the currency label.
    useEffect(() => {
        let active = true;
        getClinicSettings()
            .then((s) => {
                if (!active) return;
                if (!currency && s?.currency) setCur(s.currency);
                if (consultation?.amount) return;
                const def = Number(s?.defaultConsultationFee) || 0;
                if (def > 0) setAmount((prev) => (prev ? prev : String(def)));
            })
            .catch(() => {})
            .finally(() => active && setLoadingDefault(false));
        return () => { active = false; };
    }, [consultation?.amount, currency]);

    const save = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        const fee = Number(amount);
        if (fee < 0) return toast.error("Enter a valid amount");
        const prevFee = consultation?.amount ?? 0; // snapshot for rollback
        onBillingChange?.({ consultationFee: fee }); // optimistic
        try {
            setSaving(true);
            const billing = await setConsultationFee(attendanceId, fee, path);
            if (billing) onBillingChange?.(billing); // reconcile with server truth
            toast.success("Consultation fee added to the bill");
        } catch {
            onBillingChange?.({ consultationFee: prevFee }); // rollback
            toast.error("Something went wrong");
        } finally { setSaving(false); }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wallet className="h-4 w-4" /> Consultation Fee
                </h3>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                        <label className="mb-1 block text-xs text-muted-foreground">Amount ({cur || "amount"})</label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={loadingDefault ? "…" : "0.00"}
                            readOnly={readOnly}
                        />
                    </div>
                    {!readOnly && (
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Add to Bill
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Pre-filled from your clinic&#39;s default consultation fee (Settings), editable per visit. This adds to the visit bill — the patient pays under Payment &amp; Balance below.
                </p>
            </CardContent>
        </Card>
    );
}

/* ═══════════ CUSTOM CHARGES (free-form line items → add to bill) ═══════════ */
interface OtherCharge { label?: string; amount?: number }
export function CustomChargesPanel({
    attendanceId,
    charges = [],
    currency = "",
    onBillingChange,
    readOnly,
}: {
    attendanceId?: string;
    charges?: OtherCharge[];
    currency?: string;
    onBillingChange?: (billing: Record<string, unknown>) => void;
    readOnly?: boolean;
}) {
    const path = usePathname();
    const [cur, setCur] = useState(currency);
    const [rows, setRows] = useState<OtherCharge[]>(charges);
    const [label, setLabel] = useState("");
    const [amt, setAmt] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { setRows(charges); }, [charges]);
    useEffect(() => {
        if (currency) return;
        let active = true;
        getClinicSettings().then((s) => active && s?.currency && setCur(s.currency)).catch(() => {});
        return () => { active = false; };
    }, [currency]);

    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const addRow = () => {
        if (!label.trim()) return toast.error("Enter a description");
        const a = Number(amt);
        if (!a || a <= 0) return toast.error("Enter an amount");
        setRows((p) => [...p, { label: label.trim(), amount: a }]);
        setLabel(""); setAmt("");
    };
    const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

    const persist = async (next?: OtherCharge[]) => {
        if (!attendanceId) return toast.error("Save the visit first");
        const list = (next ?? rows).map((r) => ({ label: r.label || "", amount: Number(r.amount) || 0 }));
        const prev = charges; // snapshot for rollback
        onBillingChange?.({ otherCharges: list }); // optimistic
        try {
            setSaving(true);
            const billing = await setVisitOtherCharges(attendanceId, list, path);
            if (billing) onBillingChange?.(billing); // reconcile
            toast.success("Custom charges added to the bill");
        } catch {
            setRows(prev); // restore local rows
            onBillingChange?.({ otherCharges: prev }); // rollback shared
            toast.error("Something went wrong");
        } finally { setSaving(false); }
    };

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wallet className="h-4 w-4" /> Custom Charges
                </h3>

                {!readOnly && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="min-w-[220px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Materials fee, X-ray, Discount" />
                        </div>
                        <div className="w-32">
                            <label className="mb-1 block text-xs text-muted-foreground">Amount ({cur || "amount"})</label>
                            <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" />
                        </div>
                        <Button type="button" variant="secondary" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                    </div>
                )}

                {rows.length > 0 ? (
                    <div className="space-y-1.5">
                        {rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <span>{r.label || "Charge"}</span>
                                <span className="flex items-center gap-3">
                                    <span className="font-medium">{formatMoney(Number(r.amount) || 0, cur)}</span>
                                    {!readOnly && <button onClick={() => removeRow(i)} className="text-red-500"><X className="h-4 w-4" /></button>}
                                </span>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2 text-sm">
                            <span className="text-muted-foreground">Total:&nbsp;</span>
                            <span className="font-bold">{formatMoney(total, cur)}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No custom charges for this visit.</p>
                )}

                {!readOnly && (
                    <div className="flex justify-end">
                        <Button onClick={() => persist()} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Add to Bill
                        </Button>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Free-form line items for anything not in the procedure catalog. These add to the visit bill and the generated invoice.
                </p>
            </CardContent>
        </Card>
    );
}

/* ═══════════ DISPENSE PRODUCTS / DRUGS (inventory → visit bill) ═══════════ */
interface InvProduct { _id: string; name: string; salePrice?: number; quantity?: number }
interface DispensedRow { productId?: string; name?: string; quantity?: number; unitPrice?: number; total?: number }
export function VisitProductsPanel({
    attendanceId,
    dispensed = [],
    currency = "",
    onBillingChange,
    readOnly,
}: {
    attendanceId?: string;
    dispensed?: DispensedRow[];
    currency?: string;
    onBillingChange?: (billing: Record<string, unknown>) => void;
    readOnly?: boolean;
}) {
    const path = usePathname();
    const [catalog, setCatalog] = useState<InvProduct[]>([]);
    const [rows, setRows] = useState<DispensedRow[]>(dispensed);
    const [sel, setSel] = useState("");
    const [qty, setQty] = useState("1");
    const [cur, setCur] = useState(currency);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => { setRows(dispensed); }, [dispensed]);
    useEffect(() => {
        let active = true;
        Promise.all([fetchAllProducts(), currency ? Promise.resolve(null) : getClinicSettings()])
            .then(([p, s]) => {
                if (!active) return;
                setCatalog((p || []) as InvProduct[]);
                if (!currency && s?.currency) setCur(s.currency);
            })
            .catch(() => active && setCatalog([]))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [currency]);

    const total = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
    // Stock remaining after what's already staged in this panel.
    const stockLeft = (id: string) => {
        const prod = catalog.find((c) => c._id === id);
        const staged = rows.filter((r) => r.productId === id).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
        return (Number(prod?.quantity) || 0) - staged;
    };

    const addRow = () => {
        const prod = catalog.find((c) => c._id === sel);
        if (!prod) return toast.error("Select a product");
        const q = Number(qty) || 0;
        if (q <= 0) return toast.error("Enter a quantity");
        if (q > stockLeft(prod._id)) return toast.error(`Only ${stockLeft(prod._id)} in stock`);
        const unit = Number(prod.salePrice) || 0;
        setRows((p) => [...p, { productId: prod._id, name: prod.name, quantity: q, unitPrice: unit, total: unit * q }]);
        setSel(""); setQty("1");
    };
    const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

    const persist = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        const prev = dispensed; // rollback snapshot
        try {
            setSaving(true);
            const billing = await dispenseVisitProducts(
                attendanceId,
                rows.filter((r) => r.productId).map((r) => ({ productId: String(r.productId), quantity: Number(r.quantity) || 0 })),
                path
            );
            if (billing) onBillingChange?.(billing);
            toast.success("Products dispensed and added to the bill");
        } catch (e) {
            setRows(prev);
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally { setSaving(false); }
    };

    if (loading) return <Spinner />;

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wallet className="h-4 w-4" /> Products / Drugs Dispensed
                </h3>

                {!readOnly && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="min-w-[220px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Product</label>
                            <Select value={sel} onValueChange={setSel}>
                                <SelectTrigger><SelectValue placeholder="Select from inventory" /></SelectTrigger>
                                <SelectContent>
                                    {catalog.length === 0 ? (
                                        <SelectItem value="none" disabled>No products — add them in Inventory</SelectItem>
                                    ) : catalog.map((c) => (
                                        <SelectItem key={c._id} value={c._id} disabled={(Number(c.quantity) || 0) <= 0}>
                                            {c.name} — {formatMoney(Number(c.salePrice) || 0, cur)} ({Number(c.quantity) || 0} in stock)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-24">
                            <label className="mb-1 block text-xs text-muted-foreground">Qty</label>
                            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                        </div>
                        <Button type="button" variant="secondary" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                    </div>
                )}

                {rows.length > 0 ? (
                    <div className="space-y-1.5">
                        {rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <span>{r.name || "Product"} × {r.quantity}</span>
                                <span className="flex items-center gap-3">
                                    <span className="font-medium">{formatMoney(Number(r.total) || 0, cur)}</span>
                                    {!readOnly && <button onClick={() => removeRow(i)} className="text-red-500"><X className="h-4 w-4" /></button>}
                                </span>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2 text-sm">
                            <span className="text-muted-foreground">Total:&nbsp;</span>
                            <span className="font-bold">{formatMoney(total, cur)}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No products dispensed on this visit.</p>
                )}

                {!readOnly && (
                    <div className="flex justify-end">
                        <Button onClick={persist} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Dispense &amp; Add to Bill
                        </Button>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Dispensing decrements inventory stock, adds the products to the visit bill/invoice, and posts income when the patient pays.
                </p>
            </CardContent>
        </Card>
    );
}

/* ═══════════ VISIT PROCEDURES (capture from catalog → add to bill) ═══════════ */
interface ProcLite { _id: string; code: string; name: string; price: number }
interface VisitProc { procedureId?: string | null; procedureName?: string; tooth?: number | null; cost?: number }
export function VisitProceduresPanel({
    attendanceId,
    procedures = [],
    currency = "",
    onBillingChange,
    onProceduresChange,
    readOnly,
}: {
    attendanceId?: string;
    procedures?: VisitProc[];
    currency?: string;
    onBillingChange?: (billing: Record<string, unknown>) => void;
    onProceduresChange?: (procedures: VisitProc[]) => void;
    readOnly?: boolean;
}) {
    const path = usePathname();
    const [catalog, setCatalog] = useState<ProcLite[]>([]);
    const [rows, setRows] = useState<VisitProc[]>(procedures);
    const [selProc, setSelProc] = useState("");
    const [tooth, setTooth] = useState("");
    const [cur, setCur] = useState(currency);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        Promise.all([getAllProcedures(), getClinicSettings()])
            .then(([p, s]) => {
                if (!active) return;
                setCatalog((p || []) as ProcLite[]);
                if (!currency && s?.currency) setCur(s.currency);
            })
            .catch(() => active && setCatalog([]))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [currency]);

    const total = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0);

    const addRow = () => {
        const proc = catalog.find((c) => c._id === selProc);
        if (!proc) return toast.error("Select a procedure");
        setRows((p) => [...p, { procedureId: proc._id, procedureName: `${proc.code} — ${proc.name}`, tooth: tooth ? Number(tooth) : null, cost: Number(proc.price) || 0 }]);
        setSelProc(""); setTooth("");
    };
    const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

    const persist = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        const prev = procedures; // snapshot for rollback
        onProceduresChange?.(rows); // optimistic
        try {
            setSaving(true);
            const res = await saveVisitProcedures(attendanceId, rows, path);
            if (res?.dentalProcedures) onProceduresChange?.(res.dentalProcedures);
            if (res?.billing) onBillingChange?.(res.billing);
            toast.success("Procedures added to the bill");
        } catch {
            setRows(prev); // restore local rows
            onProceduresChange?.(prev); // rollback shared
            toast.error("Something went wrong");
        } finally { setSaving(false); }
    };

    if (loading) return <Spinner />;

    return (
        <Card>
            <CardContent className="space-y-5 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wallet className="h-4 w-4" /> Procedures
                </h3>

                {!readOnly && (
                    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                        <div className="min-w-[220px] flex-1">
                            <label className="mb-1 block text-xs text-muted-foreground">Procedure</label>
                            <Select value={selProc} onValueChange={setSelProc}>
                                <SelectTrigger><SelectValue placeholder="Select from catalog" /></SelectTrigger>
                                <SelectContent>
                                    {catalog.length === 0 ? (
                                        <SelectItem value="none" disabled>No procedures — add them in the Procedure Catalog</SelectItem>
                                    ) : catalog.map((c) => (
                                        <SelectItem key={c._id} value={c._id}>{c.code} — {c.name} ({formatMoney(c.price, cur)})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-20">
                            <label className="mb-1 block text-xs text-muted-foreground">Tooth</label>
                            <Input value={tooth} onChange={(e) => setTooth(e.target.value)} />
                        </div>
                        <Button type="button" variant="secondary" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add</Button>
                    </div>
                )}

                {rows.length > 0 ? (
                    <div className="space-y-1.5">
                        {rows.map((r, i) => (
                            <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                <span>
                                    {r.procedureName || "Procedure"}{r.tooth ? ` (Tooth ${r.tooth})` : ""}
                                </span>
                                <span className="flex items-center gap-3">
                                    <span className="font-medium">{formatMoney(r.cost || 0, cur)}</span>
                                    {!readOnly && <button onClick={() => removeRow(i)} className="text-red-500"><X className="h-4 w-4" /></button>}
                                </span>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2 text-sm">
                            <span className="text-muted-foreground">Total:&nbsp;</span>
                            <span className="font-bold">{formatMoney(total, cur)}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No procedures recorded for this visit.</p>
                )}

                {!readOnly && (
                    <div className="flex justify-end">
                        <Button onClick={persist} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Add to Bill
                        </Button>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Procedure prices come from the Procedure Catalog. These add to the visit bill — the patient settles it under Payment &amp; Balance below.
                </p>
            </CardContent>
        </Card>
    );
}

/* ═══════════ PAYMENT & BALANCE (invoice-driven) ═══════════ */
interface Billing {
    invoiceId?: string | null;
    invoiceNumber?: string;
    consultationFee?: number;
    proceduresTotal?: number;
    otherCharges?: { label?: string; amount?: number }[];
    dispensedProducts?: { name?: string; quantity?: number; total?: number }[];
    totalCharged?: number;
    amountPaid?: number;
    balance?: number;
}
interface InvoiceLite {
    _id: string;
    invoiceNumber?: string;
    items?: { description?: string; amount?: number }[];
    total?: number;
    amountPaid?: number;
    balance?: number;
    status?: string;
}
const STATUS_COLOR: Record<string, string> = {
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-700",
    draft: "bg-slate-100 text-slate-700",
};
export function VisitPaymentPanel({
    attendanceId,
    patientId,
    billing,
    procedures = [],
    currency = "",
    onBillingChange,
    readOnly,
}: {
    attendanceId?: string;
    patientId?: string;
    billing?: Billing;
    procedures?: VisitProc[];
    currency?: string;
    onBillingChange?: (billing: Record<string, unknown>) => void;
    readOnly?: boolean;
}) {
    const path = usePathname();
    const [cur, setCur] = useState(currency);
    const [invoice, setInvoice] = useState<InvoiceLite | null>(null);
    const [prevOutstanding, setPrevOutstanding] = useState(0);
    const [prevCount, setPrevCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [paying, setPaying] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [settleAmount, setSettleAmount] = useState("");
    const [settleMethod, setSettleMethod] = useState("cash");
    const [settling, setSettling] = useState(false);

    // Local (pre-invoice) charge summary — computed from the SAME data the
    // panel displays (consultation fee + the procedures list + other charges),
    // so the breakdown and the total always agree even before the server
    // roundtrip refreshes billing.proceduresTotal.
    const consultationFee = Number(billing?.consultationFee) || 0;
    const otherCharges = billing?.otherCharges || [];
    const dispensedProducts = billing?.dispensedProducts || [];
    const productsTotal = dispensedProducts.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const proceduresTotal = procedures.reduce((s, p) => s + (Number(p.cost) || 0), 0)
        || Number(billing?.proceduresTotal) || 0;
    const localTotal = consultationFee + proceduresTotal + productsTotal + otherCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const hasLocalCharges = consultationFee > 0 || procedures.length > 0 || otherCharges.length > 0 || dispensedProducts.length > 0;

    // When an invoice exists it is the source of truth for money.
    const total = invoice ? Number(invoice.total) || 0 : localTotal;
    const amountPaid = invoice ? Number(invoice.amountPaid) || 0 : 0;
    const balance = invoice ? Number(invoice.balance) || 0 : localTotal;
    // Grand total the patient owes = this visit balance + prior unpaid invoices.
    const grandTotal = balance + prevOutstanding;

    const load = () => {
        if (!attendanceId) { setLoading(false); return; }
        setLoading(true);
        getVisitInvoice(attendanceId)
            .then(async (inv) => {
                setInvoice(inv || null);
                if (!currency) {
                    const s = await getClinicSettings().catch(() => null);
                    if (s?.currency) setCur(s.currency);
                }
                // Previous outstanding = unpaid balances on OTHER invoices.
                if (patientId) {
                    const out = await getPatientOutstanding(patientId, inv?._id).catch(() => null);
                    setPrevOutstanding(Number(out?.total) || 0);
                    setPrevCount(Number(out?.count) || 0);
                }
            })
            .catch(() => setInvoice(null))
            .finally(() => setLoading(false));
    };
    // Reload when the visit or its charge total changes (e.g. after saving a
    // consultation fee or procedures, which auto-syncs a linked invoice).
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [attendanceId, billing?.totalCharged, billing?.consultationFee, billing?.proceduresTotal]);

    useEffect(() => { setAmount(balance > 0 ? String(balance) : ""); }, [balance]);
    useEffect(() => { setSettleAmount(prevOutstanding > 0 ? String(prevOutstanding) : ""); }, [prevOutstanding]);

    const generate = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        try {
            setGenerating(true);
            const inv = await createInvoiceFromVisit(attendanceId, path);
            setInvoice(inv || null);
            if (inv) onBillingChange?.({ invoiceId: inv._id, invoiceNumber: inv.invoiceNumber });
            toast.success("Invoice generated");
        } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setGenerating(false); }
    };

    const pay = async () => {
        if (!attendanceId) return toast.error("Save the visit first");
        const amt = Number(amount);
        if (!amt || amt <= 0) return toast.error("Enter a payment amount");
        try {
            setPaying(true);
            const res = await recordVisitPayment(attendanceId, amt, method as never, path);
            // Reconcile from the server truth: invoice + billing.
            if (res?.invoice) setInvoice(res.invoice as InvoiceLite);
            if (res?.billing) onBillingChange?.(res.billing);
            toast.success("Payment recorded");
        } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setPaying(false); }
    };

    const settle = async () => {
        if (!patientId) return toast.error("No patient linked to this visit");
        const amt = Number(settleAmount);
        if (!amt || amt <= 0) return toast.error("Enter an amount");
        try {
            setSettling(true);
            const res = await settlePatientOutstanding(patientId, amt, settleMethod as never, invoice?._id, path);
            toast.success(`Settled ${res?.settledCount || 0} invoice(s)`);
            load(); // refresh previous outstanding
        } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setSettling(false); }
    };

    const row = (label: string, value: number, bold = false) => (
        <div className={`flex items-center justify-between py-1.5 text-sm ${bold ? "font-semibold" : ""}`}>
            <span>{label}</span>
            <span>{formatMoney(value, cur)}</span>
        </div>
    );

    if (loading) return <Spinner />;

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        <Wallet className="h-4 w-4" /> Payment &amp; Balance
                    </h3>
                    {invoice && (
                        <Badge className={STATUS_COLOR[invoice.status || ""] || ""}>{invoice.status}</Badge>
                    )}
                </div>

                {/* Invoice link / generate */}
                {invoice ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="flex items-center gap-2 font-medium">
                            <ReceiptText className="h-4 w-4 text-teal-600" /> Invoice {invoice.invoiceNumber}
                        </span>
                        <Link href={`/dashboard/billing/invoices/${invoice._id}`} className="inline-flex items-center gap-1 text-teal-600 hover:underline">
                            Open / Print invoice <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                ) : (
                    !readOnly && (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
                            <span className="text-muted-foreground">No invoice yet for this visit.</span>
                            <Button size="sm" variant="outline" onClick={generate} disabled={generating || localTotal <= 0}>
                                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}
                                Generate Invoice
                            </Button>
                        </div>
                    )
                )}

                {/* Itemized breakdown */}
                <div className="rounded-lg border p-3">
                    {invoice && invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((it, i) => row(it.description || "Item", Number(it.amount) || 0))
                    ) : (
                        <>
                            {consultationFee > 0 && row("Consultation", consultationFee)}
                            {procedures.length > 0
                                ? procedures.map((p, i) => row(`${p.procedureName || "Procedure"}${p.tooth ? ` (Tooth ${p.tooth})` : ""}`, Number(p.cost) || 0))
                                : proceduresTotal > 0 && row("Procedures", proceduresTotal)}
                            {dispensedProducts.map((d, i) => row(`${d.name || "Product"} × ${d.quantity || 1}`, Number(d.total) || 0))}
                            {otherCharges.map((c, i) => row(c.label || "Charge", Number(c.amount) || 0))}
                            {!hasLocalCharges && (
                                <p className="py-2 text-sm text-muted-foreground">No charges yet. Add a consultation fee or procedures above.</p>
                            )}
                        </>
                    )}
                    <div className="mt-2 border-t pt-2">
                        {row("Total", total, true)}
                        {row("Paid", amountPaid)}
                        <div className="flex items-center justify-between py-1.5 text-sm">
                            <span>This Visit Balance</span>
                            <span className={balance > 0 ? "text-red-600" : "text-green-600"}>{formatMoney(balance, cur)}</span>
                        </div>
                        {prevOutstanding > 0 && (
                            <div className="flex items-center justify-between py-1.5 text-sm">
                                <span className="text-amber-700">Previous Outstanding{prevCount > 0 ? ` (${prevCount} invoice${prevCount === 1 ? "" : "s"})` : ""}</span>
                                <span className="text-amber-700">{formatMoney(prevOutstanding, cur)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                            <span>{prevOutstanding > 0 ? "Grand Total Due" : "Balance Due"}</span>
                            <span className={grandTotal > 0 ? "text-red-600" : "text-green-600"}>{formatMoney(grandTotal, cur)}</span>
                        </div>
                    </div>
                </div>

                {/* Record payment (posts through the invoice) */}
                {!readOnly && balance > 0 && (
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-40">
                            <label className="mb-1 block text-xs text-muted-foreground">Payment amount</label>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div className="w-44">
                            <label className="mb-1 block text-xs text-muted-foreground">Method</label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Button onClick={pay} disabled={paying}>
                            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                            Record Payment
                        </Button>
                        <span className="w-full text-xs text-muted-foreground">Pays this visit&#39;s invoice.</span>
                    </div>
                )}

                {/* Settle previous outstanding (prior unpaid invoices, oldest first) */}
                {!readOnly && prevOutstanding > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:bg-amber-900/10">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Settle Previous Outstanding</p>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-40">
                                <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
                                <Input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
                            </div>
                            <div className="w-44">
                                <label className="mb-1 block text-xs text-muted-foreground">Method</label>
                                <Select value={settleMethod} onValueChange={setSettleMethod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Button variant="secondary" onClick={settle} disabled={settling}>
                                {settling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                Settle Outstanding
                            </Button>
                            <span className="w-full text-xs text-muted-foreground">Applied oldest-first across prior unpaid invoices.</span>
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Once an invoice exists it updates automatically as you add charges. Payment posts the received amount to Clinic Revenue (cash-basis). Partial payments are allowed; open the invoice to print a receipt.
                </p>
            </CardContent>
        </Card>
    );
}

/* ═══════════ TREATMENT PLAN (living, cross-visit) ═══════════ */
export function DentalPlanTabPanel({ patientId }: { patientId: string }) {
    const [plans, setPlans] = useState<unknown[]>([]);
    const [procedures, setProcedures] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        if (!patientId) return;
        setLoading(true);
        Promise.all([getPlansByPatient(patientId), getAllProcedures()])
            .then(([p, procs]) => { if (!active) return; setPlans(p || []); setProcedures(procs || []); })
            .catch(() => active && (setPlans([]), setProcedures([])))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [patientId]);
    if (loading) return <Spinner />;
    return (
        <div className="space-y-6">
            <TreatmentPlanBuilder patientId={patientId} procedures={procedures as never} />
            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Existing Plans</h3>
                <ExistingPlans plans={plans as never} />
            </div>
        </div>
    );
}

/* ═══════════ LAB CASES (living, cross-visit) ═══════════ */
export function LabCaseTabPanel({ patientId, patientName }: { patientId: string; patientName?: string }) {
    const [cases, setCases] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        if (!patientId) return;
        setLoading(true);
        getLabCasesByPatient(patientId)
            .then((c) => active && setCases(c || []))
            .catch(() => active && setCases([]))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [patientId]);
    if (loading) return <Spinner />;
    return <LabCaseManager cases={cases as never} presetPatient={{ _id: patientId, fullName: patientName }} />;
}
