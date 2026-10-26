"use client";

/**
 * Thin wrapper around the read-only `VisitAuditLog` body (R4, R5).
 *
 * Adapts the uniform `EncounterTabProps` to the audit-log component, which owns
 * its own gated read (`getVisitAuditLog`, `withAuth(..., "auditView")`). This
 * tab is registered with an `auditView` gate in the registry, so it only
 * appears for authorised users (R5.1); the inline attribution shown on the
 * other clinical tabs stays visible regardless (R5.3). Nothing here is editable
 * (R4.3).
 */
import VisitAuditLog from "../VisitAuditLog";
import type { EncounterTabProps } from "./types";

export default function VisitAuditLogTabModule({ attendanceId }: EncounterTabProps) {
    return <VisitAuditLog attendanceId={attendanceId} />;
}
