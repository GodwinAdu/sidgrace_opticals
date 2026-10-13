import { NextRequest, NextResponse } from "next/server";
import { recomputeActiveBedChargesCore } from "@/lib/actions/admission.actions";

/**
 * Scheduled job endpoint for the external scheduler (sidgrace-backend cron).
 * Recomputes accruing bed-day charges for all active admissions so inpatient
 * bills stay current without anyone opening them.
 *
 * Auth: a shared secret in the `x-cron-key` header, compared against
 * `CRON_SECRET`. Not a user session — this is machine-to-machine. If
 * CRON_SECRET is unset, the endpoint is disabled (returns 503) so it can never
 * run unauthenticated by accident.
 *
 * Schedule from sidgrace-backend, e.g. nightly:
 *   curl -fsS -X POST -H "x-cron-key: $CRON_SECRET" https://<host>/api/jobs/bed-charges
 */
export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "Job endpoint disabled (CRON_SECRET not set)" }, { status: 503 });
    }

    const provided = req.headers.get("x-cron-key");
    if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await recomputeActiveBedChargesCore();
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error("bed-charges job failed:", error);
        return NextResponse.json({ ok: false, error: "Job failed" }, { status: 500 });
    }
}
