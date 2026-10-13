"use client";

/**
 * ConsultingPageWrapper — thin cutover shim (Task 12).
 *
 * The legacy ~1,500-line `ConsultingPage.tsx` monolith and this wrapper's old
 * current/historical/save state have been replaced by the rebuilt
 * `EncounterWorkspace`, which owns all encounter state, historical mode,
 * section/billing patching, and the save/complete lifecycle internally via
 * `EncounterProvider`.
 *
 * The wrapper keeps the exact same public prop contract the route page passes
 * (`initialAttendance`, `previousVisits`, `role`, `admission`), so the route
 * (`[attendantId]/page.tsx`) is unchanged (Req 6.4). It simply forwards those
 * inputs to the workspace.
 */

import EncounterWorkspace from "./encounter/EncounterWorkspace";
import type { AttendanceData, PreviousVisit, AdmissionContext } from "./encounter/types";

interface ConsultingPageWrapperProps {
    initialAttendance: AttendanceData;
    previousVisits: PreviousVisit[];
    role?: IRole | null;
    admission?: AdmissionContext | null;
}

export default function ConsultingPageWrapper({
    initialAttendance,
    previousVisits,
    role,
    admission,
}: ConsultingPageWrapperProps) {
    return (
        <EncounterWorkspace
            initialAttendance={initialAttendance}
            previousVisits={previousVisits}
            role={role}
            admission={admission}
        />
    );
}
