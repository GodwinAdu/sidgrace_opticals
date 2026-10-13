"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2,
    PlusCircle,
    Trash2,
    CalendarDays,
    Clock,
    Wallet,
    Check,
    X,
    Plus,
} from "lucide-react";
import { format } from "date-fns";
import {
    createLeaveRequest,
    decideLeaveRequest,
    deleteLeaveRequest,
    recordTimesheet,
    deleteTimesheet,
    createPayrollRun,
    deletePayrollRun,
} from "@/lib/actions/hr.actions";
import {
    LEAVE_TYPES,
    LEAVE_STATUSES,
    nextLeaveStatuses,
    computeGross,
    sumAdjustments,
    type LeaveStatus,
    type LeaveType,
} from "@/lib/clinical/hr";

/* ─────────────────────────────── Types (lite) ───────────────────────────── */

interface StaffOption {
    _id: string;
    fullName: string;
    role?: string;
}

interface LeaveRow {
    _id: string;
    staffId?: { _id?: string; fullName?: string; role?: string } | string;
    type?: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    reason?: string;
    status?: LeaveStatus;
    approver?: { fullName?: string } | string | null;
    decisionNote?: string;
    createdAt?: string;
}

interface TimesheetRow {
    _id: string;
    staffId?: { _id?: string; fullName?: string; role?: string } | string;
    date?: string;
    clockIn?: string | null;
    clockOut?: string | null;
    hours?: number;
    note?: string;
}

interface PayAdjustmentRow {
    label?: string;
    amount?: number;
}

interface PayrollLineRow {
    staffId?: string;
    staffName?: string;
    basePay?: number;
    allowances?: PayAdjustmentRow[];
    deductions?: PayAdjustmentRow[];
    gross?: number;
}

interface PayrollRunRow {
    _id: string;
    runNumber?: string;
    periodLabel?: string;
    periodStart?: string;
    periodEnd?: string;
    lines?: PayrollLineRow[];
    totalBase?: number;
    totalAllowances?: number;
    totalDeductions?: number;
    totalGross?: number;
    status?: string;
    note?: string;
    createdAt?: string;
}

interface Props {
    staff: StaffOption[];
    leaves: LeaveRow[];
    timesheets: TimesheetRow[];
    payrollRuns: PayrollRunRow[];
}

/* ─────────────────────────────── Helpers ────────────────────────────────── */

const money = (n?: number) =>
    (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const staffName = (
    ref: { fullName?: string } | string | null | undefined,
    fallback = "Unknown",
) => (ref && typeof ref === "object" ? ref.fullName || fallback : fallback);

const leaveTone = (status?: string) => {
    switch (status) {
        case "approved":
            return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "pending":
            return "bg-amber-100 text-amber-800 border-amber-200";
        case "rejected":
            return "bg-red-100 text-red-800 border-red-200";
        case "cancelled":
            return "bg-slate-100 text-slate-700 border-slate-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
};

const leaveStatusLabel = (v?: string) =>
    LEAVE_STATUSES.find((s) => s.value === v)?.label ?? v ?? "";
const leaveTypeLabel = (v?: string) =>
    LEAVE_TYPES.find((t) => t.value === v)?.label ?? v ?? "";

/* ─────────────────── Editable payroll line (local draft) ─────────────────── */

interface DraftAdj {
    label: string;
    amount: string;
}
interface DraftLine {
    staffId: string;
    staffName: string;
    basePay: string;
    allowances: DraftAdj[];
    deductions: DraftAdj[];
}

/* ────────────────────────────── Component ───────────────────────────────── */

export function HrManager({ staff, leaves, timesheets, payrollRuns }: Props) {
    const router = useRouter();
    const path = usePathname();
    const [busyId, setBusyId] = useState<string | null>(null);

    return (
        <Tabs defaultValue="leave" className="space-y-6">
            <TabsList>
                <TabsTrigger value="leave">
                    <CalendarDays className="mr-1 h-4 w-4" /> Leave
                </TabsTrigger>
                <TabsTrigger value="timesheet">
                    <Clock className="mr-1 h-4 w-4" /> Time / Attendance
                </TabsTrigger>
                <TabsTrigger value="payroll">
                    <Wallet className="mr-1 h-4 w-4" /> Payroll
                </TabsTrigger>
            </TabsList>

            <TabsContent value="leave">
                <LeaveTab
                    staff={staff}
                    leaves={leaves}
                    busyId={busyId}
                    setBusyId={setBusyId}
                    router={router}
                    path={path}
                />
            </TabsContent>

            <TabsContent value="timesheet">
                <TimesheetTab
                    staff={staff}
                    timesheets={timesheets}
                    busyId={busyId}
                    setBusyId={setBusyId}
                    router={router}
                    path={path}
                />
            </TabsContent>

            <TabsContent value="payroll">
                <PayrollTab
                    staff={staff}
                    payrollRuns={payrollRuns}
                    busyId={busyId}
                    setBusyId={setBusyId}
                    router={router}
                    path={path}
                />
            </TabsContent>
        </Tabs>
    );
}

/* ─────────────────────────────── Leave tab ──────────────────────────────── */

interface TabProps {
    staff: StaffOption[];
    busyId: string | null;
    setBusyId: (v: string | null) => void;
    router: ReturnType<typeof useRouter>;
    path: string;
}

function LeaveTab({
    staff,
    leaves,
    busyId,
    setBusyId,
    router,
    path,
}: TabProps & { leaves: LeaveRow[] }) {
    const [staffId, setStaffId] = useState("");
    const [type, setType] = useState<LeaveType>("annual");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState<"all" | LeaveStatus>("all");

    const visible = useMemo(
        () => (filter === "all" ? leaves : leaves.filter((l) => l.status === filter)),
        [leaves, filter],
    );

    const doCreate = async () => {
        if (!staffId) return toast.error("Select a staff member");
        if (!startDate || !endDate) return toast.error("Pick a start and end date");
        try {
            setCreating(true);
            await createLeaveRequest({ staffId, type, startDate, endDate, reason }, path);
            toast.success("Leave request filed");
            setStaffId(""); setType("annual"); setStartDate(""); setEndDate(""); setReason("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const decide = async (l: LeaveRow, to: LeaveStatus) => {
        try {
            setBusyId(l._id);
            await decideLeaveRequest(l._id, to, "", path);
            toast.success(`Leave ${to}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteLeaveRequest(id);
            toast.success("Leave request removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        File Leave Request
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Staff</label>
                            <Select value={staffId} onValueChange={setStaffId}>
                                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                                <SelectContent>
                                    {staff.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.fullName}{s.role ? ` · ${s.role}` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                            <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {LEAVE_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Reason</label>
                            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Start date</label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">End date</label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={doCreate} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            File Request
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
                <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
                {LEAVE_STATUSES.map((s) => (
                    <Button key={s.value} variant={filter === s.value ? "default" : "outline"} size="sm" onClick={() => setFilter(s.value)}>
                        {s.label}
                    </Button>
                ))}
            </div>

            <div className="space-y-3">
                {(!visible || visible.length === 0) && (
                    <p className="text-sm text-muted-foreground">No leave requests.</p>
                )}
                {visible.map((l) => {
                    const nexts = nextLeaveStatuses((l.status as LeaveStatus) ?? "pending");
                    return (
                        <Card key={l._id}>
                            <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
                                <div>
                                    <p className="font-semibold">{staffName(l.staffId)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {leaveTypeLabel(l.type)} leave · {l.days ?? 0} day{(l.days ?? 0) === 1 ? "" : "s"}
                                        {l.startDate && l.endDate && (
                                            <> · {format(new Date(l.startDate), "PP")} – {format(new Date(l.endDate), "PP")}</>
                                        )}
                                    </p>
                                    {l.reason && <p className="mt-1 text-xs text-muted-foreground">“{l.reason}”</p>}
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <Badge variant="outline" className={leaveTone(l.status)}>{leaveStatusLabel(l.status)}</Badge>
                                    {nexts.includes("approved") && (
                                        <Button size="sm" variant="outline" onClick={() => decide(l, "approved")} disabled={busyId === l._id}>
                                            {busyId === l._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Approve</>}
                                        </Button>
                                    )}
                                    {nexts.includes("rejected") && (
                                        <Button size="sm" variant="ghost" onClick={() => decide(l, "rejected")} disabled={busyId === l._id}>
                                            <X className="mr-1 h-4 w-4" /> Reject
                                        </Button>
                                    )}
                                    <button onClick={() => remove(l._id)} disabled={busyId === l._id} className="text-muted-foreground hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

/* ──────────────────────────── Timesheet tab ─────────────────────────────── */

function TimesheetTab({
    staff,
    timesheets,
    busyId,
    setBusyId,
    router,
    path,
}: TabProps & { timesheets: TimesheetRow[] }) {
    const [staffId, setStaffId] = useState("");
    const [date, setDate] = useState("");
    const [clockIn, setClockIn] = useState("");
    const [clockOut, setClockOut] = useState("");
    const [hours, setHours] = useState("");
    const [note, setNote] = useState("");
    const [creating, setCreating] = useState(false);

    const doCreate = async () => {
        if (!staffId) return toast.error("Select a staff member");
        try {
            setCreating(true);
            await recordTimesheet(
                {
                    staffId,
                    date: date || undefined,
                    clockIn: clockIn || null,
                    clockOut: clockOut || null,
                    hours: hours ? Number(hours) : undefined,
                    note,
                },
                path,
            );
            toast.success("Entry recorded");
            setStaffId(""); setDate(""); setClockIn(""); setClockOut(""); setHours(""); setNote("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteTimesheet(id);
            toast.success("Entry removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Record Time / Attendance
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Staff</label>
                            <Select value={staffId} onValueChange={setStaffId}>
                                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                                <SelectContent>
                                    {staff.map((s) => (
                                        <SelectItem key={s._id} value={s._id}>
                                            {s.fullName}{s.role ? ` · ${s.role}` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Hours (daily entry)</label>
                            <Input type="number" min={0} step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 8" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Clock in</label>
                            <Input type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Clock out</label>
                            <Input type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Note</label>
                            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={doCreate} disabled={creating}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Record Entry
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {(!timesheets || timesheets.length === 0) && (
                    <p className="text-sm text-muted-foreground">No timesheet entries.</p>
                )}
                {timesheets.map((t) => (
                    <Card key={t._id}>
                        <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
                            <div>
                                <p className="font-semibold">{staffName(t.staffId)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t.date && format(new Date(t.date), "PP")}
                                    {typeof t.hours === "number" && t.hours > 0 && ` · ${t.hours}h`}
                                    {t.clockIn && ` · in ${format(new Date(t.clockIn), "p")}`}
                                    {t.clockOut && ` · out ${format(new Date(t.clockOut), "p")}`}
                                </p>
                                {t.note && <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>}
                            </div>
                            <button onClick={() => remove(t._id)} disabled={busyId === t._id} className="text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

/* ──────────────────────────── Payroll tab ───────────────────────────────── */

function PayrollTab({
    staff,
    payrollRuns,
    busyId,
    setBusyId,
    router,
    path,
}: TabProps & { payrollRuns: PayrollRunRow[] }) {
    const [periodLabel, setPeriodLabel] = useState("");
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");
    const [lines, setLines] = useState<DraftLine[]>([]);
    const [running, setRunning] = useState(false);

    const addLine = () =>
        setLines((prev) => [...prev, { staffId: "", staffName: "", basePay: "", allowances: [], deductions: [] }]);

    const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

    const setLineField = (idx: number, patch: Partial<DraftLine>) =>
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

    const addAdj = (idx: number, kind: "allowances" | "deductions") =>
        setLines((prev) =>
            prev.map((l, i) => (i === idx ? { ...l, [kind]: [...l[kind], { label: "", amount: "" }] } : l)),
        );

    const setAdj = (idx: number, kind: "allowances" | "deductions", aIdx: number, patch: Partial<DraftAdj>) =>
        setLines((prev) =>
            prev.map((l, i) =>
                i === idx
                    ? { ...l, [kind]: l[kind].map((a, j) => (j === aIdx ? { ...a, ...patch } : a)) }
                    : l,
            ),
        );

    const lineGross = (l: DraftLine) =>
        computeGross({
            basePay: l.basePay,
            allowances: l.allowances.map((a) => ({ amount: a.amount })),
            deductions: l.deductions.map((d) => ({ amount: d.amount })),
        });

    const draftTotal = useMemo(() => lines.reduce((acc, l) => acc + lineGross(l), 0), [lines]);

    const run = async () => {
        if (!periodStart || !periodEnd) return toast.error("Pick a pay period");
        const usable = lines.filter((l) => l.staffId);
        if (usable.length === 0) return toast.error("Add at least one staff line");
        try {
            setRunning(true);
            await createPayrollRun(
                {
                    periodLabel,
                    periodStart,
                    periodEnd,
                    lines: usable.map((l) => {
                        const picked = staff.find((s) => s._id === l.staffId);
                        return {
                            staffId: l.staffId,
                            staffName: picked?.fullName || l.staffName,
                            basePay: l.basePay,
                            allowances: l.allowances.filter((a) => a.amount !== "").map((a) => ({ label: a.label, amount: a.amount })),
                            deductions: l.deductions.filter((d) => d.amount !== "").map((d) => ({ label: d.label, amount: d.amount })),
                        };
                    }),
                },
                path,
            );
            toast.success("Payroll run posted to the ledger");
            setPeriodLabel(""); setPeriodStart(""); setPeriodEnd(""); setLines([]);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setRunning(false);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deletePayrollRun(id);
            toast.success("Payroll run deleted and ledger entry reversed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        New Payroll Run
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Period label</label>
                            <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. June 2026" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Period start</label>
                            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Period end</label>
                            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {lines.map((l, idx) => (
                            <div key={idx} className="rounded-md border p-3 space-y-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="min-w-[200px] flex-1">
                                        <label className="mb-1 block text-xs text-muted-foreground">Staff</label>
                                        <Select value={l.staffId} onValueChange={(v) => setLineField(idx, { staffId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                                            <SelectContent>
                                                {staff.map((s) => (
                                                    <SelectItem key={s._id} value={s._id}>
                                                        {s.fullName}{s.role ? ` · ${s.role}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-32">
                                        <label className="mb-1 block text-xs text-muted-foreground">Base pay</label>
                                        <Input type="number" min={0} value={l.basePay} onChange={(e) => setLineField(idx, { basePay: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Gross </span>
                                        <span className="font-semibold">{money(lineGross(l))}</span>
                                    </div>
                                    <button onClick={() => removeLine(idx)} className="ml-auto text-muted-foreground hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Allowances */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Allowances (+{money(sumAdjustments(l.allowances.map((a) => ({ amount: a.amount }))))})</span>
                                        <Button size="sm" variant="ghost" onClick={() => addAdj(idx, "allowances")}>
                                            <Plus className="mr-1 h-3 w-3" /> Add
                                        </Button>
                                    </div>
                                    {l.allowances.map((a, aIdx) => (
                                        <div key={aIdx} className="flex gap-2">
                                            <Input className="flex-1" value={a.label} onChange={(e) => setAdj(idx, "allowances", aIdx, { label: e.target.value })} placeholder="e.g. Transport" />
                                            <Input className="w-32" type="number" value={a.amount} onChange={(e) => setAdj(idx, "allowances", aIdx, { amount: e.target.value })} placeholder="0" />
                                        </div>
                                    ))}
                                </div>

                                {/* Deductions */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Deductions (−{money(sumAdjustments(l.deductions.map((d) => ({ amount: d.amount }))))})</span>
                                        <Button size="sm" variant="ghost" onClick={() => addAdj(idx, "deductions")}>
                                            <Plus className="mr-1 h-3 w-3" /> Add
                                        </Button>
                                    </div>
                                    {l.deductions.map((d, dIdx) => (
                                        <div key={dIdx} className="flex gap-2">
                                            <Input className="flex-1" value={d.label} onChange={(e) => setAdj(idx, "deductions", dIdx, { label: e.target.value })} placeholder="e.g. Tax" />
                                            <Input className="w-32" type="number" value={d.amount} onChange={(e) => setAdj(idx, "deductions", dIdx, { amount: e.target.value })} placeholder="0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button variant="outline" size="sm" onClick={addLine}>
                            <Plus className="mr-1 h-4 w-4" /> Add staff line
                        </Button>
                        <div className="flex items-center gap-4">
                            <span className="text-sm">
                                <span className="text-muted-foreground">Run total </span>
                                <span className="font-semibold">{money(draftTotal)}</span>
                            </span>
                            <Button onClick={run} disabled={running || lines.length === 0}>
                                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                Run Payroll
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {(!payrollRuns || payrollRuns.length === 0) && (
                    <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
                )}
                {payrollRuns.map((r) => (
                    <Card key={r._id}>
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold">
                                        {r.runNumber}
                                        {r.periodLabel ? <span className="ml-2 text-xs font-normal text-muted-foreground">{r.periodLabel}</span> : null}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {r.periodStart && r.periodEnd && (
                                            <>{format(new Date(r.periodStart), "PP")} – {format(new Date(r.periodEnd), "PP")} · </>
                                        )}
                                        {r.lines?.length ?? 0} staff
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right text-sm">
                                        <p className="font-semibold">{money(r.totalGross)}</p>
                                        <p className="text-xs text-muted-foreground">posted to ledger</p>
                                    </div>
                                    <button onClick={() => remove(r._id)} disabled={busyId === r._id} className="text-muted-foreground hover:text-red-600">
                                        {busyId === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            {r.lines && r.lines.length > 0 && (
                                <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                                    {r.lines.map((ln, i) => (
                                        <div key={i} className="flex justify-between py-0.5">
                                            <span>{ln.staffName || "Staff"}</span>
                                            <span>
                                                base {money(ln.basePay)} +{money(sumAdjustments(ln.allowances))} −{money(sumAdjustments(ln.deductions))} = <span className="font-medium text-foreground">{money(ln.gross)}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
