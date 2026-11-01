/**
 * Browser-side receipt printing to the clinic's Xprinter (ESC/POS, 192.168.1.158:9100).
 *
 * Order of attempts:
 *  1. Print relay on the clinic host PC (NEXT_PUBLIC_PRINT_RELAY_URL, e.g.
 *     https://192.168.1.214:5443). This is what makes printing work from the ONLINE
 *     app: the browser is inside the clinic network even though the server is in the
 *     cloud. See sidgrace-backend/README.md "Print relay".
 *  2. The app's own /api/print-receipt route. Works when the app itself runs on the
 *     clinic PC (local version); on Vercel it cannot reach the printer.
 *  3. Nothing reached the printer: the caller falls back to the browser print dialog.
 */
import type { EscPosReceiptData } from "@/lib/clinical/escpos-receipt";

export interface DirectPrintResult {
    ok: boolean;
    /** Which path printed it, for the success message. */
    via?: "relay" | "server";
    /** Why direct printing failed (shown under the "using browser print" toast). */
    error?: string;
}

const RELAY_URL = (process.env.NEXT_PUBLIC_PRINT_RELAY_URL || "").replace(/\/+$/, "");

async function post(url: string, payload: EscPosReceiptData, timeoutMs: number) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
        // Chrome: allow an https page to reach a private-network address (the relay
        // answers the matching preflight). Ignored by browsers that don't support it.
        ...({ targetAddressSpace: "private" } as Record<string, unknown>),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    return { ok: res.ok && !!body?.ok, error: body?.error || (res.ok ? undefined : `HTTP ${res.status}`) };
}

function describe(err: unknown): string {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) return "timed out";
    // A TypeError here is the browser refusing the connection: relay off, certificate
    // not trusted on this PC, or local-network access not allowed.
    if (err instanceof TypeError) return "not reachable from this computer";
    return err instanceof Error ? err.message : String(err);
}

export async function printReceiptDirect(payload: EscPosReceiptData): Promise<DirectPrintResult> {
    const errors: string[] = [];

    if (RELAY_URL) {
        try {
            const r = await post(`${RELAY_URL}/print`, payload, 10000);
            if (r.ok) return { ok: true, via: "relay" };
            errors.push(`Print relay: ${r.error}`);
            // The relay answered but the printer itself failed: the server route would
            // hit the same printer, so don't wait for it.
            if (r.error && !/origin/i.test(r.error)) return { ok: false, error: errors.join(" · ") };
        } catch (err) {
            errors.push(`Print relay ${describe(err)}`);
        }
    }

    try {
        const r = await post("/api/print-receipt", payload, 12000);
        if (r.ok) return { ok: true, via: "server" };
        errors.push(`Server: ${r.error}`);
    } catch (err) {
        errors.push(`Server ${describe(err)}`);
    }

    return { ok: false, error: errors.join(" · ") };
}
