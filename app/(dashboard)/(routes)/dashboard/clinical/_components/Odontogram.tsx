"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { saveChart } from "@/lib/actions/dental-chart.actions";
import { Loader2, Save } from "lucide-react";

// Universal numbering: 1-16 upper (right->left), 17-32 lower (left->right)
const UPPER_TEETH = Array.from({ length: 16 }, (_, i) => i + 1);
const LOWER_TEETH = Array.from({ length: 16 }, (_, i) => i + 17);

type Condition =
    | "healthy"
    | "caries"
    | "filling"
    | "crown"
    | "root-canal"
    | "extraction"
    | "missing"
    | "implant"
    | "bridge"
    | "sealant";

const CONDITIONS: { value: Condition; label: string; color: string }[] = [
    { value: "healthy", label: "Healthy", color: "bg-white border-slate-300 text-slate-700" },
    { value: "caries", label: "Caries", color: "bg-red-500 text-white border-red-600" },
    { value: "filling", label: "Filling", color: "bg-blue-500 text-white border-blue-600" },
    { value: "crown", label: "Crown", color: "bg-amber-400 text-amber-950 border-amber-500" },
    { value: "root-canal", label: "Root Canal", color: "bg-purple-500 text-white border-purple-600" },
    { value: "extraction", label: "Extraction", color: "bg-orange-500 text-white border-orange-600" },
    { value: "missing", label: "Missing", color: "bg-slate-300 text-slate-500 border-slate-400 line-through" },
    { value: "implant", label: "Implant", color: "bg-teal-500 text-white border-teal-600" },
    { value: "bridge", label: "Bridge", color: "bg-indigo-500 text-white border-indigo-600" },
    { value: "sealant", label: "Sealant", color: "bg-green-500 text-white border-green-600" },
];

interface ToothCond {
    tooth: number;
    surface?: string;
    condition: string;
    note?: string;
}

interface OdontogramProps {
    patientId: string;
    initialConditions: ToothCond[];
    initialNotes?: string;
}

export function Odontogram({ patientId, initialConditions, initialNotes }: OdontogramProps) {
    const router = useRouter();
    const path = usePathname();
    const [saving, setSaving] = useState(false);
    const [activeCondition, setActiveCondition] = useState<Condition>("caries");
    const [notes, setNotes] = useState(initialNotes || "");

    // map tooth -> condition
    const [conditionMap, setConditionMap] = useState<Record<number, string>>(() => {
        const m: Record<number, string> = {};
        for (const c of initialConditions || []) m[c.tooth] = c.condition;
        return m;
    });

    const colorFor = useMemo(() => {
        const lookup: Record<string, string> = {};
        for (const c of CONDITIONS) lookup[c.value] = c.color;
        return lookup;
    }, []);

    const applyToTooth = (tooth: number) => {
        setConditionMap((prev) => {
            const next = { ...prev };
            if (next[tooth] === activeCondition) {
                delete next[tooth]; // toggle off -> healthy
            } else {
                next[tooth] = activeCondition;
            }
            return next;
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const conditions: ToothCond[] = Object.entries(conditionMap).map(([tooth, condition]) => ({
                tooth: Number(tooth),
                condition,
                surface: "whole",
            }));
            await saveChart(patientId, { conditions, generalNotes: notes, numberingSystem: "Universal" }, path);
            toast.success("Dental chart saved", { description: "Tooth conditions were recorded." });
            router.refresh();
        } catch (error) {
            console.log("error saving chart", error);
            toast.error("Something went wrong", { description: "Please try again later" });
        } finally {
            setSaving(false);
        }
    };

    const renderTooth = (tooth: number) => {
        const cond = conditionMap[tooth] || "healthy";
        const color = colorFor[cond] || colorFor.healthy;
        return (
            <button
                key={tooth}
                type="button"
                onClick={() => applyToTooth(tooth)}
                title={`Tooth ${tooth} — ${cond}`}
                className={cn(
                    "flex h-12 w-9 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-transform hover:scale-105",
                    color
                )}
            >
                <span className="text-[10px] opacity-70">{tooth}</span>
                <span className="text-[8px] leading-tight">{cond === "healthy" ? "" : cond.slice(0, 4)}</span>
            </button>
        );
    };

    return (
        <div className="space-y-6">
            {/* Condition palette */}
            <div className="rounded-xl border bg-card p-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                    Select a condition, then click teeth to mark them.
                </p>
                <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setActiveCondition(c.value)}
                            className={cn(
                                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                                activeCondition === c.value ? "ring-2 ring-teal-500 ring-offset-1" : "opacity-80 hover:opacity-100"
                            )}
                        >
                            <span className={cn("h-3 w-3 rounded-full border", c.color)} />
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Teeth grid */}
            <div className="rounded-xl border bg-card p-6">
                <div className="mb-2 text-center text-xs uppercase tracking-widest text-muted-foreground">Upper Arch</div>
                <div className="flex flex-wrap justify-center gap-1.5">
                    {UPPER_TEETH.map(renderTooth)}
                </div>
                <div className="my-5 border-t border-dashed" />
                <div className="flex flex-wrap justify-center gap-1.5">
                    {LOWER_TEETH.map(renderTooth)}
                </div>
                <div className="mt-2 text-center text-xs uppercase tracking-widest text-muted-foreground">Lower Arch</div>
            </div>

            {/* Notes + save */}
            <div className="rounded-xl border bg-card p-4">
                <label className="mb-2 block text-sm font-medium">General Notes</label>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Overall observations, oral hygiene, recommendations..."
                    rows={3}
                />
                <div className="mt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {saving ? "Saving..." : "Save Chart"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
