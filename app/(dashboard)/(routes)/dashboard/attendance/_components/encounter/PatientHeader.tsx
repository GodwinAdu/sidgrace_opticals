"use client";

/**
 * PatientHeader — the sticky identity + context strip at the top of the
 * encounter workspace (Req 3.1, 3.3, 3.4).
 *
 * Reproduces the legacy `ConsultingPage.tsx` header behavior 1:1, now driven by
 * the `EncounterProvider` state instead of local component state:
 *   - identity: avatar, name, patient ID, gender, age (from DOB), phone, blood
 *     type, visit date, and a status badge (Req 3.1);
 *   - admission context: when an active admission is present, the inpatient
 *     ward/bed + admitted day-count; otherwise the outpatient Admit action via
 *     the existing `AdmitButton` (Req 3.3);
 *   - billing summary: previous outstanding (via `getPatientOutstanding`),
 *     current bill, and total balance due — the roll-up math is the pure
 *     `rollUpBilling` from `lib/clinical/encounter.ts` (Req 3.4).
 *
 * It is `sticky top-0` so the identity/billing context stays visible as the
 * clinician scrolls through tabs (Req 3.1). A "Historical View" badge surfaces
 * when the workspace is in read-only historical mode.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stethoscope, Users, Clock, BedDouble } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateAge } from "@/lib/utils";
import { getPatientOutstanding } from "@/lib/actions/invoice.actions";
import { rollUpBilling } from "@/lib/clinical/encounter";
import { AdmitButton } from "../AdmitButton";
import { useEncounter } from "./EncounterProvider";
import type { AdmissionContext } from "./types";

export interface PatientHeaderProps {
    /** Active inpatient admission for this visit, when one exists. */
    admission?: AdmissionContext | null;
}

/** Status → badge color classes, matching the legacy header styling. */
function statusBadgeClass(status: string): string {
    switch (status) {
        case "completed":
            return "bg-green-500/90 text-white";
        case "ongoing":
            return "bg-blue-500/90 text-white";
        case "waiting":
        case "pending":
            return "bg-amber-400/90 text-amber-950";
        case "cancelled":
            return "bg-red-500/90 text-white";
        default:
            return "bg-white/20 text-white";
    }
}

/** Whole-day inpatient day-count, matching the legacy `Day N` display. */
function admittedDayCount(admittedAt: string): number {
    return Math.max(
        1,
        Math.ceil((Date.now() - new Date(admittedAt).getTime()) / (1000 * 60 * 60 * 24)),
    );
}

export default function PatientHeader({ admission = null }: PatientHeaderProps) {
    const { state, mode } = useEncounter();
    const attendance = state.attendance;
    const isHistorical = mode === "historical";

    const patient = attendance.patientId || {};
    const patientMongoId = patient._id ? String(patient._id) : "";
    const currentInvoiceId = attendance.billing?.invoiceId
        ? String(attendance.billing.invoiceId)
        : undefined;

    // Current-visit balance from the pure billing roll-up (Req 3.4).
    const current = rollUpBilling(attendance.billing);
    const currentBalance = current.balance;

    // Previous outstanding (prior unpaid invoices, excluding this visit's own
    // invoice). Fetched client-side like the legacy header did.
    const [prevOutstanding, setPrevOutstanding] = useState(0);
    useEffect(() => {
        let active = true;
        if (!patientMongoId) {
            setPrevOutstanding(0);
            return;
        }
        getPatientOutstanding(patientMongoId, currentInvoiceId)
            .then((res) => {
                if (active) setPrevOutstanding(Number(res?.total) || 0);
            })
            .catch(() => {
                if (active) setPrevOutstanding(0);
            });
        return () => {
            active = false;
        };
    }, [patientMongoId, currentInvoiceId, currentBalance]);

    const balanceDue = prevOutstanding + currentBalance;
    const wardName =
        typeof admission?.wardId === "object" && admission?.wardId ? admission.wardId.name : "";
    const bedLabel =
        typeof admission?.bedId === "object" && admission?.bedId ? admission.bedId.label : "";

    return (
        <Card className="static lg:sticky lg:top-0 z-30 overflow-hidden border-0 shadow-sm dark:bg-gray-800">
            {/* Identity banner */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-4 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-white/70 shadow">
                            <AvatarImage src="/placeholder.svg?height=56&width=56" alt="" />
                            <AvatarFallback className="bg-white/20 text-lg font-semibold text-white">
                                {patient.fullName?.charAt(0) || "P"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-bold leading-tight">
                                {patient.fullName || "Patient"}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90">
                                <span className="inline-flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" aria-hidden="true" /> ID:{" "}
                                    {patient.patientId || "—"}
                                </span>
                                {patient.gender && (
                                    <span className="capitalize">• {String(patient.gender)}</span>
                                )}
                                {patient.dob && <span>• {calculateAge(patient.dob)} yrs</span>}
                                {patient.phone && <span>• {String(patient.phone)}</span>}
                                {patient.bloodType && (
                                    <span>• 🩸 {String(patient.bloodType)}</span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                                    {attendance.date
                                        ? new Date(attendance.date).toLocaleDateString()
                                        : "N/A"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            className={`border-0 capitalize ${statusBadgeClass(attendance.status)}`}
                        >
                            {attendance.status}
                        </Badge>
                        {isHistorical && (
                            <Badge className="border-0 bg-orange-400/90 text-orange-950">
                                📜 Historical
                            </Badge>
                        )}
                        {patient._id && (
                            <Link
                                href={`/dashboard/clinical/${patient._id}`}
                                className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                                <Stethoscope className="h-4 w-4" aria-hidden="true" />{" "}
                                <span className="hidden sm:inline">Dental Records</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Admission context + billing summary */}
            <CardContent className="grid gap-5 pt-5 lg:grid-cols-2">
                {/* Inpatient admission context — banner when admitted, Admit button otherwise */}
                {admission ? (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                        <div className="flex items-center gap-2 text-sm">
                            <BedDouble className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                            <span className="font-semibold text-indigo-800 dark:text-indigo-300">
                                Inpatient
                            </span>
                            <span className="text-indigo-700 dark:text-indigo-400">
                                {wardName}
                                {bedLabel ? ` · Bed ${bedLabel}` : ""}
                            </span>
                        </div>
                        {admission.admittedAt && (
                            <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                                Admitted{" "}
                                {new Date(admission.admittedAt).toLocaleDateString()} · Day{" "}
                                {admittedDayCount(admission.admittedAt)}
                            </p>
                        )}
                    </div>
                ) : (
                    !isHistorical &&
                    patient._id &&
                    attendance._id && (
                        <div className="flex items-center justify-between rounded-xl border border-dashed p-4 dark:border-gray-700">
                            <div className="text-sm">
                                <span className="font-medium">Outpatient visit</span>
                                <p className="text-xs text-muted-foreground">
                                    Admit to a ward if this patient needs to stay.
                                </p>
                            </div>
                            <AdmitButton
                                patientId={String(patient._id)}
                                attendanceId={String(attendance._id)}
                            />
                        </div>
                    )
                )}

                {/* Billing summary */}
                <div className="rounded-xl border bg-muted/30 p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Previous Bill</span>
                        <span
                            className={`text-sm font-semibold ${prevOutstanding > 0 ? "text-amber-600" : ""}`}
                        >
                            {formatMoney(prevOutstanding)}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Bill</span>
                        <span className="text-sm font-semibold">{formatMoney(currentBalance)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-3 dark:border-gray-700">
                        <span className="text-sm font-bold uppercase tracking-wide">Balance Due</span>
                        <span
                            className={`text-xl font-extrabold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                            {formatMoney(balanceDue)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
