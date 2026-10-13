"use client";

/**
 * PreviousVisitPicker — the compact previous-visits control (Req 5.1).
 *
 * Reproduces the legacy `ConsultingPage.tsx` previous-visit dropdown, now wired
 * to the `EncounterProvider`:
 *   - lists prior visits for the linked patient (provided by the wrapper, or
 *     fetched here via `getPreviousVisitsByPatientId` when not supplied),
 *   - supports local filtering by date (no server call),
 *   - loads a selected visit via `getAttendanceById` and hands it to the
 *     provider's `loadHistorical`, which enters read-only historical mode.
 *
 * Full historical-mode wiring (read-only propagation to tabs, Save/Complete
 * disabling, "Return to Current" button placement) is completed in Task 10;
 * here the picker builds the list/filter UI and performs the load dispatch.
 * It reads the current visit/patient from `useEncounter()`.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getPreviousVisitsByPatientId,
    getAttendanceById,
} from "@/lib/actions/attendance.actions";
import { useEncounter } from "./EncounterProvider";
import type { AttendanceData, PreviousVisit } from "./types";

export interface PreviousVisitPickerProps {
    /**
     * Prior visits supplied by the route/wrapper. When omitted, the picker
     * fetches them for the linked patient via `getPreviousVisitsByPatientId`.
     */
    previousVisits?: PreviousVisit[];
}

/** Status → dot color, matching the legacy dropdown item styling. */
function statusDotClass(status: string): string {
    switch (status) {
        case "completed":
            return "bg-green-500";
        case "ongoing":
            return "bg-blue-500";
        case "waiting":
        case "pending":
            return "bg-amber-400";
        case "cancelled":
            return "bg-red-500";
        default:
            return "bg-gray-400";
    }
}

export default function PreviousVisitPicker({
    previousVisits,
}: PreviousVisitPickerProps) {
    const { state, mode, loadHistorical, returnToCurrent } = useEncounter();
    const attendance = state.attendance;
    const isHistorical = mode === "historical";

    const patientMongoId = attendance.patientId?._id ? String(attendance.patientId._id) : "";
    const currentVisitId = attendance._id ? String(attendance._id) : "";

    // Visit list: use the wrapper-provided list if given, else self-fetch.
    const [visits, setVisits] = useState<PreviousVisit[]>(previousVisits ?? []);
    useEffect(() => {
        if (previousVisits) {
            setVisits(previousVisits);
            return;
        }
        let active = true;
        if (!patientMongoId) {
            setVisits([]);
            return;
        }
        getPreviousVisitsByPatientId(patientMongoId, currentVisitId || undefined)
            .then((list) => {
                if (active) setVisits(Array.isArray(list) ? (list as PreviousVisit[]) : []);
            })
            .catch(() => {
                if (active) setVisits([]);
            });
        return () => {
            active = false;
        };
    }, [previousVisits, patientMongoId, currentVisitId]);

    const [visitDateFilter, setVisitDateFilter] = useState("");
    const [loadingVisitId, setLoadingVisitId] = useState<string | null>(null);
    // The visit currently loaded into the workspace (a prior one in historical mode).
    const [activeVisitId, setActiveVisitId] = useState<string>("");

    // Local date filter — no server call, matching the monolith.
    const filteredVisits = visits.filter((v) => {
        if (!visitDateFilter) return true;
        try {
            return new Date(v.date).toISOString().slice(0, 10) === visitDateFilter;
        } catch {
            return true;
        }
    });

    const loadVisit = async (id: string) => {
        if (!id || loadingVisitId === id) return;
        setLoadingVisitId(id);
        setActiveVisitId(id);
        try {
            const loaded = await getAttendanceById(id);
            if (loaded) {
                loadHistorical(loaded as AttendanceData);
            } else {
                toast.error("Could not load the selected visit");
                setActiveVisitId("");
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not load the selected visit");
            setActiveVisitId("");
        } finally {
            setLoadingVisitId(null);
        }
    };

    const onReturn = () => {
        returnToCurrent();
        setActiveVisitId("");
    };

    // Nothing to show when there are no previous visits (matches monolith).
    if (!visits || visits.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm dark:bg-gray-800">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Label
                        htmlFor="previous-visit-select"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                        Previous Visits
                    </Label>
                    <Badge variant="secondary">
                        {filteredVisits.length}
                        {visitDateFilter ? `/${visits.length}` : ""}
                    </Badge>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Select
                        value={activeVisitId && activeVisitId !== currentVisitId ? activeVisitId : ""}
                        onValueChange={loadVisit}
                    >
                        <SelectTrigger
                            id="previous-visit-select"
                            className="w-full sm:max-w-xs"
                            aria-label="Select a previous visit to view"
                        >
                            <SelectValue placeholder="Select a previous visit to view…" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredVisits.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No visits on this date
                                </div>
                            ) : (
                                filteredVisits.map((visit) => (
                                    <SelectItem key={visit._id} value={visit._id}>
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className={`inline-block h-2 w-2 rounded-full ${statusDotClass(visit.status)}`}
                                            />
                                            {new Date(visit.date).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                            <span className="capitalize text-muted-foreground">
                                                • {visit.visitType || "visit"}
                                            </span>
                                        </span>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {/* Filter by date */}
                    <div className="flex items-center gap-1">
                        <Input
                            type="date"
                            value={visitDateFilter}
                            onChange={(e) => setVisitDateFilter(e.target.value)}
                            className="h-9 w-[150px]"
                            aria-label="Filter previous visits by date"
                        />
                        {visitDateFilter && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                onClick={() => setVisitDateFilter("")}
                                aria-label="Clear date filter"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        )}
                    </div>
                    {loadingVisitId && (
                        <span className="text-xs text-teal-600" role="status">
                            Loading…
                        </span>
                    )}
                    {isHistorical && (
                        <Button size="sm" variant="outline" onClick={onReturn}>
                            ← Current Visit
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
