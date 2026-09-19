"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, User2, CalendarDays, ReceiptText, Stethoscope, FlaskConical } from "lucide-react";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";

interface PatientLite { _id: string; fullName?: string; patientId?: string; }

const QUICK_LINKS = [
    { label: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
    { label: "Invoices", href: "/dashboard/billing/invoices", icon: ReceiptText },
    { label: "Clinical Records", href: "/dashboard/clinical", icon: Stethoscope },
    { label: "Lab Cases", href: "/dashboard/lab-cases", icon: FlaskConical },
];

export function GlobalSearch() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");
    const [patients, setPatients] = useState<PatientLite[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (!term || term.length < 2) {
            setPatients([]);
            return;
        }
        const t = setTimeout(() => {
            startTransition(async () => {
                try {
                    setPatients((await fetchPatientBySearch(term)) || []);
                } catch {
                    setPatients([]);
                }
            });
        }, 300);
        return () => clearTimeout(t);
    }, [term]);

    const go = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    return (
        <>
            <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
            </Button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Search patients or jump to a section..." value={term} onValueChange={setTerm} />
                <CommandList>
                    <CommandEmpty>{isPending ? "Searching..." : "No results found."}</CommandEmpty>

                    {patients.length > 0 && (
                        <CommandGroup heading="Patients">
                            {patients.map((p) => (
                                <CommandItem key={p._id} value={`patient-${p._id}`} onSelect={() => go(`/dashboard/portal/${p._id}`)}>
                                    <User2 className="mr-2 h-4 w-4" />
                                    {p.fullName} {p.patientId ? <span className="ml-2 text-xs text-muted-foreground">{p.patientId}</span> : null}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandGroup heading="Quick Links">
                        {QUICK_LINKS.map((l) => (
                            <CommandItem key={l.href} value={l.label} onSelect={() => go(l.href)}>
                                <l.icon className="mr-2 h-4 w-4" />
                                {l.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
