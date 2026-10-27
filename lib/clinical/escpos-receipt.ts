/**
 * ESC/POS thermal receipt printing over a raw network socket (port 9100).
 *
 * This is the driverless path for the clinic's Xprinter XP-E200L (and any
 * ESC/POS 80mm printer) reached at its own LAN IP. It does NOT use the Windows
 * Print Spooler, a printer driver, or a browser print dialog — the server opens
 * a TCP socket to `printerIp:9100` and writes raw ESC/POS bytes.
 *
 * Split into:
 *   - `buildReceiptBytes(data)`  — PURE byte builder (unit-testable, no I/O).
 *   - `sendToPrinter(...)`       — the single network side effect (server only).
 *
 * The byte sequence mirrors the exact commands verified working on the physical
 * XP-E200L: ESC @ init, ESC t 0 code page, centered double-size header,
 * left-aligned body, feed + GS V B 0 full cut.
 */

export interface EscPosLine {
    /** Item description (left). */
    name: string;
    /** Right-aligned amount string (already currency-formatted). */
    amount: string;
    /** Optional "qty x unit" detail line under the name. */
    detail?: string;
}

export interface EscPosReceiptData {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    title?: string;            // e.g. "RECEIPT"
    docNumber?: string;        // invoice / sale number
    dateText?: string;
    customerName?: string;
    customerId?: string;
    cashierName?: string;
    lines: EscPosLine[];
    totals: { label: string; value: string; bold?: boolean }[];
    footer?: string;
    /** Receipt character width: 48 for 80mm Font A, 42 for 80mm larger, 32 for 58mm. XP-E200L 80mm = 48. */
    width?: number;
    /** Kick a cash drawer after printing (ESC p). */
    openDrawer?: boolean;
}

// --- ESC/POS command constants ---
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Left/right justify a label and value onto a fixed-width line. */
export function justify(label: string, value: string, width: number): string {
    const w = Math.max(16, width);
    const v = value.length > w ? value.slice(0, w) : value;
    let l = label;
    const room = w - v.length - 1;
    if (l.length > room) l = l.slice(0, Math.max(0, room));
    const gap = Math.max(1, w - l.length - v.length);
    return l + " ".repeat(gap) + v;
}

/** Repeat a dash rule across the width. */
export function rule(width: number): string {
    return "-".repeat(Math.max(16, width));
}

/**
 * Build the raw ESC/POS byte array for a receipt. Pure: no network, no Date.now
 * side effects beyond what the caller passes in. ASCII/Latin-1 text only
 * (code page 437), which is what the XP-E200L prints by default.
 */
export function buildReceiptBytes(data: EscPosReceiptData): Uint8Array {
    const width = data.width && data.width >= 24 ? data.width : 48;
    const out: number[] = [];

    const text = (s: string) => {
        for (const ch of s) {
            const code = ch.charCodeAt(0);
            // Keep printable ASCII; replace anything outside with '?' to avoid
            // garbage on a code-page-437 printer.
            out.push(code >= 0x20 && code <= 0x7e ? code : 0x3f);
        }
    };
    const line = (s = "") => { text(s); out.push(LF); };

    // Initialize + select code page PC437
    out.push(ESC, 0x40);          // ESC @
    out.push(ESC, 0x74, 0x00);    // ESC t 0

    // Header (centered, double size)
    out.push(ESC, 0x61, 0x01);    // ESC a 1  center
    out.push(ESC, 0x21, 0x30);    // ESC ! 48  double width + height
    line(data.clinicName);
    out.push(ESC, 0x21, 0x00);    // ESC ! 0  normal
    if (data.clinicAddress) line(data.clinicAddress);
    if (data.clinicPhone) line(`Tel: ${data.clinicPhone}`);
    if (data.title) {
        out.push(ESC, 0x45, 0x01); // ESC E 1  bold on
        line(data.title);
        out.push(ESC, 0x45, 0x00); // bold off
    }

    // Body (left aligned)
    out.push(ESC, 0x61, 0x00);    // ESC a 0  left
    line(rule(width));

    if (data.docNumber) line(justify("No:", data.docNumber, width));
    if (data.dateText) line(justify("Date:", data.dateText, width));
    if (data.customerName) line(justify("Customer:", data.customerName, width));
    if (data.customerId) line(justify("ID:", data.customerId, width));
    if (data.cashierName) line(justify("Cashier:", data.cashierName, width));
    line(rule(width));

    // Items
    for (const it of data.lines) {
        line(it.name);
        line(justify(it.detail ?? "", it.amount, width));
    }
    line(rule(width));

    // Totals
    for (const row of data.totals) {
        if (row.bold) out.push(ESC, 0x45, 0x01);
        line(justify(row.label, row.value, width));
        if (row.bold) out.push(ESC, 0x45, 0x00);
    }
    line(rule(width));

    // Footer (centered)
    if (data.footer) {
        out.push(ESC, 0x61, 0x01);
        line(data.footer);
        out.push(ESC, 0x61, 0x00);
    }

    // Feed + full cut
    out.push(LF, LF, LF);
    out.push(GS, 0x56, 0x42, 0x00); // GS V B 0  feed and full cut

    // Optional cash drawer kick
    if (data.openDrawer) out.push(ESC, 0x70, 0x00, 0x19, 0xfa); // ESC p 0

    return Uint8Array.from(out);
}

export interface PrintResult {
    ok: boolean;
    bytes?: number;
    error?: string;
}

/**
 * Send raw bytes to a network printer at host:port (9100). Server-side only
 * (uses Node's `net`). Resolves with a structured result instead of throwing,
 * so callers can surface a friendly message and never crash the request.
 */
export async function sendToPrinter(
    host: string,
    port: number,
    bytes: Uint8Array,
    timeoutMs = 8000,
): Promise<PrintResult> {
    // Lazy import keeps this module importable in non-node contexts (tests of
    // the pure builder don't need `net`).
    const net = await import("node:net");
    return new Promise<PrintResult>((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const done = (r: PrintResult) => {
            if (settled) return;
            settled = true;
            try { socket.destroy(); } catch { /* ignore */ }
            resolve(r);
        };

        socket.setTimeout(timeoutMs);
        socket.once("timeout", () => done({ ok: false, error: "Printer connection timed out" }));
        socket.once("error", (e: Error) => done({ ok: false, error: e.message }));
        socket.connect(port, host, () => {
            socket.write(Buffer.from(bytes), (err) => {
                if (err) return done({ ok: false, error: err.message });
                // Give the printer a moment to accept the buffer before closing.
                setTimeout(() => done({ ok: true, bytes: bytes.length }), 300);
            });
        });
    });
}
