"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Search, User2, ArrowRight } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PatientLite {
    _id: string;
    fullName?: string;
    patientId?: string;
    phone?: string;
    gender?: string;
}

/**
 * Reusable patient picker. On select, navigates to `${basePath}/{patientId}`.
 */
export function PatientSearch({ basePath, cta = "Open" }: { basePath: string; cta?: string }) {
    const router = useRouter();
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<PatientLite[]>([]);
    const [searched, setSearched] = useState(false);
    const [isPending, startTransition] = useTransition();

    const runSearch = () => {
        startTransition(async () => {
            try {
                const data = await fetchPatientBySearch(term);
                setResults(data || []);
                setSearched(true);
            } catch {
                setResults([]);
                setSearched(true);
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder="Search patient by name, ID or phone..."
                    className="max-w-md"
                />
                <Button onClick={runSearch} disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                </Button>
            </div>

            {searched && results.length === 0 && !isPending && (
                <p className="text-sm text-muted-foreground">No patients found. Try a different search.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                    <Card
                        key={p._id}
                        className={cn("flex items-center justify-between gap-3 p-4 transition-colors hover:border-teal-300")}
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                                <User2 className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold">{p.fullName || "Unnamed"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {p.patientId || p._id.slice(-6)}
                                    {p.phone ? ` • ${p.phone}` : ""}
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => router.push(`${basePath}/${p._id}`)}>
                            {cta}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}
