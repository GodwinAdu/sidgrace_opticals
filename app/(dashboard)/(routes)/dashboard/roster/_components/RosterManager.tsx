"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, CalendarClock } from "lucide-react";
import { createRoster, deleteRoster } from "@/lib/actions/roster.actions";

interface StaffLite { _id: string; fullName?: string; role?: string; }
interface Shift {
    _id: string;
    staffId?: { fullName?: string; role?: string } | string;
    date: string;
    shiftStart: string;
    shiftEnd: string;
    room?: string;
}

export function RosterManager({ staff, rosters }: { staff: StaffLite[]; rosters: Shift[] }) {
    const router = useRouter();
    const [staffId, setStaffId] = useState("");
    const [date, setDate] = useState("");
    const [shiftStart, setShiftStart] = useState("09:00");
    const [shiftEnd, setShiftEnd] = useState("17:00");
    const [room, setRoom] = useState("");
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const create = async () => {
        if (!staffId) return toast.error("Select a staff member");
        if (!date) return toast.error("Pick a date");
        try {
            setSaving(true);
            await createRoster({ staffId, date, shiftStart, shiftEnd, room });
            toast.success("Shift scheduled");
            setStaffId(""); setDate(""); setRoom("");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    const remove = async (id: string) => {
        try { setBusyId(id); await deleteRoster(id); toast.success("Shift removed"); router.refresh(); }
        catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    // group by date
    const grouped = rosters.reduce((acc: Record<string, Shift[]>, r) => {
        const key = new Date(r.date).toLocaleDateString();
        (acc[key] = acc[key] || []).push(r);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Schedule Shift</h3>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[200px]">
                            <label className="mb-1 block text-xs text-muted-foreground">Staff</label>
                            <Select value={staffId} onValueChange={setStaffId}>
                                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                                <SelectContent>
                                    {staff.map((s) => <SelectItem key={s._id} value={s._id}>{s.fullName} ({s.role})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                        <div className="w-28">
                            <label className="mb-1 block text-xs text-muted-foreground">Start</label>
                            <Input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
                        </div>
                        <div className="w-28">
                            <label className="mb-1 block text-xs text-muted-foreground">End</label>
                            <Input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
                        </div>
                        <div className="w-32">
                            <label className="mb-1 block text-xs text-muted-foreground">Room/Chair</label>
                            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Chair 2" />
                        </div>
                        <Button onClick={create} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Schedule
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground">No shifts scheduled.</p>}
                {Object.entries(grouped).map(([day, shifts]) => (
                    <Card key={day}>
                        <CardContent className="pt-5">
                            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-teal-600" />{day}</p>
                            <div className="space-y-2">
                                {shifts.map((s) => {
                                    const st = typeof s.staffId === "object" ? s.staffId : null;
                                    return (
                                        <div key={s._id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                            <span>{st?.fullName || "Staff"} <span className="text-muted-foreground">({st?.role})</span></span>
                                            <span className="flex items-center gap-3">
                                                <span>{s.shiftStart}–{s.shiftEnd}{s.room ? ` • ${s.room}` : ""}</span>
                                                <button onClick={() => remove(s._id)} disabled={busyId === s._id} className="text-red-500 hover:text-red-700">
                                                    {busyId === s._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </button>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
