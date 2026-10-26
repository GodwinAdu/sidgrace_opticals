/**
 * Epson ePOS-Print (networked thermal receipt printer) helpers.
 *
 * Driverless, one-click receipt printing: a networked Epson TM printer serves an
 * "ePOS-Print" web service at its own IP. We build the SOAP/ePOS XML document for
 * a receipt (and an optional cash-drawer kick) and POST it straight to the
 * printer from the browser — no OS driver, no print dialog, no local agent.
 *
 * This module is pure/dependency-free so the XML builder is unit-testable; the
 * single network call (`sendToEposPrinter`) is isolated and defensive.
 */

/** A single receipt line item (already formatted as display strings). */
export interface EposLine {
    /** Item description. */
    name: string;
    /** Right-aligned amount string (already currency-formatted). */
    amount: string;
    /** Optional "qty x unit" sub-line. */
    detail?: string;
}

/** Everything the receipt needs — all pre-formatted strings, no money math here. */
export interface EposReceiptData {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    title?: string; // e.g. "RECEIPT"
    invoiceNumber: string;
    dateText: string;
    patientName: string;
    patientId?: string;
    lines: EposLine[];
    totals: { label: string; value: string; bold?: boolean }[];
    footer?: string;
    /** Kick the cash drawer after printing. */
    openDrawer?: boolean;
    /** Receipt width in characters (42 for 80mm Font A, 32 for 58mm). */
    width?: number;
}

/** XML-escape a value for safe inclusion in the ePOS document. */
export function escapeXml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** Left/right justify a label + value onto a fixed-width line (truncates label). */
export function justify(label: string, value: string, width: number): string {
    const w = Math.max(16, width);
    const v = value.length > w ? value.slice(0, w) : value;
    const room = w - v.length - 1;
    let l = label;
    if (l.length > room) l = l.slice(0, Math.max(0, room));
    const gap = Math.max(1, w - l.length - v.length);
    return l + " ".repeat(gap) + v;
}

/** Center a string within the receipt width. */
export function center(text: string, width: number): string {
    const w = Math.max(16, width);
    if (text.length >= w) return text.slice(0, w);
    const pad = Math.floor((w - text.length) / 2);
    return " ".repeat(pad) + text;
}

const DASH = (w: number) => "-".repeat(Math.max(16, w));

/**
 * Build the ePOS-Print SOAP XML for a receipt. Produces the exact document the
 * printer's ePOS-Print service accepts: centered header, item lines, totals,
 * footer, a paper feed + cut, and an optional drawer pulse.
 */
export function buildEposReceiptXml(data: EposReceiptData): string {
    const width = data.width && data.width >= 24 ? data.width : 42;
    const t = (s: string, opts?: { align?: "left" | "center" | "right"; em?: boolean; dw?: boolean; dh?: boolean }) => {
        const align = opts?.align ?? "left";
        const em = opts?.em ? ' em="true"' : "";
        const dw = opts?.dw ? ' dw="true"' : "";
        const dh = opts?.dh ? ' dh="true"' : "";
        // Each <text> ends with a newline via &#10;
        return `<text align="${align}"${em}${dw}${dh}>${escapeXml(s)}&#10;</text>`;
    };

    const parts: string[] = [];
    // Header
    parts.push(`<text align="center" dw="true" dh="true">${escapeXml(data.clinicName)}&#10;</text>`);
    if (data.clinicAddress) parts.push(t(data.clinicAddress, { align: "center" }));
    if (data.clinicPhone) parts.push(t(`Tel: ${data.clinicPhone}`, { align: "center" }));
    parts.push(t(data.title || "RECEIPT", { align: "center", em: true }));
    parts.push(t(DASH(width)));

    // Meta
    parts.push(t(justify("No:", data.invoiceNumber, width)));
    parts.push(t(justify("Date:", data.dateText, width)));
    parts.push(t(justify("Patient:", data.patientName, width)));
    if (data.patientId) parts.push(t(justify("ID:", data.patientId, width)));
    parts.push(t(DASH(width)));

    // Items
    for (const line of data.lines) {
        parts.push(t(line.name));
        parts.push(t(justify(line.detail || "", line.amount, width)));
    }
    parts.push(t(DASH(width)));

    // Totals
    for (const row of data.totals) {
        parts.push(
            row.bold
                ? `<text em="true">${escapeXml(justify(row.label, row.value, width))}&#10;</text>`
                : t(justify(row.label, row.value, width)),
        );
    }
    parts.push(t(DASH(width)));

    if (data.footer) parts.push(t(data.footer, { align: "center" }));
    parts.push(`<feed line="3"/>`);
    parts.push(`<cut type="feed"/>`);
    if (data.openDrawer) parts.push(`<pulse drawer="drawer_1" time="pulse_100"/>`);

    const body = parts.join("");

    return (
        `<?xml version="1.0" encoding="utf-8"?>` +
        `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<s:Body>` +
        `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
        body +
        `</epos-print>` +
        `</s:Body>` +
        `</s:Envelope>`
    );
}

/** Normalise a printer base URL into the ePOS-Print service endpoint. */
export function eposEndpoint(printerUrl: string, deviceId: string): string {
    const base = String(printerUrl || "").trim().replace(/\/+$/, "");
    const dev = encodeURIComponent(deviceId || "local_printer");
    // If the caller already gave a full service.cgi URL, keep it; else build it.
    if (/\/cgi-bin\/epos\/service\.cgi/i.test(base)) return base;
    return `${base}/cgi-bin/epos/service.cgi?devid=${dev}&timeout=10000`;
}

export interface EposSendResult {
    ok: boolean;
    /** ePOS success flag parsed from the response, when available. */
    printerSuccess?: boolean;
    code?: string;
    error?: string;
}

/**
 * POST the ePOS XML to the printer. Resolves with a structured result instead of
 * throwing, so the caller can fall back to browser print on any failure
 * (unreachable printer, CORS, mixed-content, etc.). The printer replies with a
 * small SOAP document carrying `success="true|false"` and a `code`.
 */
export async function sendToEposPrinter(
    endpoint: string,
    xml: string,
    timeoutMs = 12000,
): Promise<EposSendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: '""',
            },
            body: xml,
            signal: controller.signal,
        });
        const text = await res.text().catch(() => "");
        if (!res.ok) {
            return { ok: false, error: `Printer responded ${res.status}`, code: String(res.status) };
        }
        const success = /success="true"/i.test(text);
        const codeMatch = text.match(/code="([^"]*)"/i);
        return {
            ok: success,
            printerSuccess: success,
            code: codeMatch ? codeMatch[1] : undefined,
            error: success ? undefined : "Printer reported a print error",
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Could not reach the printer",
        };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Build a tiny ePOS test slip for the Settings "Test printer" button — a couple
 * of centered lines, a timestamp, a feed and a cut (no drawer). Lets staff
 * confirm the IP / device id without creating a real invoice.
 */
export function buildEposTestXml(clinicName: string): string {
    const esc = escapeXml;
    return (
        `<?xml version="1.0" encoding="utf-8"?>` +
        `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<s:Body>` +
        `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
        `<text align="center" dw="true" dh="true">${esc(clinicName || "Clinic")}&#10;</text>` +
        `<text align="center" em="true">PRINTER TEST&#10;</text>` +
        `<text align="center">Connection OK&#10;</text>` +
        `<text align="center">${esc(new Date().toLocaleString())}&#10;</text>` +
        `<feed line="3"/>` +
        `<cut type="feed"/>` +
        `</epos-print>` +
        `</s:Body>` +
        `</s:Envelope>`
    );
}
