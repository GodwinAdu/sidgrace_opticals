"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface VisitOption {
    _id: string;
    date?: string;
    appointmentType?: string;
    status?: string;
}

/**
 * Optional "link this record to a visit" picker. `value` "" means unlinked.
 * Reused by ClinicalNotes, PerioChart and Imaging so records can be grouped
 * by encounter on the patient timeline.
 */
export function VisitPicker({
    appointments,
    value,
    onChange,
    label = "Link to visit (optional)",
}: {
    appointments: VisitOption[];
    value: string;
    onChange: (v: string) => void;
    label?: string;
}) {
    return (
        <div>
            <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
            <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
                <SelectTrigger>
                    <SelectValue placeholder="No visit linked" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No visit linked</SelectItem>
                    {appointments.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                            {a.date ? new Date(a.date).toLocaleDateString() : "Visit"}
                            {a.appointmentType ? ` — ${a.appointmentType}` : ""}
                            {a.status ? ` (${a.status})` : ""}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
